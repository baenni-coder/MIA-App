import getBase from "./config";

const KOMPETENZEN_TABLE = process.env.AIRTABLE_KOMPETENZEN_TABLE || "Kompetenzen";

export interface Kompetenz {
  id: string;
  name: string;
}

// Kompetenzen nach IDs laden
export const getKompetenzenByIds = async (ids: string[]): Promise<Map<string, string>> => {
  if (!ids || ids.length === 0) {
    return new Map();
  }

  try {
    const base = getBase();
    const kompetenzenMap = new Map<string, string>();

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
        // Versuche verschiedene mögliche Feldnamen
        const name =
          record.get("Name") ||
          record.get("Kompetenz") ||
          record.get("Bezeichnung") ||
          record.get("Title") ||
          "";

        if (name) {
          kompetenzenMap.set(record.id, String(name));
        }
      });
    }

    return kompetenzenMap;
  } catch (error) {
    console.error("Error fetching Kompetenzen from Airtable:", error);
    console.log("Hinweis: Stelle sicher, dass eine Kompetenzen-Tabelle in Airtable existiert");
    return new Map();
  }
};
