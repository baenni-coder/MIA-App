import getBase from "./config";
import { Schule } from "@/types";

const SCHULEN_TABLE = process.env.AIRTABLE_SCHULEN_TABLE || "Schulen";

/**
 * Validiert eine URL und schützt vor Phishing/XSS
 * Nur HTTPS-URLs sind erlaubt
 * Optional: Whitelist von erlaubten Domains
 */
function validatePICTSUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);

    // Nur HTTPS erlauben (keine javascript:, data:, file:, etc.)
    if (parsed.protocol !== 'https:') {
      console.warn(`Invalid PICTS URL protocol: ${parsed.protocol} for URL: ${url}`);
      return undefined;
    }

    // Optional: Whitelist erlaubter Domains (kann angepasst werden)
    // Kommentar: Falls spezifische Domains bekannt sind, hier hinzufügen
    // const allowedDomains = ['picts-buchung.ch', 'schulevents.ch', 'example.com'];
    // if (!allowedDomains.some(domain => parsed.hostname.includes(domain))) {
    //   console.warn(`PICTS URL not in whitelist: ${parsed.hostname}`);
    //   return undefined;
    // }

    return url;
  } catch (error) {
    console.warn(`Invalid PICTS URL format: ${url}`, error);
    return undefined;
  }
}

// Alle Schulen laden
export const getAllSchulen = async (): Promise<Schule[]> => {
  try {
    const base = getBase();
    const records = await base(SCHULEN_TABLE).select().all();

    return records.map((record) => ({
      id: record.id,
      name: record.get("Name") as string,
      ort: record.get("Ort") as string | undefined,
      pictsBuchen: validatePICTSUrl(record.get("PICTS buchen") as string | undefined),
      createdAt: new Date(record.get("Created") as string || Date.now()),
    }));
  } catch (error) {
    console.error("Error fetching Schulen from Airtable:", error);
    return [];
  }
};

// Schule nach ID laden
export const getSchuleById = async (id: string): Promise<Schule | null> => {
  try {
    const base = getBase();
    const record = await base(SCHULEN_TABLE).find(id);

    return {
      id: record.id,
      name: record.get("Name") as string,
      ort: record.get("Ort") as string | undefined,
      pictsBuchen: validatePICTSUrl(record.get("PICTS buchen") as string | undefined),
      createdAt: new Date(record.get("Created") as string || Date.now()),
    };
  } catch (error) {
    console.error("Error fetching Schule by ID from Airtable:", error);
    return null;
  }
};

// Schule erstellen
export const createSchule = async (
  name: string,
  ort?: string
): Promise<Schule | null> => {
  try {
    const base = getBase();
    const record = await base(SCHULEN_TABLE).create({
      Name: name,
      Ort: ort,
    });

    return {
      id: record.id,
      name: record.get("Name") as string,
      ort: record.get("Ort") as string | undefined,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error("Error creating Schule:", error);
    return null;
  }
};

// Schule aktualisieren
export const updateSchule = async (
  id: string,
  name: string,
  ort?: string
): Promise<boolean> => {
  try {
    const base = getBase();
    await base(SCHULEN_TABLE).update(id, {
      Name: name,
      Ort: ort,
    });
    return true;
  } catch (error) {
    console.error("Error updating Schule:", error);
    return false;
  }
};

// Schule löschen
export const deleteSchule = async (id: string): Promise<boolean> => {
  try {
    const base = getBase();
    await base(SCHULEN_TABLE).destroy(id);
    return true;
  } catch (error) {
    console.error("Error deleting Schule:", error);
    return false;
  }
};
