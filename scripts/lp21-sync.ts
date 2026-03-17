/**
 * LP21 Sync Script — Lokaler Download aller LP21-Daten in Firestore
 *
 * Dieses Script crawlt die LP21 API (api.lehrplan.ch) für alle Fachbereiche
 * eines Kantons und schreibt die Ergebnisse direkt in Firestore.
 * Es läuft lokal ohne Timeout-Limit (im Gegensatz zu Vercel Serverless).
 *
 * Voraussetzungen:
 *   - .env.local mit Firebase Admin + LP21 API Credentials
 *   - npm install (firebase-admin muss installiert sein)
 *
 * Nutzung:
 *   npx tsx scripts/lp21-sync.ts                    # Alle Fachbereiche, Kanton Solothurn
 *   npx tsx scripts/lp21-sync.ts --kanton zh         # Anderer Kanton
 *   npx tsx scripts/lp21-sync.ts --fachbereich SPR   # Nur ein Fachbereich
 *   npx tsx scripts/lp21-sync.ts --list              # Nur Fachbereiche auflisten
 *   npx tsx scripts/lp21-sync.ts --json              # Auch als JSON-Backup speichern
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// .env.local MUSS zuerst geladen werden, bevor App-Module importiert werden.
// ESM hoisted alle statischen imports vor den Code, daher verwenden wir
// dynamische imports innerhalb von main().
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Type-only imports sind sicher (werden zur Laufzeit entfernt)
import type { LP21StrukturKompetenzbereich } from "../src/lib/firestore/system-cache";
import type { LP21Kanton } from "../src/lib/lp21/types";

// ============================================
// CLI Argument Parsing
// ============================================

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const KANTON = (getArg("kanton") || process.env.LP21_DEFAULT_KANTON || "so") as LP21Kanton;
const FACHBEREICH_FILTER = getArg("fachbereich");
const LIST_ONLY = hasFlag("list");
const SAVE_JSON = hasFlag("json");
const KOMPETENZAUFBAU_UID = "00000000000000000000000000000000";

// ============================================
// Helpers
// ============================================

function getBezeichnung(element: { bezeichnung?: string | string[] }): string {
  const bez = element.bezeichnung;
  if (typeof bez === "string") return bez;
  if (Array.isArray(bez) && bez.length > 0) return bez[0];
  return "";
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.round((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

// ============================================
// Main — dynamische Imports damit dotenv zuerst läuft
// ============================================

async function main() {
  // Dynamische Imports NACH dotenv.config()
  const { crawlFachbereich } = await import("../src/lib/lp21/crawler");
  const { getData, getDataBatch, extractUidFromUrl } = await import("../src/lib/lp21/client");
  const { mapCrawlResultToKompetenzen, mapToSystemKompetenzen } = await import("../src/lib/lp21/mapper");
  const {
    upsertSystemKompetenzen,
    getSystemKompetenzen,
    upsertLP21Struktur,
  } = await import("../src/lib/firestore/system-cache");

  console.log("═══════════════════════════════════════════");
  console.log("  LP21 Sync Script — Lokaler Download");
  console.log("═══════════════════════════════════════════");
  console.log(`  Kanton:     ${KANTON}`);
  console.log(`  Filter:     ${FACHBEREICH_FILTER || "(alle)"}`);
  console.log(`  JSON:       ${SAVE_JSON ? "Ja" : "Nein"}`);

  const totalStart = Date.now();

  // Schritt 1: Fachbereiche laden
  console.log(`\n📋 Lade Fachbereiche für Kanton "${KANTON}"...`);

  const kompetenzaufbau = await getData(KOMPETENZAUFBAU_UID, KANTON, "de");

  if (!kompetenzaufbau.hierarchie_unten?.length) {
    throw new Error("Kompetenzaufbau hat keine Fachbereiche");
  }

  const fachbereichUids = kompetenzaufbau.hierarchie_unten.map(extractUidFromUrl);
  const fachbereiche = await getDataBatch(fachbereichUids, KANTON, "de");

  const fbList = Array.from(fachbereiche.entries()).map(([uid, fb]) => ({
    uid,
    code: fb.code || "",
    bezeichnung: getBezeichnung(fb),
  }));

  fbList.sort((a, b) => a.code.localeCompare(b.code));

  console.log(`\n   Verfügbare Fachbereiche (${fbList.length}):`);
  for (const fb of fbList) {
    console.log(`   - ${fb.code.padEnd(6)} ${fb.bezeichnung}`);
  }

  if (LIST_ONLY) {
    console.log("\n✅ Fertig (nur Auflistung).");
    process.exit(0);
  }

  // Filter anwenden
  const toSync = FACHBEREICH_FILTER
    ? fbList.filter((fb) => fb.code === FACHBEREICH_FILTER)
    : fbList;

  if (toSync.length === 0) {
    console.error(`\n❌ Fachbereich "${FACHBEREICH_FILTER}" nicht gefunden.`);
    process.exit(1);
  }

  console.log(`\n🚀 Starte Sync für ${toSync.length} Fachbereich(e)...\n`);

  const results: {
    code: string;
    bezeichnung: string;
    kompetenzstufen: number;
    kompetenzbereiche: number;
    orientierungspunkte: number;
    duration: number;
  }[] = [];

  for (let i = 0; i < toSync.length; i++) {
    const fb = toSync[i];
    console.log(`\n[${i + 1}/${toSync.length}] ${fb.code} — ${fb.bezeichnung}`);
    console.log("─".repeat(50));

    try {
      console.log(`\n🔄 Sync: ${fb.code}...`);
      const startTime = Date.now();

      // LP21 API crawlen
      const crawlResult = await crawlFachbereich(fb.code, KANTON, "de", (progress) => {
        if (progress.phase === "kompetenzbereich" && progress.current > 0) {
          process.stdout.write(
            `\r   ${progress.phase}: ${progress.current}/${progress.total} - ${progress.message}`.padEnd(80)
          );
        }
      });
      process.stdout.write("\r" + " ".repeat(80) + "\r");

      console.log(`   ✅ Crawl: ${crawlResult.totalKompetenzstufen} Kompetenzstufen, ${crawlResult.kompetenzbereiche.length} Kompetenzbereiche in ${formatDuration(crawlResult.duration)}`);

      // Mapping
      const kompetenzen = mapCrawlResultToKompetenzen(crawlResult);

      // Bestehende Kompetenzen laden für ID-Mapping
      const existingKompetenzen = await getSystemKompetenzen();
      const lpCodeToAirtableId = new Map<string, string>();
      const existingUnterrichtsideen = new Map<string, string[]>();

      existingKompetenzen.forEach((k) => {
        if (k.lpCode) {
          lpCodeToAirtableId.set(k.lpCode, k.airtableId);
        }
        if (k.lpCode && k.unterrichtsideenIds?.length) {
          existingUnterrichtsideen.set(k.lpCode, k.unterrichtsideenIds);
        }
      });

      // Zu SystemKompetenz konvertieren
      const systemKompetenzen = mapToSystemKompetenzen(kompetenzen, lpCodeToAirtableId);

      // Bestehende Unterrichtsideen-Verknüpfungen beibehalten
      for (const sk of systemKompetenzen) {
        if (sk.lpCode && existingUnterrichtsideen.has(sk.lpCode)) {
          sk.unterrichtsideenIds = existingUnterrichtsideen.get(sk.lpCode)!;
        }
      }

      // In Firestore schreiben
      const count = await upsertSystemKompetenzen(systemKompetenzen);

      // Orientierungspunkte zählen
      const orientierungspunkte = kompetenzen.filter((k) => k.orientierungspunkt).length;

      // Struktur speichern
      const strukturKompetenzbereiche: LP21StrukturKompetenzbereich[] = crawlResult.kompetenzbereiche.map((kb) => ({
        uid: kb.uid,
        code: kb.code,
        bezeichnung: kb.bezeichnung,
        kompetenzen: kb.kompetenzen.map((k) => ({
          uid: k.uid,
          code: k.code,
          bezeichnung: k.bezeichnung,
          kompetenzstufen: k.kompetenzstufen.length,
        })),
      }));

      await upsertLP21Struktur({
        fachbereichCode: crawlResult.fachbereich.code,
        fachbereichName: crawlResult.fachbereich.bezeichnung,
        kanton: KANTON,
        kompetenzbereiche: strukturKompetenzbereiche,
        lastSyncedAt: new Date(),
      });

      const duration = Date.now() - startTime;

      console.log(`   📊 Firestore: ${count} Kompetenzstufen geschrieben, ${orientierungspunkte} OP, Struktur gespeichert`);

      // Optional: JSON-Backup
      if (SAVE_JSON) {
        const jsonDir = path.resolve(process.cwd(), "data/lp21");
        fs.mkdirSync(jsonDir, { recursive: true });

        const jsonFile = path.join(jsonDir, `${KANTON}-${fb.code}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify({
          fachbereich: crawlResult.fachbereich,
          kanton: KANTON,
          kompetenzbereiche: crawlResult.kompetenzbereiche,
          totalKompetenzstufen: crawlResult.totalKompetenzstufen,
          syncedAt: new Date().toISOString(),
        }, null, 2));
        console.log(`   💾 JSON-Backup: ${jsonFile}`);
      }

      results.push({
        code: crawlResult.fachbereich.code,
        bezeichnung: crawlResult.fachbereich.bezeichnung,
        kompetenzstufen: crawlResult.totalKompetenzstufen,
        kompetenzbereiche: crawlResult.kompetenzbereiche.length,
        orientierungspunkte,
        duration,
      });
    } catch (error) {
      console.error(`   ❌ Fehler: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Zusammenfassung
  const totalDuration = Date.now() - totalStart;
  const totalKompetenzstufen = results.reduce((sum, r) => sum + r.kompetenzstufen, 0);
  const totalOP = results.reduce((sum, r) => sum + r.orientierungspunkte, 0);

  console.log("\n\n═══════════════════════════════════════════");
  console.log("  Zusammenfassung");
  console.log("═══════════════════════════════════════════");
  console.log(`  Fachbereiche:     ${results.length}/${toSync.length}`);
  console.log(`  Kompetenzstufen:  ${totalKompetenzstufen}`);
  console.log(`  Orientierungspkt: ${totalOP}`);
  console.log(`  Dauer:            ${formatDuration(totalDuration)}`);
  console.log("");

  for (const r of results) {
    console.log(`  ${r.code.padEnd(6)} ${r.bezeichnung.padEnd(35)} ${String(r.kompetenzstufen).padStart(4)} Stufen  ${String(r.orientierungspunkte).padStart(3)} OP  ${formatDuration(r.duration)}`);
  }

  console.log("\n✅ Fertig!");
}

main().catch((error) => {
  console.error("\n💥 Fataler Fehler:", error);
  process.exit(1);
});
