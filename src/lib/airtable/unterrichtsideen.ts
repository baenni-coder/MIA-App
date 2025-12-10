import getBase from "./config";
import { Unterrichtsidee } from "@/types";

const UNTERRICHTSIDEEN_TABLE = process.env.AIRTABLE_UNTERRICHTSIDEEN_TABLE || "Themen";

// Unterrichtsideen nach IDs laden
export const getUnterrichtsideenByIds = async (ids: string[]): Promise<Map<string, Unterrichtsidee>> => {
  if (!ids || ids.length === 0) {
    return new Map();
  }

  try {
    const base = getBase();
    const unterrichtsideenMap = new Map<string, Unterrichtsidee>();

    // Batch-Load Unterrichtsideen
    // Airtable erlaubt bis zu 10 IDs in einem filterByFormula
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      const formula = `OR(${batch.map(id => `RECORD_ID()='${id}'`).join(',')})`;

      const records = await base(UNTERRICHTSIDEEN_TABLE)
        .select({
          filterByFormula: formula,
        })
        .all();

      records.forEach(record => {
        // Für Unterrichtsideen aus Themen-Tabelle: Verwende "Thema" als Name
        const name =
          record.get("Thema") ||
          record.get("Name") ||
          record.get("Unterrichtsideen") ||
          record.get("Titel") ||
          "";

        if (name) {
          const unterrichtsidee: Unterrichtsidee = {
            id: record.id,
            name: String(name),
            lehrmittel: record.get("Lehrmittel") as string | undefined,
            anzahl: record.get("Anzahl Lektionen") as number | undefined,
          };

          unterrichtsideenMap.set(record.id, unterrichtsidee);
        }
      });
    }

    return unterrichtsideenMap;
  } catch (error) {
    console.error("Error fetching Unterrichtsideen from Airtable:", error);
    console.log("Hinweis: Stelle sicher, dass die Unterrichtsideen-Tabelle existiert:", UNTERRICHTSIDEEN_TABLE);
    return new Map();
  }
};
