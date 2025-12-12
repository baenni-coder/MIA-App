import getBase from "./config";
import { Lektionsplanung, WebsiteTool } from "@/types";

const LEKTIONSPLANUNG_TABLE = process.env.AIRTABLE_LEKTIONSPLANUNG_TABLE || "Lektionsplanung";

// Helper: Parse Material aus CSV-String
const parseMaterial = (material: string | string[] | undefined): string[] => {
  if (!material) return [];

  // Wenn es schon ein Array ist
  if (Array.isArray(material)) {
    return material.map((m) => m.trim());
  }

  // Wenn es ein String ist (CSV Format)
  return material.split(",").map((m) => m.trim()).filter(m => m.length > 0);
};

// Helper: Parse Website Tools
const parseWebsiteTools = (
  toolIds: string[] | undefined,
  toolNames: string | string[] | undefined,
  toolLinks: string | string[] | undefined
): WebsiteTool[] => {
  if (!toolIds || toolIds.length === 0) return [];

  // Konvertiere Namen und Links zu Arrays
  const namesArray = Array.isArray(toolNames) ? toolNames : (toolNames ? toolNames.split(",").map(n => n.trim()) : []);
  const linksArray = Array.isArray(toolLinks) ? toolLinks : (toolLinks ? toolLinks.split(",").map(l => l.trim()) : []);

  // Erstelle WebsiteTool-Objekte
  return toolIds.map((id, index) => ({
    id,
    name: namesArray[index] || "Unbekanntes Tool",
    link: linksArray[index],
  }));
};

// Lektionsplanung nach Thema-Name laden
export const getLektionsplanungByThemaName = async (themaName: string): Promise<Lektionsplanung[]> => {
  try {
    const base = getBase();

    // Suche nach Lektionen, die zu diesem Thema gehören
    const records = await base(LEKTIONSPLANUNG_TABLE)
      .select({
        filterByFormula: `{Thema (from Thema)} = '${themaName.replace(/'/g, "\\'")}'`,
        sort: [{ field: "Lektion", direction: "asc" }]
      })
      .all();

    return records.map((record) => {
      // Parse Material
      const materialRaw = record.get("Material");
      const material = parseMaterial(materialRaw as string | string[] | undefined);

      // Parse Website Tools (mit lookup fields)
      const toolIds = record.get("Website oder Tool") as string[] | undefined;
      const toolNames = record.get("Name (from Website oder Tool)") as string | string[] | undefined;
      const toolLinks = record.get("Link (from Website oder Tool)") as string | string[] | undefined;
      const websiteTools = parseWebsiteTools(toolIds, toolNames, toolLinks);

      return {
        id: record.id,
        eindeutigeBezeichnung: record.get("Eindeutige Lektionsbezeichnung") as string,
        lektion: record.get("Lektion") as string,
        themaId: Array.isArray(record.get("Thema"))
          ? (record.get("Thema") as string[])[0]
          : (record.get("Thema") as string),
        themaName: record.get("Thema (from Thema)") as string | undefined,
        aufgaben: record.get("Aufgaben") as string | undefined,
        vorwissen: record.get("Vorwissen") as string | undefined,
        material: material.length > 0 ? material : undefined,
        websiteTools: websiteTools.length > 0 ? websiteTools : undefined,
        einstieg: record.get("Einstieg") as string | undefined,
        hauptteil: record.get("Hauptteil") as string | undefined,
        abschluss: record.get("Abschluss") as string | undefined,
        stolpersteine: record.get("Stolpersteine") as string | undefined,
        kiZusammenfassung: record.get("KI Zusammenfassung Lektion") as string | undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching Lektionsplanung from Airtable:", error);
    return [];
  }
};

// Einzelne Lektionsplanung nach ID laden
export const getLektionsplanungById = async (id: string): Promise<Lektionsplanung | null> => {
  try {
    const base = getBase();
    const record = await base(LEKTIONSPLANUNG_TABLE).find(id);

    if (!record) return null;

    // Parse Material
    const materialRaw = record.get("Material");
    const material = parseMaterial(materialRaw as string | string[] | undefined);

    // Parse Website Tools
    const toolIds = record.get("Website oder Tool") as string[] | undefined;
    const toolNames = record.get("Name (from Website oder Tool)") as string | string[] | undefined;
    const toolLinks = record.get("Link (from Website oder Tool)") as string | string[] | undefined;
    const websiteTools = parseWebsiteTools(toolIds, toolNames, toolLinks);

    return {
      id: record.id,
      eindeutigeBezeichnung: record.get("Eindeutige Lektionsbezeichnung") as string,
      lektion: record.get("Lektion") as string,
      themaId: Array.isArray(record.get("Thema"))
        ? (record.get("Thema") as string[])[0]
        : (record.get("Thema") as string),
      themaName: record.get("Thema (from Thema)") as string | undefined,
      aufgaben: record.get("Aufgaben") as string | undefined,
      vorwissen: record.get("Vorwissen") as string | undefined,
      material: material.length > 0 ? material : undefined,
      websiteTools: websiteTools.length > 0 ? websiteTools : undefined,
      einstieg: record.get("Einstieg") as string | undefined,
      hauptteil: record.get("Hauptteil") as string | undefined,
      abschluss: record.get("Abschluss") as string | undefined,
      stolpersteine: record.get("Stolpersteine") as string | undefined,
      kiZusammenfassung: record.get("KI Zusammenfassung Lektion") as string | undefined,
    };
  } catch (error) {
    console.error("Error fetching Lektionsplanung by ID from Airtable:", error);
    return null;
  }
};
