import { Lektionsplanung } from "@/types";
import { getLektionsplanungByThemaName } from "@/lib/airtable/lektionsplanung";
import { getSystemLektionenByThemaName, getSystemLektionenByThemaId } from "@/lib/firestore/system-cache";

/**
 * Feature Flag: Firestore Cache aktivieren
 */
const USE_FIRESTORE_CACHE = process.env.ENABLE_FIRESTORE_CACHE === "true";

/**
 * Konvertiert SystemLektion zu Lektionsplanung
 */
function convertSystemLektionToLektionsplanung(systemLektion: any): Lektionsplanung {
  return {
    id: systemLektion.airtableId,
    eindeutigeBezeichnung: systemLektion.eindeutigeBezeichnung,
    lektion: systemLektion.lektion,
    themaId: systemLektion.themaId,
    themaName: systemLektion.themaName,
    aufgaben: systemLektion.aufgaben,
    vorwissen: systemLektion.vorwissen,
    material: systemLektion.material,
    websiteTools: systemLektion.websiteTools,
    einstieg: systemLektion.einstieg,
    hauptteil: systemLektion.hauptteil,
    abschluss: systemLektion.abschluss,
    stolpersteine: systemLektion.stolpersteine,
    kiZusammenfassung: systemLektion.kiZusammenfassung,
  };
}

/**
 * Lektionsplanung nach Thema-Name laden
 */
export async function getLektionenByThemaName(themaName: string): Promise<Lektionsplanung[]> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log(`📦 Loading lektionen for "${themaName}" from Firestore cache...`);
      const systemLektionen = await getSystemLektionenByThemaName(themaName);

      const lektionen = systemLektionen.map(convertSystemLektionToLektionsplanung);

      console.log(`✅ Loaded ${lektionen.length} lektionen from Firestore`);
      return lektionen;
    } catch (error) {
      console.error("❌ Error loading from Firestore, falling back to Airtable:", error);
      // Fallback zu Airtable
      return getLektionsplanungByThemaName(themaName);
    }
  }

  // Standard: Airtable
  console.log(`📋 Loading lektionen for "${themaName}" from Airtable...`);
  return getLektionsplanungByThemaName(themaName);
}

/**
 * Lektionsplanung nach Thema-ID laden
 */
export async function getLektionenByThemaId(themaId: string): Promise<Lektionsplanung[]> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log(`📦 Loading lektionen for thema ${themaId} from Firestore cache...`);
      const systemLektionen = await getSystemLektionenByThemaId(themaId);

      const lektionen = systemLektionen.map(convertSystemLektionToLektionsplanung);

      console.log(`✅ Loaded ${lektionen.length} lektionen from Firestore`);
      return lektionen;
    } catch (error) {
      console.error("❌ Error loading from Firestore, falling back to Airtable:", error);
      // Fallback zu Airtable
      // Airtable hat keine direkte ID-Suche, müsste über Name gehen
      console.warn("⚠️  No fallback available for ID-based lookup in Airtable");
      return [];
    }
  }

  // Standard: Airtable
  console.warn("⚠️  Airtable does not support ID-based lookup, returning empty array");
  return [];
}
