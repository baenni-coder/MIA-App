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
const LP21_STRUKTUR_COLLECTION = "lp21_struktur";
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
        empfohleneIntegrationsfaecher: data.empfohleneIntegrationsfaecher,
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
      empfohleneIntegrationsfaecher: data.empfohleneIntegrationsfaecher,
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
          lp21Uid: data.lp21Uid,
          source: data.source,
          name: data.name,
          lpCode: data.lpCode,
          kompetenzbereich: data.kompetenzbereich,
          kompetenz: data.kompetenz,
          kompetenzstufe: data.kompetenzstufe,
          zyklus: data.zyklus,
          klassenstufe: data.klassenstufe,
          grundanspruch: data.grundanspruch,
          orientierungspunkt: data.orientierungspunkt,
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
        lp21Uid: data.lp21Uid,
        source: data.source,
        name: data.name,
        lpCode: data.lpCode,
        kompetenzbereich: data.kompetenzbereich,
        kompetenz: data.kompetenz,
        kompetenzstufe: data.kompetenzstufe,
        zyklus: data.zyklus,
        klassenstufe: data.klassenstufe,
        grundanspruch: data.grundanspruch,
        orientierungspunkt: data.orientierungspunkt,
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
 * Fachbereich-Alias-Mapping (Kanton-spezifische Varianten).
 * z.B. MI (Standard) ↔ IB (Solothurn)
 */
const FACHBEREICH_ALIASES: Record<string, string[]> = {
  "MI": ["IB"],
  "IB": ["MI"],
};

/**
 * Sub-Fachbereiche die aus einem direkt gesyncten Fachbereich herausgefiltert werden müssen.
 * z.B. "D" wurde direkt gesynct und enthält auch DaZ Kompetenzbereiche.
 */
const FACHBEREICH_EXCLUDES: Record<string, string[]> = {
  "D": ["DaZ"],
};

/**
 * System Kompetenzen nach Fachbereich-Prefix laden (z.B. "D", "MI", "IB")
 * Filtert nach lpCode-Prefix (z.B. "D." für Deutsch)
 * Unterstützt Aliase: MI findet auch IB-Kompetenzen und umgekehrt.
 */
