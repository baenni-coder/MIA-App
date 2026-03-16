import { Kompetenz, SystemKompetenz, Unterrichtsidee } from "@/types";
import { getAllKompetenzen } from "@/lib/airtable/kompetenzen";
import { getSystemKompetenzen, getSystemThemes } from "@/lib/firestore/system-cache";

/**
 * Feature Flag: Firestore Cache aktivieren
 */
const USE_FIRESTORE_CACHE = process.env.ENABLE_FIRESTORE_CACHE === "true";

/**
 * Normalisiert LP-Code: IB → MI (für Solothurn)
 * IB.1.1.a → MI.1.1.a
 */
function normalizeLpCode(lpCode: string | undefined): string {
  if (!lpCode) return "";
  return lpCode.replace(/^IB\./, "MI.");
}

/**
 * Dedupliziert MI/IB Kompetenzen: gleicher normalisierter Code = gleiche Kompetenz.
 * Bevorzugt Einträge mit Unterrichtsideen (Airtable-Daten sind reichhaltiger).
 * Ergänzt alle Einträge mit Orientierungspunkten aus LP21-Daten.
 */
function deduplicateMiaKompetenzen(kompetenzen: SystemKompetenz[]): SystemKompetenz[] {
  const byCode = new Map<string, SystemKompetenz>();

  for (const sk of kompetenzen) {
    const normalizedCode = normalizeLpCode(sk.lpCode) || sk.airtableId;
    const existing = byCode.get(normalizedCode);

    if (!existing) {
      byCode.set(normalizedCode, sk);
    } else {
      // Merge: Bevorzuge den Eintrag mit mehr Daten
      const existingHasUnterrichtsideen = (existing.unterrichtsideenIds?.length || 0) > 0;
      const currentHasUnterrichtsideen = (sk.unterrichtsideenIds?.length || 0) > 0;

      if (currentHasUnterrichtsideen && !existingHasUnterrichtsideen) {
        // Aktueller hat Unterrichtsideen → bevorzugen, aber Orientierungspunkt übernehmen
        byCode.set(normalizedCode, {
          ...sk,
          orientierungspunkt: sk.orientierungspunkt || existing.orientierungspunkt,
        });
      } else {
        // Bestehender behalten, aber Orientierungspunkt vom LP21-Eintrag übernehmen
        byCode.set(normalizedCode, {
          ...existing,
          orientierungspunkt: existing.orientierungspunkt || sk.orientierungspunkt,
        });
      }
    }
  }

  return Array.from(byCode.values());
}

/**
 * Alle MIA-Kompetenzen laden (Firestore Cache oder Airtable Fallback)
 * Unterrichtsideen werden über die gecachten System-Themen aufgelöst.
 *
 * Gibt nur MI/IB Kompetenzen zurück (dedupliziert).
 * Andere Fachbereiche (D, MA, NMG) sind via /api/kompetenzen/lp21 verfügbar.
 */
export async function getKompetenzen(resolveUnterrichtsideen = true): Promise<Kompetenz[]> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log("📦 Loading kompetenzen from Firestore cache...");

      const allSystemKompetenzen = await getSystemKompetenzen();

      // Nur MIA-Kompetenzen (MI/IB)
      const miaKompetenzen = allSystemKompetenzen.filter((sk) => {
        const prefix = sk.lpCode?.split(".")[0]?.toUpperCase();
        return prefix === "MI" || prefix === "IB";
      });

      // Deduplizieren: MI.1.1.a und IB.1.1.a sind dieselbe Kompetenz
      // Bevorzugt Einträge mit Unterrichtsideen, ergänzt mit Orientierungspunkten
      const systemKompetenzen = deduplicateMiaKompetenzen(miaKompetenzen);

      // Unterrichtsideen auflösen: IDs → Themen-Daten
      let unterrichtsideenMap = new Map<string, Unterrichtsidee>();
      if (resolveUnterrichtsideen) {
        const allUnterrichtsideenIds = new Set<string>();
        systemKompetenzen.forEach((sk) => {
          sk.unterrichtsideenIds?.forEach((id) => allUnterrichtsideenIds.add(id));
        });

        if (allUnterrichtsideenIds.size > 0) {
          // Unterrichtsideen sind Themen - lade aus dem Themen-Cache
          const systemThemes = await getSystemThemes();
          systemThemes.forEach((theme) => {
            if (allUnterrichtsideenIds.has(theme.airtableId)) {
              unterrichtsideenMap.set(theme.airtableId, {
                id: theme.airtableId,
                name: theme.thema,
                lehrmittel: theme.lehrmittel,
                anzahl: theme.anzahlLektionen,
              });
            }
          });
        }
      }

      // Konvertiere SystemKompetenz → Kompetenz
      const kompetenzen: Kompetenz[] = systemKompetenzen.map((sk) => {
        const kompetenz: Kompetenz = {
          id: sk.airtableId,
          name: sk.name,
          lpCode: sk.lpCode,
          kompetenzbereich: sk.kompetenzbereich,
          kompetenz: sk.kompetenz,
          kompetenzstufe: sk.kompetenzstufe,
          zyklus: sk.zyklus,
          klassenstufe: sk.klassenstufe,
          grundanspruch: sk.grundanspruch,
          orientierungspunkt: sk.orientierungspunkt,
          querverweisLP: sk.querverweisLP,
          source: sk.source,
        };

        if (resolveUnterrichtsideen && sk.unterrichtsideenIds?.length > 0) {
          const unterrichtsideen = sk.unterrichtsideenIds
            .map((id) => unterrichtsideenMap.get(id))
            .filter((u): u is Unterrichtsidee => u !== undefined);
          if (unterrichtsideen.length > 0) {
            kompetenz.unterrichtsideen = unterrichtsideen;
          }
        }

        return kompetenz;
      });

      // Sortiere nach normalisiertem LP Code (damit MI und IB zusammen sortiert werden)
      kompetenzen.sort((a, b) =>
        normalizeLpCode(a.lpCode).localeCompare(normalizeLpCode(b.lpCode))
      );

      console.log(`✅ Loaded ${kompetenzen.length} kompetenzen from Firestore (dedupliziert aus ${miaKompetenzen.length})`);
      return kompetenzen;
    } catch (error) {
      console.error("❌ Error loading kompetenzen from Firestore, falling back to Airtable:", error);
      return getAllKompetenzen(resolveUnterrichtsideen);
    }
  }

  // Standard: Airtable
  console.log("📋 Loading kompetenzen from Airtable...");
  return getAllKompetenzen(resolveUnterrichtsideen);
}
