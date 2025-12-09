import getBase from "./config";
import { Thema, Stufe, Zeitraum } from "@/types";
import { getKompetenzenByIds } from "./kompetenzen";

const THEMEN_TABLE = process.env.AIRTABLE_THEMEN_TABLE || "Themen";

// Helper: Parse Stufen aus CSV-String oder Array
const parseStufen = (stufen: string | string[] | undefined): Stufe[] => {
  if (!stufen) return [];

  // Wenn es schon ein Array ist (Airtable Format)
  if (Array.isArray(stufen)) {
    return stufen.map((s) => s.trim() as Stufe);
  }

  // Wenn es ein String ist (CSV Format)
  return stufen.split(",").map((s) => s.trim() as Stufe);
};

// Alle Themen laden
export const getAllThemen = async (): Promise<Thema[]> => {
  try {
    const base = getBase();
    const records = await base(THEMEN_TABLE).select().all();

    // Sammle alle Kompetenzen-IDs
    const allKompetenzIds = new Set<string>();
    const themenWithKompetenzIds: Array<{
      record: any;
      kompetenzIds: string[];
      bildUrl?: string;
    }> = [];

    records.forEach((record) => {
      // Extrahiere Bild-URL aus Airtable Attachment
      const bildAttachments = record.get("Bild Lehrmittel") as any;
      let bildUrl: string | undefined;
      if (Array.isArray(bildAttachments) && bildAttachments.length > 0) {
        bildUrl = bildAttachments[0].url;
      }

      // Parse Kompetenzen IDs (Array von Record-IDs)
      const kompetenzenRaw = record.get("Kompetenzen Lehrplan");
      let kompetenzIds: string[] = [];

      if (Array.isArray(kompetenzenRaw)) {
        // Prüfe, ob es IDs sind (starten mit "rec")
        kompetenzIds = kompetenzenRaw.filter(
          (id) => typeof id === "string" && id.startsWith("rec")
        );
        kompetenzIds.forEach((id) => allKompetenzIds.add(id));
      }

      themenWithKompetenzIds.push({ record, kompetenzIds, bildUrl });
    });

    // Lade alle Kompetenzen auf einmal
    const kompetenzenMap = await getKompetenzenByIds(Array.from(allKompetenzIds));

    // Baue die Themen mit aufgelösten Kompetenzen
    return themenWithKompetenzIds.map(({ record, kompetenzIds, bildUrl }) => {
      // Hole Kompetenz-Objekte
      const kompetenzenObjekte = kompetenzIds
        .map((id) => kompetenzenMap.get(id))
        .filter((k): k is import("@/types").Kompetenz => k !== undefined);

      // String-Repräsentation für Anzeige
      const kompetenzenString = kompetenzenObjekte
        .map((k) => k.lpCode || k.name)
        .join(", ");

      return {
        id: record.id,
        thema: record.get("Thema") as string,
        beschreibung: record.get("Um was geht es?") as string | undefined,
        lehrmittel: record.get("Lehrmittel") as string | undefined,
        bildLehrmittel: bildUrl,
        anzahlLektionen: record.get("Anzahl Lektionen") as number | undefined,
        kompetenzenLehrplan: kompetenzenString || undefined,
        kompetenzen: kompetenzenObjekte.length > 0 ? kompetenzenObjekte : undefined,
        fileRouge: record.get("File rouge") as string | undefined,
        unterlagen: record.get("Unterlagen zum Kapitel") as string | undefined,
        schuljahr: parseStufen(record.get("Schuljahr") as string | string[] | undefined),
        lektionsplanung: record.get("Lektionsplanung") as string | undefined,
        zeitraum: record.get("Zeitraum der Bearbeitung") as Zeitraum | undefined,
        startdatum: record.get("Startdatum") as string | undefined,
        uebersichtPICTS: record.get("Übersicht PICTS Buchungen") as string | undefined,
        pictsBuchen: record.get("PICTS buchen") as string | undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching Themen from Airtable:", error);
    return [];
  }
};

// Themen nach Stufe filtern
export const getThemenByStufe = async (stufe: Stufe): Promise<Thema[]> => {
  try {
    const allThemen = await getAllThemen();
    return allThemen.filter((thema) => thema.schuljahr.includes(stufe));
  } catch (error) {
    console.error("Error filtering Themen by Stufe:", error);
    return [];
  }
};

// Themen nach Zeitraum gruppieren (für Kanban)
export const getThemenGroupedByZeitraum = async (
  stufe: Stufe
): Promise<Record<Zeitraum, Thema[]>> => {
  const themen = await getThemenByStufe(stufe);

  const grouped: Record<Zeitraum, Thema[]> = {
    "Sommerferien-Herbstferien": [],
    "Herbstferien-Weihnachtsferien": [],
    "Weihnachtsferien-Winterferien": [],
    "Winterferien-Frühlingsferien": [],
    "Frühlingsferien-Sommerferien": [],
    "Zusatz": [],
  };

  themen.forEach((thema) => {
    if (thema.zeitraum && grouped[thema.zeitraum]) {
      grouped[thema.zeitraum].push(thema);
    }
  });

  return grouped;
};
