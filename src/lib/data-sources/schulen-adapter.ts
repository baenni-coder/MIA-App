import { Schule } from "@/types";
import { getAllSchulen, getSchuleById as getSchuleByIdAirtable } from "@/lib/airtable/schulen";
import { getSystemSchulen, getSystemSchuleByAirtableId } from "@/lib/firestore/system-cache";

/**
 * Feature Flag: Firestore Cache aktivieren
 */
const USE_FIRESTORE_CACHE = process.env.ENABLE_FIRESTORE_CACHE === "true";

/**
 * Konvertiert SystemSchule zu Schule
 */
function convertSystemSchuleToSchule(systemSchule: any): Schule {
  return {
    id: systemSchule.airtableId,
    name: systemSchule.name,
    ort: systemSchule.ort,
    pictsBuchen: systemSchule.pictsBuchen,
    createdAt: systemSchule.lastSyncedAt, // Verwende lastSyncedAt als Fallback
  };
}

/**
 * Alle Schulen laden
 */
export async function getSchulen(): Promise<Schule[]> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log("📦 Loading schulen from Firestore cache...");
      const systemSchulen = await getSystemSchulen();

      const schulen = systemSchulen.map(convertSystemSchuleToSchule);

      console.log(`✅ Loaded ${schulen.length} schulen from Firestore`);
      return schulen;
    } catch (error) {
      console.error("❌ Error loading from Firestore, falling back to Airtable:", error);
      // Fallback zu Airtable
      return getAllSchulen();
    }
  }

  // Standard: Airtable
  console.log("📋 Loading schulen from Airtable...");
  return getAllSchulen();
}

/**
 * Schule nach ID laden
 */
export async function getSchuleById(id: string): Promise<Schule | null> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log(`📦 Loading schule ${id} from Firestore cache...`);
      const systemSchule = await getSystemSchuleByAirtableId(id);

      if (!systemSchule) {
        console.log(`⚠️  Schule ${id} not found in cache, trying Airtable...`);
        return getSchuleByIdAirtable(id);
      }

      const schule = convertSystemSchuleToSchule(systemSchule);

      console.log(`✅ Loaded schule from Firestore`);
      return schule;
    } catch (error) {
      console.error("❌ Error loading from Firestore, falling back to Airtable:", error);
      // Fallback zu Airtable
      return getSchuleByIdAirtable(id);
    }
  }

  // Standard: Airtable
  console.log(`📋 Loading schule ${id} from Airtable...`);
  return getSchuleByIdAirtable(id);
}
