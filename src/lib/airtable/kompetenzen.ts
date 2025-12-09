import getBase from "./config";
import { Kompetenz } from "@/types";

const KOMPETENZEN_TABLE = process.env.AIRTABLE_KOMPETENZEN_TABLE || "Kompetenzen Lehrplan";

// Kompetenzen nach IDs laden (vollständige Objekte)
export const getKompetenzenByIds = async (ids: string[]): Promise<Map<string, Kompetenz>> => {
  if (!ids || ids.length === 0) {
    return new Map();
  }

  try {
    const base = getBase();
    const kompetenzenMap = new Map<string, Kompetenz>();

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

          // Parse Unterrichtsideen (wenn vorhanden)
          const unterrichtsideenRaw = record.get("Unterrichtsideen");
          let unterrichtsideen: Array<{ name: string; anzahl?: number }> = [];

          if (Array.isArray(unterrichtsideenRaw)) {
            // Annahme: Format ist Text mit "Name: Anzahl" oder nur "Name"
            unterrichtsideen = unterrichtsideenRaw.map((item: any) => {
              if (typeof item === "string") {
                const parts = item.split(":");
                return {
                  name: parts[0]?.trim() || item,
                  anzahl: parts[1] ? parseInt(parts[1]) : undefined,
                };
              }
              return { name: String(item) };
            });
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
            unterrichtsideen,
          };

          kompetenzenMap.set(record.id, kompetenz);
        }
      });
    }

    return kompetenzenMap;
  } catch (error) {
    console.error("Error fetching Kompetenzen from Airtable:", error);
    console.log("Hinweis: Stelle sicher, dass die Kompetenzen-Tabelle existiert:", KOMPETENZEN_TABLE);
    return new Map();
  }
};
