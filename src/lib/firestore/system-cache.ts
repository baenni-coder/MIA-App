import { getAdminDb } from "@/lib/firebase/admin";
import {
  SystemTheme,
  SystemSchule,
  SystemKompetenz,
  SystemLektion,
  SyncMetadata,
  SyncLog,
  SyncStatus,
  Stufe,
  Zeitraum,
  WebsiteTool,
} from "@/types";
import * as admin from "firebase-admin";

// Collection Names
const SYSTEM_THEMES_COLLECTION = "system_themes";
const SYSTEM_SCHULEN_COLLECTION = "system_schulen";
const SYSTEM_KOMPETENZEN_COLLECTION = "system_kompetenzen";
const SYSTEM_LEKTIONEN_COLLECTION = "system_lektionen";
const SYNC_METADATA_COLLECTION = "sync_metadata";
const SYNC_LOGS_COLLECTION = "sync_logs";

/**
 * Konvertiert Firestore Timestamp zu Date
 */
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// ============================================
// System Themes
// ============================================

/**
 * Batch-Update/Insert System Themes
 */
export async function upsertSystemThemes(themes: Omit<SystemTheme, "id">[]): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    themes.forEach((theme) => {
      const docRef = adminDb.collection(SYSTEM_THEMES_COLLECTION).doc(theme.airtableId);
      const cleanedTheme = removeUndefined({
        ...theme,
        lastSyncedAt: new Date(),
      });
      batch.set(docRef, cleanedTheme, { merge: true });
    });

    await batch.commit();
    return themes.length;
  } catch (error) {
    console.error("Error upserting system themes:", error);
    throw error;
  }
}

/**
 * Alle aktiven System Themes laden
 */
export async function getSystemThemes(stufe?: Stufe): Promise<SystemTheme[]> {
  try {
    const adminDb = getAdminDb();
    let query: admin.firestore.Query = adminDb
      .collection(SYSTEM_THEMES_COLLECTION)
      .where("isActive", "==", true);

    const snapshot = await query.get();

    const themes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        airtableId: data.airtableId,
        thema: data.thema,
        beschreibung: data.beschreibung,
        lehrmittel: data.lehrmittel,
        bildLehrmittel: data.bildLehrmittel,
        anzahlLektionen: data.anzahlLektionen,
        schuljahr: data.schuljahr || [],
        zeitraum: data.zeitraum,
        kompetenzenIds: data.kompetenzenIds || [],
        fileRouge: data.fileRouge,
        unterlagen: data.unterlagen,
        lektionsplanung: data.lektionsplanung,
        startdatum: data.startdatum,
        uebersichtPICTS: data.uebersichtPICTS,
        pictsBuchen: data.pictsBuchen,
        lastSyncedAt: timestampToDate(data.lastSyncedAt),
        isActive: data.isActive,
      } as SystemTheme;
    });

    // Filter by Stufe if provided
    if (stufe) {
      return themes.filter((theme) => theme.schuljahr.includes(stufe));
    }

    return themes;
  } catch (error) {
    console.error("Error getting system themes:", error);
    return [];
  }
}

/**
 * System Theme nach Airtable ID laden
 */
export async function getSystemThemeByAirtableId(airtableId: string): Promise<SystemTheme | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(SYSTEM_THEMES_COLLECTION).doc(airtableId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      id: doc.id,
      airtableId: data.airtableId,
      thema: data.thema,
      beschreibung: data.beschreibung,
      lehrmittel: data.lehrmittel,
      bildLehrmittel: data.bildLehrmittel,
      anzahlLektionen: data.anzahlLektionen,
      schuljahr: data.schuljahr || [],
      zeitraum: data.zeitraum,
      kompetenzenIds: data.kompetenzenIds || [],
      fileRouge: data.fileRouge,
      unterlagen: data.unterlagen,
      lektionsplanung: data.lektionsplanung,
      startdatum: data.startdatum,
      uebersichtPICTS: data.uebersichtPICTS,
      pictsBuchen: data.pictsBuchen,
      lastSyncedAt: timestampToDate(data.lastSyncedAt),
      isActive: data.isActive,
    } as SystemTheme;
  } catch (error) {
    console.error("Error getting system theme by airtable id:", error);
    return null;
  }
}

/**
 * System Themes als inaktiv markieren (Soft Delete)
 */
