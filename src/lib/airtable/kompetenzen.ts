import getBase from "./config";
import { Kompetenz } from "@/types";
import { getUnterrichtsideenByIds } from "./unterrichtsideen";

const KOMPETENZEN_TABLE = process.env.AIRTABLE_KOMPETENZEN_TABLE || "Kompetenzen Lehrplan";

// Alle Kompetenzen laden (mit optionaler Unterrichtsideen-Auflösung)
export const getAllKompetenzen = async (resolveUnterrichtsideen = true): Promise<Kompetenz[]> => {
  try {
    const base = getBase();
    const records = await base(KOMPETENZEN_TABLE).select().all();

    const allUnterrichtsideenIds = new Set<string>();
    const kompetenzenWithIds: Array<{ kompetenz: Kompetenz; unterrichtsideenIds: string[] }> = [];

    records.forEach((record) => {
      const name =
        record.get("Name") ||
        record.get("Kompetenz von Kompetenzen Lehrplan") ||
        record.get("LP Code") ||
        record.get("Bezeichnung") ||
        "";

      if (name) {
        const zyklusRaw = record.get("Zyklus");
        const zyklus = Array.isArray(zyklusRaw) ? zyklusRaw : [];

        const klassenstufeRaw = record.get("Klassenstufe");
        const klassenstufe = Array.isArray(klassenstufeRaw) ? klassenstufeRaw : [];

        const unterrichtsideenRaw = record.get("Unterrichtsideen");
        let unterrichtsideenIds: string[] = [];

        if (Array.isArray(unterrichtsideenRaw)) {
          unterrichtsideenIds = unterrichtsideenRaw.filter(
            (id: any) => typeof id === "string" && id.startsWith("rec")
          );
          unterrichtsideenIds.forEach((id) => allUnterrichtsideenIds.add(id));
        }

        const kompetenz: Kompetenz = {
          id: record.id,
          name: String(name),
          lpCode: record.get("LP Code") as string | undefined,
          kompetenzbereich: record.get("Kompetenzbereich") as string | undefined,
          kompetenz: record.get("Kompetenz") as string | undefined,
          kompetenzstufe: record.get("Kompetenzstufe") as string | undefined,
          zyklus,
          klassenstufe,
          grundanspruch: record.get("Grundanspruch") as string | undefined,
          querverweisLP: record.get("Querverweis LP") as string | undefined,
        };

        kompetenzenWithIds.push({ kompetenz, unterrichtsideenIds });
      }
    });

    // Lade Unterrichtsideen wenn gewünscht
    if (resolveUnterrichtsideen && allUnterrichtsideenIds.size > 0) {
      const unterrichtsideenMap = await getUnterrichtsideenByIds(Array.from(allUnterrichtsideenIds));

      kompetenzenWithIds.forEach(({ kompetenz, unterrichtsideenIds }) => {
        const unterrichtsideen = unterrichtsideenIds
          .map((id) => unterrichtsideenMap.get(id))
          .filter((u): u is import("@/types").Unterrichtsidee => u !== undefined);

        kompetenz.unterrichtsideen = unterrichtsideen.length > 0 ? unterrichtsideen : undefined;
      });
    }

    // Sortiere nach LP Code
    return kompetenzenWithIds
      .map(({ kompetenz }) => kompetenz)
      .sort((a, b) => (a.lpCode || "").localeCompare(b.lpCode || ""));
  } catch (error) {
    console.error("Error fetching all Kompetenzen from Airtable:", error);
    return [];
  }
};

// Kompetenzen nach IDs laden (vollständige Objekte)
export const getKompetenzenByIds = async (ids: string[]): Promise<Map<string, Kompetenz>> => {
  if (!ids || ids.length === 0) {
    return new Map();
  }

  try {
    const base = getBase();
    const kompetenzenMap = new Map<string, Kompetenz>();
    const allUnterrichtsideenIds = new Set<string>();
    const kompetenzenWithIds: Array<{ kompetenz: Kompetenz; unterrichtsideenIds: string[] }> = [];

    // Batch-Load Kompetenzen
    // Airtable erlaubt bis zu 10 IDs in einem filterByFormula
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      const formula = `OR(${batch.map(id => `RECORD_ID()='${id}'`).join(',')})`;

      const records = await base(KOMPETENZEN_TABLE)
        .select({
          filterByFormula: formula,
        })
        .all();

      records.forEach(record => {
        // Versuche verschiedene mögliche Feldnamen für den Namen
        const name =
          record.get("Name") ||
          record.get("Kompetenz von Kompetenzen Lehrplan") ||
          record.get("LP Code") ||
          record.get("Bezeichnung") ||
          "";

        if (name) {
          // Parse Zyklus und Klassenstufe Arrays
          const zyklusRaw = record.get("Zyklus");
          const zyklus = Array.isArray(zyklusRaw) ? zyklusRaw : [];

          const klassenstufeRaw = record.get("Klassenstufe");
          const klassenstufe = Array.isArray(klassenstufeRaw) ? klassenstufeRaw : [];

          // Parse Unterrichtsideen IDs (Array von Record-IDs)
          const unterrichtsideenRaw = record.get("Unterrichtsideen");
          let unterrichtsideenIds: string[] = [];

          if (Array.isArray(unterrichtsideenRaw)) {
            // Prüfe, ob es IDs sind (starten mit "rec")
            unterrichtsideenIds = unterrichtsideenRaw.filter(
              (id: any) => typeof id === "string" && id.startsWith("rec")
            );
            unterrichtsideenIds.forEach((id) => allUnterrichtsideenIds.add(id));
          }

          const kompetenz: Kompetenz = {
            id: record.id,
            name: String(name),
            lpCode: record.get("LP Code") as string | undefined,
            kompetenzbereich: record.get("Kompetenzbereich") as string | undefined,
            kompetenz: record.get("Kompetenz") as string | undefined,
            kompetenzstufe: record.get("Kompetenzstufe") as string | undefined,
            zyklus,
            klassenstufe,
            grundanspruch: record.get("Grundanspruch") as string | undefined,
            querverweisLP: record.get("Querverweis LP") as string | undefined,
          };

          kompetenzenWithIds.push({ kompetenz, unterrichtsideenIds });
        }
      });
    }

    // Lade alle Unterrichtsideen auf einmal
    const unterrichtsideenMap = await getUnterrichtsideenByIds(Array.from(allUnterrichtsideenIds));

    // Baue die Kompetenzen mit aufgelösten Unterrichtsideen
    kompetenzenWithIds.forEach(({ kompetenz, unterrichtsideenIds }) => {
      const unterrichtsideen = unterrichtsideenIds
        .map((id) => unterrichtsideenMap.get(id))
        .filter((u): u is import("@/types").Unterrichtsidee => u !== undefined);

      kompetenz.unterrichtsideen = unterrichtsideen.length > 0 ? unterrichtsideen : undefined;
      kompetenzenMap.set(kompetenz.id, kompetenz);
    });

    return kompetenzenMap;
  } catch (error) {
    console.error("Error fetching Kompetenzen from Airtable:", error);
    console.log("Hinweis: Stelle sicher, dass die Kompetenzen-Tabelle existiert:", KOMPETENZEN_TABLE);
    return new Map();
  }
};
