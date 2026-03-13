import { Kompetenz, Unterrichtsidee } from "@/types";
import { getAllKompetenzen } from "@/lib/airtable/kompetenzen";
import { getSystemKompetenzen, getSystemThemes } from "@/lib/firestore/system-cache";

/**
 * Feature Flag: Firestore Cache aktivieren
 */
const USE_FIRESTORE_CACHE = process.env.ENABLE_FIRESTORE_CACHE === "true";

/**
 * Alle Kompetenzen laden (Firestore Cache oder Airtable Fallback)
 * Unterrichtsideen werden über die gecachten System-Themen aufgelöst.
 */
export async function getKompetenzen(resolveUnterrichtsideen = true): Promise<Kompetenz[]> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log("📦 Loading kompetenzen from Firestore cache...");

      const allSystemKompetenzen = await getSystemKompetenzen();

      // Nur MIA-Kompetenzen (MI/IB) für die Lehrplan-Seite
      // Andere Fachbereiche (D, MA, NMG etc.) sind für die Jahresplanung via /api/kompetenzen/lp21
      const miaKompetenzen = allSystemKompetenzen.filter((sk) => {
        const prefix = sk.lpCode?.split(".")[0]?.toUpperCase();
        return prefix === "MI" || prefix === "IB";
      });

      // Merge-Strategie: Airtable als Basis behalten (hat Unterrichtsideen, Regelstandards)
      // LP21-Daten nur zur Anreicherung verwenden (Orientierungspunkte)
      // Index: normalisierter LP-Code (IB→MI) → LP21-Daten
      const lp21ByCode = new Map<string, typeof miaKompetenzen[0]>();
      for (const sk of miaKompetenzen) {
        if (sk.source === "lp21") {
          const normalizedCode = sk.lpCode?.replace(/^IB\./, "MI.") || "";
          if (normalizedCode) lp21ByCode.set(normalizedCode, sk);
        }
      }

      // Behalte nur Airtable-Kompetenzen (source !== "lp21") als Basis
      // Ergänze sie mit Orientierungspunkten aus LP21
      const systemKompetenzen = miaKompetenzen
        .filter((sk) => sk.source !== "lp21")
        .map((sk) => {
          // Passende LP21-Daten finden (MI.1.1.a → suche MI.1.1.a oder IB.1.1.a)
          const normalizedCode = sk.lpCode || "";
          const lp21Match = lp21ByCode.get(normalizedCode);
          if (lp21Match) {
            return {
              ...sk,
              orientierungspunkt: lp21Match.orientierungspunkt,
            };
          }
          return sk;
        });

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

      // Sortiere nach LP Code
      kompetenzen.sort((a, b) => (a.lpCode || "").localeCompare(b.lpCode || ""));

      console.log(`✅ Loaded ${kompetenzen.length} kompetenzen from Firestore`);
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
