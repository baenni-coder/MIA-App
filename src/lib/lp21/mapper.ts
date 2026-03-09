/**
 * LP21 → MIA-App Mapper
 *
 * Konvertiert LP21 API Crawler-Ergebnisse in das bestehende
 * Kompetenz-Format der MIA-App (kompatibel mit Airtable-Daten).
 */

import { Kompetenz, SystemKompetenz } from "@/types";
import { LP21CrawlResult, LP21KompetenzstufeResult, LP21Zyklus } from "./types";

// ============================================
// Zyklus-Mapping
// ============================================

/** LP21 Zyklus-Codes → MIA-App Zyklus-Labels */
const ZYKLUS_MAP: Record<string, string[]> = {
  "1": ["Zyklus 1"],
  "12": ["Zyklus 1", "Zyklus 2"],
  "2": ["Zyklus 2"],
  "23": ["Zyklus 2", "Zyklus 3"],
  "3": ["Zyklus 3"],
};

/** LP21 Zyklus → Klassenstufen */
const ZYKLUS_KLASSENSTUFEN: Record<string, string[]> = {
  "1": ["KiGa", "1./2."],
  "12": ["KiGa", "1./2.", "3./4."],
  "2": ["3./4.", "5./6."],
  "23": ["3./4.", "5./6.", "7.-9."],
  "3": ["7.-9."],
};

// ============================================
// Kompetenzbereich-Mapping
// ============================================

/**
 * Bestimmt den Kompetenzbereich aus dem LP-Code.
 * MI.1 = Medien, MI.2 = Informatik, MI.1 (Anwendung) = Anwendungskompetenzen
 *
 * Die genaue Zuordnung hängt vom Code ab:
 * - MI.1.x = Medien
 * - MI.2.x = Informatik
 * - Andere Codes mit "Anwendung" im Bezeichnung = Anwendungskompetenzen
 */
function detectKompetenzbereich(code: string, kompetenzbereichCode: string): string {
  // MI.1 = Medien, MI.2 = Informatik
  // Anwendungskompetenzen haben oft separate Codes
  if (kompetenzbereichCode.startsWith("MI.1")) return "Medien";
  if (kompetenzbereichCode.startsWith("MI.2")) return "Informatik";

  // Fallback für Anwendungskompetenzen und andere
  const codeParts = code.split(".");
  if (codeParts.length >= 2) {
    const bereichNr = codeParts[1];
    if (bereichNr === "1") return "Medien";
    if (bereichNr === "2") return "Informatik";
  }

  return "Anwendungskompetenzen";
}

// ============================================
// Mapper-Funktionen
// ============================================

/**
 * Konvertiert ein LP21 Crawl-Ergebnis in MIA-App Kompetenzen.
 *
 * Jede Kompetenzstufe (z.B. MI.1.1.a) wird zu einer Kompetenz
 * in der MIA-App, da die App auf dieser Ebene arbeitet.
 */
export function mapCrawlResultToKompetenzen(result: LP21CrawlResult): Kompetenz[] {
  const kompetenzen: Kompetenz[] = [];

  for (const kb of result.kompetenzbereiche) {
    for (const k of kb.kompetenzen) {
      for (const ks of k.kompetenzstufen) {
        const kompetenz = mapKompetenzstufeToKompetenz(ks, kb.code, kb.bezeichnung, k.bezeichnung);
        kompetenzen.push(kompetenz);
      }
    }
  }

  // Sortiere nach LP-Code
  kompetenzen.sort((a, b) => (a.lpCode || "").localeCompare(b.lpCode || ""));

  return kompetenzen;
}

/**
 * Konvertiert eine einzelne LP21 Kompetenzstufe zur MIA-App Kompetenz
 */
function mapKompetenzstufeToKompetenz(
  ks: LP21KompetenzstufeResult,
  kompetenzbereichCode: string,
  kompetenzbereichName: string,
  kompetenzName: string
): Kompetenz {
  // Bezeichnung aus Aufzählungspunkten zusammensetzen
  const beschreibung = ks.aufzaehlungspunkte.map((a) => a.bezeichnung).join("\n");

  // Begriffe sammeln
  const begriffe = ks.aufzaehlungspunkte
    .filter((a) => a.begriffe)
    .map((a) => a.begriffe!)
    .join(", ");

  // Vollständiger Kompetenztext
  const kompetenzText = begriffe ? `${beschreibung}\n\nBegriffe: ${begriffe}` : beschreibung;

  // Zyklus und Klassenstufen
  const zyklus = ZYKLUS_MAP[ks.zyklus] || [ks.zyklus];
  const klassenstufe = ZYKLUS_KLASSENSTUFEN[ks.zyklus] || [];

  // Kompetenzbereich bestimmen
  const kompetenzbereich = detectKompetenzbereich(ks.code, kompetenzbereichCode);

  // Querverweise formatieren
  const querverweisLP = ks.querverweise?.length
    ? ks.querverweise.map((uid) => `[${uid}]`).join(", ")
    : undefined;

  return {
    id: ks.uid, // LP21 UID als ID
    name: kompetenzbereichName,
    lpCode: ks.code,
    kompetenzbereich,
    kompetenz: kompetenzText,
    kompetenzstufe: kompetenzName,
    zyklus,
    klassenstufe,
    grundanspruch: ks.grundanspruch ? "Ja" : "Nein",
    querverweisLP,
  };
}

/**
 * Konvertiert LP21 Kompetenzen zu SystemKompetenz-Format für Firestore Cache
 */
export function mapToSystemKompetenzen(
  kompetenzen: Kompetenz[],
  existingMapping?: Map<string, string> // lpCode → airtableId
): Omit<SystemKompetenz, "id">[] {
  return kompetenzen.map((k) => {
    // Versuche bestehende Airtable-ID zu finden
    const airtableId = existingMapping?.get(k.lpCode || "") || k.id;

    return {
      airtableId, // Beibehaltung für Abwärtskompatibilität
      lp21Uid: k.id, // Neue LP21 UID
      source: "lp21" as const,
      name: k.name,
      lpCode: k.lpCode,
      kompetenzbereich: k.kompetenzbereich,
      kompetenz: k.kompetenz,
      kompetenzstufe: k.kompetenzstufe,
      zyklus: k.zyklus,
      klassenstufe: k.klassenstufe,
      grundanspruch: k.grundanspruch,
      querverweisLP: k.querverweisLP,
      unterrichtsideenIds: [], // Werden separat verknüpft
      isActive: true,
      lastSyncedAt: new Date(),
    };
  });
}