export async function deactivateSystemThemes(airtableIds: string[]): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    airtableIds.forEach((airtableId) => {
      const docRef = adminDb.collection(SYSTEM_THEMES_COLLECTION).doc(airtableId);
      batch.update(docRef, {
        isActive: false,
        lastSyncedAt: new Date(),
      });
    });

    await batch.commit();
    return airtableIds.length;
  } catch (error) {
    console.error("Error deactivating system themes:", error);
    throw error;
  }
}

// ============================================
// System Schulen
// ============================================

/**
 * Batch-Update/Insert System Schulen
 */
export async function upsertSystemSchulen(schulen: Omit<SystemSchule, "id">[]): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    schulen.forEach((schule) => {
      const docRef = adminDb.collection(SYSTEM_SCHULEN_COLLECTION).doc(schule.airtableId);
      const cleanedSchule = removeUndefined({
        ...schule,
        lastSyncedAt: new Date(),
      });
      batch.set(docRef, cleanedSchule, { merge: true });
    });

    await batch.commit();
    return schulen.length;
  } catch (error) {
    console.error("Error upserting system schulen:", error);
    throw error;
  }
}

/**
 * Alle aktiven System Schulen laden
 */
export async function getSystemSchulen(): Promise<SystemSchule[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(SYSTEM_SCHULEN_COLLECTION)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        airtableId: data.airtableId,
        name: data.name,
        ort: data.ort,
        pictsBuchen: data.pictsBuchen,
        lastSyncedAt: timestampToDate(data.lastSyncedAt),
        isActive: data.isActive,
      } as SystemSchule;
    });
  } catch (error) {
    console.error("Error getting system schulen:", error);
    return [];
  }
}

/**
 * System Schule nach Airtable ID laden
 */
export async function getSystemSchuleByAirtableId(airtableId: string): Promise<SystemSchule | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(SYSTEM_SCHULEN_COLLECTION).doc(airtableId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      id: doc.id,
      airtableId: data.airtableId,
      name: data.name,
      ort: data.ort,
      pictsBuchen: data.pictsBuchen,
      lastSyncedAt: timestampToDate(data.lastSyncedAt),
      isActive: data.isActive,
    } as SystemSchule;
  } catch (error) {
    console.error("Error getting system schule by airtable id:", error);
    return null;
  }
}

/**
 * System Schulen als inaktiv markieren
 */
export async function deactivateSystemSchulen(airtableIds: string[]): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    airtableIds.forEach((airtableId) => {
      const docRef = adminDb.collection(SYSTEM_SCHULEN_COLLECTION).doc(airtableId);
      batch.update(docRef, {
        isActive: false,
        lastSyncedAt: new Date(),
      });
    });

    await batch.commit();
    return airtableIds.length;
  } catch (error) {
    console.error("Error deactivating system schulen:", error);
    throw error;
  }
}

// ============================================
// System Kompetenzen
// ============================================

/**
 * Batch-Update/Insert System Kompetenzen
 */
export async function upsertSystemKompetenzen(kompetenzen: Omit<SystemKompetenz, "id">[]): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    kompetenzen.forEach((kompetenz) => {
      const docRef = adminDb.collection(SYSTEM_KOMPETENZEN_COLLECTION).doc(kompetenz.airtableId);
      const cleanedKompetenz = removeUndefined({
        ...kompetenz,
        lastSyncedAt: new Date(),
      });
      batch.set(docRef, cleanedKompetenz, { merge: true });
    });

    await batch.commit();
    return kompetenzen.length;
  } catch (error) {
    console.error("Error upserting system kompetenzen:", error);
    throw error;
  }
}

/**
 * System Kompetenzen nach IDs laden
 */
export async function getSystemKompetenzenByIds(airtableIds: string[]): Promise<Map<string, SystemKompetenz>> {
  if (!airtableIds || airtableIds.length === 0) {
    return new Map();
  }

  try {
    const adminDb = getAdminDb();
    const kompetenzenMap = new Map<string, SystemKompetenz>();

    // Firestore 'in' queries sind limitiert auf 10 IDs
    for (let i = 0; i < airtableIds.length; i += 10) {
      const batch = airtableIds.slice(i, i + 10);
      const snapshot = await adminDb
        .collection(SYSTEM_KOMPETENZEN_COLLECTION)
        .where("airtableId", "in", batch)
        .where("isActive", "==", true)
        .get();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        kompetenzenMap.set(data.airtableId, {
          id: doc.id,
          airtableId: data.airtableId,
          name: data.name,
          lpCode: data.lpCode,
          kompetenzbereich: data.kompetenzbereich,
          kompetenz: data.kompetenz,
          kompetenzstufe: data.kompetenzstufe,
          zyklus: data.zyklus,
          klassenstufe: data.klassenstufe,
          grundanspruch: data.grundanspruch,
          querverweisLP: data.querverweisLP,
          unterrichtsideenIds: data.unterrichtsideenIds || [],
          lastSyncedAt: timestampToDate(data.lastSyncedAt),
          isActive: data.isActive,
        } as SystemKompetenz);
      });
    }

    return kompetenzenMap;
  } catch (error) {
    console.error("Error getting system kompetenzen by ids:", error);
    return new Map();
  }
}

