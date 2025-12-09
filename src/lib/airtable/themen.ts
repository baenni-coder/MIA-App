import getBase from "./config";
import { Thema, Stufe, Zeitraum } from "@/types";

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

    return records.map((record) => {
      // Extrahiere Bild-URL aus Airtable Attachment
      const bildAttachments = record.get("Bild Lehrmittel") as any;
      let bildUrl: string | undefined;
      if (Array.isArray(bildAttachments) && bildAttachments.length > 0) {
        bildUrl = bildAttachments[0].url;
      }

      return {
        id: record.id,
        thema: record.get("Thema") as string,
        beschreibung: record.get("Um was geht es?") as string | undefined,
        lehrmittel: record.get("Lehrmittel") as string | undefined,
        bildLehrmittel: bildUrl,
        anzahlLektionen: record.get("Anzahl Lektionen") as number | undefined,
        kompetenzenLehrplan: record.get("Kompetenzen Lehrplan") as string | undefined,
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