export async function getSystemKompetenzenByFachbereich(fachbereichCode: string): Promise<SystemKompetenz[]> {
  try {
    const alle = await getSystemKompetenzen();

    // Build all prefixes: original + FACHBEREICH_ALIASES (MI↔IB) + CODE_ALIASES (TTG↔TG)
    const prefixes = getCodePrefixes(fachbereichCode);
    const fachAliases = FACHBEREICH_ALIASES[fachbereichCode];
    if (fachAliases) {
      for (const alias of fachAliases) {
        for (const p of getCodePrefixes(alias)) {
          if (!prefixes.includes(p)) prefixes.push(p);
        }
      }
    }

    // Filter by any matching prefix, exclude sub-fachbereiche
    const excludes = FACHBEREICH_EXCLUDES[fachbereichCode] || [];
    return alle.filter((k) => {
      if (!k.lpCode) return false;
      const matchesPrefix = prefixes.some((p) => k.lpCode!.startsWith(p));
      if (!matchesPrefix) return false;
      return !excludes.some((ex) => k.lpCode!.startsWith(ex + "."));
    });
  } catch (error) {
    console.error("Error getting system kompetenzen by fachbereich:", error);
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
 * Alle aktiven System Lektionen laden (für Bulk-Sync)
 */
export async function getAllSystemLektionen(): Promise<SystemLektion[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(SYSTEM_LEKTIONEN_COLLECTION)
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
    console.error("Error getting all system lektionen:", error);
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

// ============================================
// LP21 Fachbereich-Struktur (Kompetenzbereiche + Kompetenzen)
// ============================================

/** Struktur eines LP21-Fachbereichs wie von der API gesynct */
export interface LP21StrukturKompetenz {
  uid: string;
  code: string;
  bezeichnung: string;
  kompetenzstufen: number; // Anzahl Kompetenzstufen
}

export interface LP21StrukturKompetenzbereich {
  uid: string;
  code: string;
  bezeichnung: string;
  kompetenzen: LP21StrukturKompetenz[];
}

export interface LP21FachbereichStruktur {
  fachbereichCode: string;
  fachbereichName: string;
  kanton: string;
  kompetenzbereiche: LP21StrukturKompetenzbereich[];
  lastSyncedAt: Date;
}

/**
 * LP21 Fachbereich-Struktur speichern (Kompetenzbereiche + Kompetenzen)
 * Wird während LP21 Sync automatisch gespeichert.
 * Dokument-ID = fachbereichCode (z.B. "D", "IB", "MA")
 */
export async function upsertLP21Struktur(struktur: LP21FachbereichStruktur): Promise<void> {
  try {
    const adminDb = getAdminDb();
    // Trimme den Code und verwende ihn als Doc-ID
    const cleanCode = struktur.fachbereichCode.trim();
    await adminDb.collection(LP21_STRUKTUR_COLLECTION).doc(cleanCode).set({
      ...struktur,
      fachbereichCode: cleanCode,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ LP21 Struktur gespeichert: doc='${cleanCode}', fachbereichCode='${struktur.fachbereichCode}' (${struktur.kompetenzbereiche.length} Kompetenzbereiche)`);
  } catch (error) {
    console.error("Error saving LP21 Struktur:", error);
    throw error;
  }
}

/**
 * Sub-Fachbereich Mapping: Codes die aus Umbrella-Kategorien extrahiert werden.
 * SPR (Sprachen) enthält D, DaZ, FS1F, FS2E, FS3I
 * GES (Gestalten) enthält BG, TG (in LP21 API als "TG", in der App als "TTG")
 */
const SUB_FACHBEREICH_MAP: Record<string, { umbrella: string; name: string }> = {
  "D": { umbrella: "SPR", name: "Deutsch" },
  "DaZ": { umbrella: "SPR", name: "Deutsch als Zweitsprache" },
  "FS1F": { umbrella: "SPR", name: "Französisch (1. Fremdsprache)" },
  "FS2E": { umbrella: "SPR", name: "Englisch (2. Fremdsprache)" },
  "FS3I": { umbrella: "SPR", name: "Italienisch (3. Fremdsprache)" },
  "BG": { umbrella: "GES", name: "Bildnerisches Gestalten" },
  "TTG": { umbrella: "GES", name: "Textiles und Technisches Gestalten" },
  "TG": { umbrella: "GES", name: "Textiles und Technisches Gestalten" },
};

/**
 * Code-Aliase: Verschiedene Codes für denselben Fachbereich.
 * TTG ↔ TG: Die App verwendet "TTG", die LP21-API verwendet "TG".
 */
const CODE_ALIASES: Record<string, string[]> = {
  "TTG": ["TG"],
  "TG": ["TTG"],
};

/**
 * Gibt alle Prefixes zurück, die für einen Fachbereich-Code gelten.
 * Berücksichtigt Code-Aliase (z.B. TTG → ["TTG.", "TG."])
 */
function getCodePrefixes(fachbereichCode: string): string[] {
  const prefixes = [fachbereichCode + "."];
  const aliases = CODE_ALIASES[fachbereichCode];
  if (aliases) {
    for (const alias of aliases) {
      prefixes.push(alias + ".");
    }
  }
  return prefixes;
}

/**
 * Filtert Kompetenzbereiche für einen Fachbereich-Code.
 * Berücksichtigt Code-Aliase (TTG ↔ TG) und entfernt Sub-Fachbereiche (z.B. DaZ aus D).
 */
function filterKompetenzbereiche(
  kbs: LP21StrukturKompetenzbereich[],
  fachbereichCode: string
): LP21StrukturKompetenzbereich[] {
  const prefixes = getCodePrefixes(fachbereichCode);
  const excludes = FACHBEREICH_EXCLUDES[fachbereichCode] || [];

  return kbs.filter((kb) => {
    const matchesPrefix = prefixes.some((p) => kb.code.startsWith(p));
    if (!matchesPrefix) return false;
    // Exclude sub-fachbereiche (e.g., DaZ from D)
    return !excludes.some((ex) => kb.code.startsWith(ex + "."));
  });
}

/**
 * LP21 Fachbereich-Struktur laden.
 *
 * Suche-Strategie:
 * 1. Exakte Doc-ID + Alias (MI ↔ IB)
 * 2. Sub-Fachbereich-Extraktion aus Umbrella-Kategorien (SPR, GES)
 * 3. Prefix-Match als letzter Fallback
 *
 * Bei direkt geladenen Dokumenten werden Sub-Fachbereich-Codes gefiltert
 * (z.B. DaZ wird aus dem D-Dokument herausgefiltert).
 */
export async function getLP21Struktur(fachbereichCode: string): Promise<LP21FachbereichStruktur | null> {
  try {
    const adminDb = getAdminDb();

    // Codes to try: original + aliases (MI ↔ IB)
    const codesToTry = [fachbereichCode, ...(FACHBEREICH_ALIASES[fachbereichCode] || [])];

    // 1. Exakte Doc-ID (inkl. Aliase)
    for (const code of codesToTry) {
      const doc = await adminDb.collection(LP21_STRUKTUR_COLLECTION).doc(code).get();
      if (doc.exists) {
        const data = doc.data()!;
        let kbs: LP21StrukturKompetenzbereich[] = data.kompetenzbereiche || [];

        // Filter: Nur Kompetenzbereiche die zum gewünschten Code passen
        // z.B. D-Dok enthält auch DaZ → DaZ herausfiltern
        const excludes = FACHBEREICH_EXCLUDES[fachbereichCode] || [];
        if (excludes.length > 0) {
          kbs = kbs.filter((kb) =>
            !excludes.some((ex) => kb.code.startsWith(ex + "."))
          );
        }

        if (kbs.length > 0) {
          return {
            fachbereichCode,
            fachbereichName: data.fachbereichName,
            kanton: data.kanton,
            kompetenzbereiche: kbs,
            lastSyncedAt: timestampToDate(data.lastSyncedAt),
          };
        }
        // Doc found but empty after filtering → continue to other strategies
      }
    }

    // 2. Sub-Fachbereich-Extraktion aus Umbrella-Kategorien
    const subInfo = SUB_FACHBEREICH_MAP[fachbereichCode];
    if (subInfo) {
      const umbrellaDoc = await adminDb.collection(LP21_STRUKTUR_COLLECTION).doc(subInfo.umbrella).get();
      if (umbrellaDoc.exists) {
        const data = umbrellaDoc.data()!;
        const filteredKB = filterKompetenzbereiche(
          data.kompetenzbereiche || [],
          fachbereichCode
        );
        if (filteredKB.length > 0) {
          console.log(`LP21 Struktur: Sub-Fachbereich '${fachbereichCode}' aus Umbrella '${subInfo.umbrella}' extrahiert (${filteredKB.length} Kompetenzbereiche)`);
          return {
            fachbereichCode,
            fachbereichName: subInfo.name,
            kanton: data.kanton,
            kompetenzbereiche: filteredKB,
            lastSyncedAt: timestampToDate(data.lastSyncedAt),
          };
        }
      }
    }

    // 3. Fallback: Prefix-Match in allen Dokumenten
    const allDocs = await adminDb.collection(LP21_STRUKTUR_COLLECTION).get();
    for (const d of allDocs.docs) {
      const data = d.data();
      const storedCode = data.fachbereichCode || d.id;
      // Skip umbrella categories that should be expanded
      if (["SPR", "GES"].includes(storedCode)) continue;

      if (storedCode.startsWith(fachbereichCode) || fachbereichCode.startsWith(storedCode)) {
        const kbs = data.kompetenzbereiche || [];
        if (kbs.length > 0) {
          console.log(`LP21 Struktur: Prefix-Match '${fachbereichCode}' → '${storedCode}' (doc: ${d.id})`);
          return {
            fachbereichCode: data.fachbereichCode,
            fachbereichName: data.fachbereichName,
            kanton: data.kanton,
            kompetenzbereiche: kbs,
            lastSyncedAt: timestampToDate(data.lastSyncedAt),
          };
        }
      }
    }

    // 4. Fallback: Suche in ALLEN Dokumenten nach passenden Kompetenzbereichen
    // Berücksichtigt Code-Aliase (z.B. TTG ↔ TG)
    const searchPrefixes = getCodePrefixes(fachbereichCode);
    for (const d of allDocs.docs) {
      const data = d.data();
      const kbs: LP21StrukturKompetenzbereich[] = data.kompetenzbereiche || [];
      const matching = kbs.filter((kb) => searchPrefixes.some((p) => kb.code.startsWith(p)));
      if (matching.length > 0) {
        const subName = SUB_FACHBEREICH_MAP[fachbereichCode]?.name || fachbereichCode;
        console.log(`LP21 Struktur: '${fachbereichCode}' in doc '${d.id}' gefunden (${matching.length} KBs, prefixes: ${searchPrefixes.join(", ")})`);
        return {
          fachbereichCode,
          fachbereichName: subName,
          kanton: data.kanton,
          kompetenzbereiche: matching,
          lastSyncedAt: timestampToDate(data.lastSyncedAt),
        };
      }
    }

    // Nicht gefunden
    const availableCodes = allDocs.docs.map((d) => d.id);
    console.log(`LP21 Struktur nicht gefunden: '${fachbereichCode}'. Verfügbar: ${availableCodes.join(", ") || "(leer)"}`);
    return null;
  } catch (error) {
    console.error("Error getting LP21 Struktur:", error);
    return null;
  }
}

/**
 * Alle LP21 Fachbereich-Strukturen laden.
 * - Umbrella-Kategorien (SPR, GES) werden in Sub-Fachbereiche aufgelöst
 * - DaZ wird von D separiert
 * - Direkt gesynced Dokumente (D, TTG etc.) werden mit Umbrella-Daten ergänzt
 */
export async function getAllLP21Strukturen(): Promise<LP21FachbereichStruktur[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection(LP21_STRUKTUR_COLLECTION).get();

    // Umbrella → Sub-Fachbereiche Mapping
    const UMBRELLA_EXPAND: Record<string, { prefix: string; name: string }[]> = {
      "SPR": [
        { prefix: "D", name: "Deutsch" },
        { prefix: "DaZ", name: "Deutsch als Zweitsprache" },
        { prefix: "FS1F", name: "Französisch (1. Fremdsprache)" },
        { prefix: "FS2E", name: "Englisch (2. Fremdsprache)" },
        { prefix: "FS3I", name: "Italienisch (3. Fremdsprache)" },
      ],
      "GES": [
        { prefix: "BG", name: "Bildnerisches Gestalten" },
        { prefix: "TTG", name: "Textiles und Technisches Gestalten" },
      ],
    };

    // Directly synced fachbereiche that need sub-FB filtering
    const DIRECT_FACHBEREICH_SUBS: Record<string, string[]> = {
      "D": ["DaZ"],  // D doc may contain DaZ KBs
    };

    const result = new Map<string, LP21FachbereichStruktur>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const code = data.fachbereichCode || doc.id;
      const kbs: LP21StrukturKompetenzbereich[] = data.kompetenzbereiche || [];

      const expandConfig = UMBRELLA_EXPAND[code];
      if (expandConfig) {
        // Expand umbrella into sub-fachbereiche
        for (const sub of expandConfig) {
          // Use code aliases to find KBs (e.g., TTG ↔ TG)
          const prefixes = getCodePrefixes(sub.prefix);
          const filteredKB = kbs.filter((kb) => prefixes.some((p) => kb.code.startsWith(p)));
          if (filteredKB.length > 0 && !result.has(sub.prefix)) {
            result.set(sub.prefix, {
              fachbereichCode: sub.prefix,
              fachbereichName: sub.name,
              kanton: data.kanton,
              kompetenzbereiche: filteredKB,
              lastSyncedAt: timestampToDate(data.lastSyncedAt),
            });
          }
        }
      } else {
        // Direct fachbereich - filter out sub-fachbereiche
        const subsToExclude = DIRECT_FACHBEREICH_SUBS[code] || [];
        let filteredKBs = kbs;
        const extractedSubs: { subCode: string; subName: string; subKBs: LP21StrukturKompetenzbereich[] }[] = [];

        if (subsToExclude.length > 0) {
          filteredKBs = kbs.filter((kb) =>
            !subsToExclude.some((ex) => kb.code.startsWith(ex + "."))
          );
          // Extract sub-fachbereiche as separate entries
          for (const subCode of subsToExclude) {
            const subKBs = kbs.filter((kb) => kb.code.startsWith(subCode + "."));
            if (subKBs.length > 0) {
              const subMapEntry = SUB_FACHBEREICH_MAP[subCode];
              extractedSubs.push({
                subCode,
                subName: subMapEntry?.name || subCode,
                subKBs,
              });
            }
          }
        }

        if (filteredKBs.length > 0 && !result.has(code)) {
          result.set(code, {
            fachbereichCode: code,
            fachbereichName: data.fachbereichName,
            kanton: data.kanton,
            kompetenzbereiche: filteredKBs,
            lastSyncedAt: timestampToDate(data.lastSyncedAt),
          });
        }

        // Add extracted sub-fachbereiche
        for (const sub of extractedSubs) {
          if (!result.has(sub.subCode)) {
            result.set(sub.subCode, {
              fachbereichCode: sub.subCode,
              fachbereichName: sub.subName,
              kanton: data.kanton,
              kompetenzbereiche: sub.subKBs,
              lastSyncedAt: timestampToDate(data.lastSyncedAt),
            });
          }
        }
      }
    }

    return Array.from(result.values());
  } catch (error) {
    console.error("Error getting all LP21 Strukturen:", error);
    return [];
  }
}

/**
 * Zählt Anwendungskompetenzen in system_kompetenzen (für MI/IB Ergänzung).
 * Diese kommen typischerweise aus Airtable und haben kompetenzbereich="Anwendungskompetenzen".
 */
export async function countAnwendungskompetenzen(): Promise<{ count: number; kompetenzen: { code: string; bezeichnung: string }[] }> {
  try {
    const alle = await getSystemKompetenzen();
    const anwendung = alle.filter((k) => k.kompetenzbereich === "Anwendungskompetenzen");

    // Gruppiere nach Kompetenz-Code (z.B. MI.1.3 → Kompetenzstufen MI.1.3.a, MI.1.3.b)
    const kompetenzCodes = new Map<string, string>();
    for (const k of anwendung) {
      if (!k.lpCode) continue;
      // Extract Kompetenz code: take first 3 dot-separated parts
      const parts = k.lpCode.split(".");
      const kompetenzCode = parts.slice(0, Math.min(3, parts.length)).join(".");
      if (!kompetenzCodes.has(kompetenzCode)) {
        kompetenzCodes.set(kompetenzCode, k.kompetenzstufe || k.name || kompetenzCode);
      }
    }

    return {
      count: anwendung.length,
      kompetenzen: Array.from(kompetenzCodes.entries()).map(([code, bezeichnung]) => ({
        code,
        bezeichnung,
      })),
    };
  } catch {
    return { count: 0, kompetenzen: [] };
  }
}