/**
 * Alle aktiven System Kompetenzen laden
 */
export async function getSystemKompetenzen(): Promise<SystemKompetenz[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(SYSTEM_KOMPETENZEN_COLLECTION)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        airtableId: data.airtableId,
        name: data.name,
        lpCode: data.lpCode,
        kompetenzbereich: data.kompetenzbereich,
        kompetenz: data.kompetenz,
        kompetenzstufe: data.kompetenzstufe,
        zyklus: data.zyklus,
        klassenstufe: data.klassenstufe,
        grundanspruch: data.grundanspruch,
        querverweisLP: data.querverweisLP,
        unterrichtsideenIds: data.unterrichtsideenIds || [],
        lastSyncedAt: timestampToDate(data.lastSyncedAt),
        isActive: data.isActive,
      } as SystemKompetenz;
    });
  } catch (error) {
    console.error("Error getting system kompetenzen:", error);
    return [];
  }
}

/**
 * System Kompetenzen als inaktiv markieren
 */
export async function deactivateSystemKompetenzen(airtableIds: string[]): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    airtableIds.forEach((airtableId) => {
      const docRef = adminDb.collection(SYSTEM_KOMPETENZEN_COLLECTION).doc(airtableId);
      batch.update(docRef, {
        isActive: false,
        lastSyncedAt: new Date(),
      });
    });

    await batch.commit();
    return airtableIds.length;
  } catch (error) {
    console.error("Error deactivating system kompetenzen:", error);
    throw error;
  }
}

// ============================================
// System Lektionen
// ============================================

/**
 * Batch-Update/Insert System Lektionen
 */
export async function upsertSystemLektionen(lektionen: Omit<SystemLektion, "id">[]): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    lektionen.forEach((lektion) => {
      const docRef = adminDb.collection(SYSTEM_LEKTIONEN_COLLECTION).doc(lektion.airtableId);
      const cleanedLektion = removeUndefined({
        ...lektion,
        lastSyncedAt: new Date(),
      });
      batch.set(docRef, cleanedLektion, { merge: true });
    });

    await batch.commit();
    return lektionen.length;
  } catch (error) {
    console.error("Error upserting system lektionen:", error);
    throw error;
  }
}

/**
 * System Lektionen nach Thema-Name laden
 */
export async function getSystemLektionenByThemaName(themaName: string): Promise<SystemLektion[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(SYSTEM_LEKTIONEN_COLLECTION)
      .where("themaName", "==", themaName)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        airtableId: data.airtableId,
        eindeutigeBezeichnung: data.eindeutigeBezeichnung,
        lektion: data.lektion,
        themaId: data.themaId,
        themaName: data.themaName,
        aufgaben: data.aufgaben,
        vorwissen: data.vorwissen,
        material: data.material,
        websiteTools: data.websiteTools,
        einstieg: data.einstieg,
        hauptteil: data.hauptteil,
        abschluss: data.abschluss,
        stolpersteine: data.stolpersteine,
        kiZusammenfassung: data.kiZusammenfassung,
        lastSyncedAt: timestampToDate(data.lastSyncedAt),
        isActive: data.isActive,
      } as SystemLektion;
    });
  } catch (error) {
    console.error("Error getting system lektionen by thema name:", error);
    return [];
  }
}

/**
 * System Lektionen nach Thema-ID laden
 */
export async function getSystemLektionenByThemaId(themaId: string): Promise<SystemLektion[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(SYSTEM_LEKTIONEN_COLLECTION)
      .where("themaId", "==", themaId)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        airtableId: data.airtableId,
        eindeutigeBezeichnung: data.eindeutigeBezeichnung,
        lektion: data.lektion,
        themaId: data.themaId,
        themaName: data.themaName,
        aufgaben: data.aufgaben,
        vorwissen: data.vorwissen,
        material: data.material,
        websiteTools: data.websiteTools,
        einstieg: data.einstieg,
        hauptteil: data.hauptteil,
        abschluss: data.abschluss,
        stolpersteine: data.stolpersteine,
        kiZusammenfassung: data.kiZusammenfassung,
        lastSyncedAt: timestampToDate(data.lastSyncedAt),
        isActive: data.isActive,
      } as SystemLektion;
    });
  } catch (error) {
    console.error("Error getting system lektionen by thema id:", error);
    return [];
  }
}

/**
 * System Lektionen als inaktiv markieren
 */
export async function deactivateSystemLektionen(airtableIds: string[]): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    airtableIds.forEach((airtableId) => {
      const docRef = adminDb.collection(SYSTEM_LEKTIONEN_COLLECTION).doc(airtableId);
      batch.update(docRef, {
        isActive: false,
        lastSyncedAt: new Date(),
      });
    });

    await batch.commit();
    return airtableIds.length;
  } catch (error) {
    console.error("Error deactivating system lektionen:", error);
    throw error;
  }
}

// ============================================
// Sync Metadata
// ============================================

/**
 * Sync Metadata laden
 */
export async function getSyncMetadata(): Promise<SyncMetadata> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(SYNC_METADATA_COLLECTION).doc("global").get();

    if (!doc.exists) {
      // Default Metadata wenn noch kein Sync durchgeführt wurde
      return {
        syncStatus: "idle",
        recordCounts: {
          themes: 0,
          schulen: 0,
          kompetenzen: 0,
          lektionen: 0,
        },
      };
    }

    const data = doc.data()!;
    return {
      lastFullSync: data.lastFullSync ? timestampToDate(data.lastFullSync) : undefined,
      lastIncrementalSync: data.lastIncrementalSync ? timestampToDate(data.lastIncrementalSync) : undefined,
      syncStatus: data.syncStatus || "idle",
      errorMessage: data.errorMessage,
      recordCounts: data.recordCounts || {
        themes: 0,
        schulen: 0,
        kompetenzen: 0,
        lektionen: 0,
      },
      lastSyncDuration: data.lastSyncDuration,
    };
  } catch (error) {
    console.error("Error getting sync metadata:", error);
    return {
      syncStatus: "error",
      errorMessage: "Failed to load sync metadata",
      recordCounts: {
        themes: 0,
        schulen: 0,
        kompetenzen: 0,
        lektionen: 0,
      },
    };
  }
}

/**
 * Entfernt alle undefined Felder aus einem Objekt
 * Firestore akzeptiert keine undefined Werte
 */
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
}

/**
 * Sync Metadata aktualisieren
 */
export async function updateSyncMetadata(metadata: Partial<SyncMetadata>): Promise<void> {
  try {
    const adminDb = getAdminDb();
    const cleanedMetadata = removeUndefined(metadata);
    await adminDb.collection(SYNC_METADATA_COLLECTION).doc("global").set(cleanedMetadata, { merge: true });
  } catch (error) {
    console.error("Error updating sync metadata:", error);
    throw error;
  }
}

// ============================================
// Sync Logs
// ============================================

/**
 * Sync Log erstellen
 */
export async function createSyncLog(log: Omit<SyncLog, "id">): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const cleanedLog = removeUndefined({
      ...log,
      timestamp: new Date(),
    });
    const docRef = await adminDb.collection(SYNC_LOGS_COLLECTION).add(cleanedLog);
    return docRef.id;
  } catch (error) {
    console.error("Error creating sync log:", error);
    throw error;
  }
}

/**
 * Letzte N Sync Logs laden
 */
export async function getRecentSyncLogs(limit: number = 10): Promise<SyncLog[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(SYNC_LOGS_COLLECTION)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: timestampToDate(data.timestamp),
        type: data.type,
        status: data.status,
        duration: data.duration,
        recordsProcessed: data.recordsProcessed,
        errors: data.errors,
        triggeredBy: data.triggeredBy,
      } as SyncLog;
    });
  } catch (error) {
    console.error("Error getting recent sync logs:", error);
    return [];
  }
}

/**
 * Sync Logs älter als N Tage löschen
 */
export async function cleanupOldSyncLogs(daysToKeep: number = 30): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const snapshot = await adminDb
      .collection(SYNC_LOGS_COLLECTION)
      .where("timestamp", "<", cutoffDate)
      .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  } catch (error) {
    console.error("Error cleaning up old sync logs:", error);
    return 0;
  }
}
