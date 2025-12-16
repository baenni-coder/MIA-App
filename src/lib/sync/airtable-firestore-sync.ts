import { getAllThemen } from "@/lib/airtable/themen";
import { getAllSchulen } from "@/lib/airtable/schulen";
import { getKompetenzenByIds } from "@/lib/airtable/kompetenzen";
import { getLektionsplanungByThemaName } from "@/lib/airtable/lektionsplanung";
import {
  upsertSystemThemes,
  upsertSystemSchulen,
  upsertSystemKompetenzen,
  upsertSystemLektionen,
  getSystemThemes,
  getSystemSchulen,
  getSystemKompetenzen,
  getSystemLektionenByThemaName,
  deactivateSystemThemes,
  deactivateSystemSchulen,
  deactivateSystemKompetenzen,
  deactivateSystemLektionen,
  updateSyncMetadata,
  createSyncLog,
} from "@/lib/firestore/system-cache";
import { SystemTheme, SystemSchule, SystemKompetenz, SystemLektion } from "@/types";

/**
 * Sync Result Interface
 */
export interface SyncResult {
  success: boolean;
  duration: number;
  recordsProcessed: {
    themes: { added: number; updated: number; deleted: number };
    schulen: { added: number; updated: number; deleted: number };
    kompetenzen: { added: number; updated: number; deleted: number };
    lektionen: { added: number; updated: number; deleted: number };
  };
  errors: string[];
}

/**
 * Hauptfunktion: Vollständiger Sync von Airtable zu Firestore
 */
export async function syncAirtableToFirestore(triggeredBy?: string): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: true,
    duration: 0,
    recordsProcessed: {
      themes: { added: 0, updated: 0, deleted: 0 },
      schulen: { added: 0, updated: 0, deleted: 0 },
      kompetenzen: { added: 0, updated: 0, deleted: 0 },
      lektionen: { added: 0, updated: 0, deleted: 0 },
    },
    errors: [],
  };

  try {
    // Update Sync Status zu "syncing"
    await updateSyncMetadata({
      syncStatus: "syncing",
      errorMessage: undefined,
    });

    console.log("🔄 Starting Airtable → Firestore sync...");

    // 1. Sync Schulen (zuerst, da andere darauf referenzieren könnten)
    console.log("📚 Syncing Schulen...");
    const schulenResult = await syncSchulen();
    result.recordsProcessed.schulen = schulenResult;
    if (schulenResult.errors) {
      result.errors.push(...schulenResult.errors);
    }

    // 2. Sync Themen
    console.log("📖 Syncing Themen...");
    const themenResult = await syncThemen();
    result.recordsProcessed.themes = themenResult;
    if (themenResult.errors) {
      result.errors.push(...themenResult.errors);
    }

    // 3. Sync Kompetenzen (benötigt für Themen-Details)
    console.log("🎯 Syncing Kompetenzen...");
    const kompetenzenResult = await syncKompetenzen();
    result.recordsProcessed.kompetenzen = kompetenzenResult;
    if (kompetenzenResult.errors) {
      result.errors.push(...kompetenzenResult.errors);
    }

    // 4. Sync Lektionen (benötigt Themen)
    console.log("📝 Syncing Lektionen...");
    const lektionenResult = await syncLektionen();
    result.recordsProcessed.lektionen = lektionenResult;
    if (lektionenResult.errors) {
      result.errors.push(...lektionenResult.errors);
    }

    // Berechne Gesamtdauer
    result.duration = Date.now() - startTime;
    result.success = result.errors.length === 0;

    // Update Sync Metadata
    await updateSyncMetadata({
      lastFullSync: new Date(),
      syncStatus: result.success ? "success" : "error",
      errorMessage: result.errors.length > 0 ? result.errors.join("; ") : undefined,
      recordCounts: {
        themes: themenResult.added + themenResult.updated,
        schulen: schulenResult.added + schulenResult.updated,
        kompetenzen: kompetenzenResult.added + kompetenzenResult.updated,
        lektionen: lektionenResult.added + lektionenResult.updated,
      },
      lastSyncDuration: result.duration,
    });

    // Erstelle Sync Log
    await createSyncLog({
      timestamp: new Date(),
      type: triggeredBy ? "manual_sync" : "full_sync",
      status: result.success ? "success" : "error",
      duration: result.duration,
      recordsProcessed: result.recordsProcessed,
      errors: result.errors.length > 0 ? result.errors : undefined,
      triggeredBy,
    });

    console.log(`✅ Sync completed in ${result.duration}ms`);
    console.log(`   Themes: +${result.recordsProcessed.themes.added} ~${result.recordsProcessed.themes.updated} -${result.recordsProcessed.themes.deleted}`);
    console.log(`   Schulen: +${result.recordsProcessed.schulen.added} ~${result.recordsProcessed.schulen.updated} -${result.recordsProcessed.schulen.deleted}`);
    console.log(`   Kompetenzen: +${result.recordsProcessed.kompetenzen.added} ~${result.recordsProcessed.kompetenzen.updated} -${result.recordsProcessed.kompetenzen.deleted}`);
    console.log(`   Lektionen: +${result.recordsProcessed.lektionen.added} ~${result.recordsProcessed.lektionen.updated} -${result.recordsProcessed.lektionen.deleted}`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    result.success = false;
    result.errors.push(errorMessage);
    result.duration = Date.now() - startTime;

    console.error("❌ Sync failed:", errorMessage);

    // Update Sync Metadata mit Error
    await updateSyncMetadata({
      syncStatus: "error",
      errorMessage,
    });

    // Erstelle Error Log
    await createSyncLog({
      timestamp: new Date(),
      type: triggeredBy ? "manual_sync" : "full_sync",
      status: "error",
      duration: result.duration,
      recordsProcessed: result.recordsProcessed,
      errors: result.errors,
      triggeredBy,
    });

    return result;
  }
}

/**
 * Sync Schulen
 */
async function syncSchulen(): Promise<{ added: number; updated: number; deleted: number; errors?: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let deleted = 0;

  try {
    // 1. Lade alle Schulen aus Airtable
    const airtableSchulen = await getAllSchulen();
    const airtableIds = new Set(airtableSchulen.map((s) => s.id));

    // 2. Lade alle Schulen aus Firestore
    const firestoreSchulen = await getSystemSchulen();
    const firestoreIds = new Set(firestoreSchulen.map((s) => s.airtableId));

    // 3. Identifiziere neue und zu aktualisierende Schulen
    const toUpsert: Omit<SystemSchule, "id">[] = airtableSchulen.map((schule) => {
      const isNew = !firestoreIds.has(schule.id);
      if (isNew) {
        added++;
      } else {
        updated++;
      }

      return {
        airtableId: schule.id,
        name: schule.name,
        ort: schule.ort,
        pictsBuchen: schule.pictsBuchen,
        isActive: true,
        lastSyncedAt: new Date(),
      };
    });

    // 4. Upsert in Firestore
    if (toUpsert.length > 0) {
      await upsertSystemSchulen(toUpsert);
    }

    // 5. Identifiziere gelöschte Schulen (in Firestore aber nicht in Airtable)
    const toDeactivate = firestoreSchulen
      .filter((s) => !airtableIds.has(s.airtableId))
      .map((s) => s.airtableId);

    if (toDeactivate.length > 0) {
      await deactivateSystemSchulen(toDeactivate);
      deleted = toDeactivate.length;
    }

    return { added, updated, deleted };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error in syncSchulen";
    errors.push(errorMessage);
    console.error("Error syncing Schulen:", error);
    return { added, updated, deleted, errors };
  }
}

/**
 * Sync Themen
 */
async function syncThemen(): Promise<{ added: number; updated: number; deleted: number; errors?: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let deleted = 0;

  try {
    // 1. Lade alle Themen aus Airtable
    const airtableThemen = await getAllThemen();
    const airtableIds = new Set(airtableThemen.map((t) => t.id));

    // 2. Lade alle Themen aus Firestore
    const firestoreThemen = await getSystemThemes();
    const firestoreIds = new Set(firestoreThemen.map((t) => t.airtableId));

    // 3. Identifiziere neue und zu aktualisierende Themen
    const toUpsert: Omit<SystemTheme, "id">[] = airtableThemen.map((thema) => {
      const isNew = !firestoreIds.has(thema.id);
      if (isNew) {
        added++;
      } else {
        updated++;
      }

      return {
        airtableId: thema.id,
        thema: thema.thema,
        beschreibung: thema.beschreibung,
        lehrmittel: thema.lehrmittel,
        bildLehrmittel: thema.bildLehrmittel,
        anzahlLektionen: thema.anzahlLektionen,
        schuljahr: thema.schuljahr,
        zeitraum: thema.zeitraum,
        kompetenzenIds: thema.kompetenzen?.map((k) => k.id) || [],
        fileRouge: thema.fileRouge,
        unterlagen: thema.unterlagen,
        lektionsplanung: thema.lektionsplanung,
        startdatum: thema.startdatum,
        uebersichtPICTS: thema.uebersichtPICTS,
        pictsBuchen: thema.pictsBuchen,
        isActive: true,
        lastSyncedAt: new Date(),
      };
    });

    // 4. Upsert in Firestore (in Batches von 500)
    if (toUpsert.length > 0) {
      for (let i = 0; i < toUpsert.length; i += 500) {
        const batch = toUpsert.slice(i, i + 500);
        await upsertSystemThemes(batch);
      }
    }

    // 5. Identifiziere gelöschte Themen
    const toDeactivate = firestoreThemen
      .filter((t) => !airtableIds.has(t.airtableId))
      .map((t) => t.airtableId);

    if (toDeactivate.length > 0) {
      await deactivateSystemThemes(toDeactivate);
      deleted = toDeactivate.length;
    }

    return { added, updated, deleted };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error in syncThemen";
    errors.push(errorMessage);
    console.error("Error syncing Themen:", error);
    return { added, updated, deleted, errors };
  }
}

/**
 * Sync Kompetenzen
 */
async function syncKompetenzen(): Promise<{ added: number; updated: number; deleted: number; errors?: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let deleted = 0;

  try {
    // 1. Sammle alle Kompetenzen-IDs aus den Themen
    const airtableThemen = await getAllThemen();
    const allKompetenzIds = new Set<string>();

    airtableThemen.forEach((thema) => {
      if (thema.kompetenzen) {
        thema.kompetenzen.forEach((k) => allKompetenzIds.add(k.id));
      }
    });

    if (allKompetenzIds.size === 0) {
      return { added: 0, updated: 0, deleted: 0 };
    }

    // 2. Lade alle Kompetenzen aus Airtable
    const kompetenzenMap = await getKompetenzenByIds(Array.from(allKompetenzIds));
    const airtableIds = new Set(kompetenzenMap.keys());

    // 3. Lade alle Kompetenzen aus Firestore
    const firestoreKompetenzen = await getSystemKompetenzen();
    const firestoreIds = new Set(firestoreKompetenzen.map((k) => k.airtableId));

    // 4. Identifiziere neue und zu aktualisierende Kompetenzen
    const toUpsert: Omit<SystemKompetenz, "id">[] = [];

    kompetenzenMap.forEach((kompetenz) => {
      const isNew = !firestoreIds.has(kompetenz.id);
      if (isNew) {
        added++;
      } else {
        updated++;
      }

      toUpsert.push({
        airtableId: kompetenz.id,
        name: kompetenz.name,
        lpCode: kompetenz.lpCode,
        kompetenzbereich: kompetenz.kompetenzbereich,
        kompetenz: kompetenz.kompetenz,
        kompetenzstufe: kompetenz.kompetenzstufe,
        zyklus: kompetenz.zyklus,
        klassenstufe: kompetenz.klassenstufe,
        grundanspruch: kompetenz.grundanspruch,
        querverweisLP: kompetenz.querverweisLP,
        unterrichtsideenIds: kompetenz.unterrichtsideen?.map((u) => u.id) || [],
        isActive: true,
        lastSyncedAt: new Date(),
      });
    });

    // 5. Upsert in Firestore
    if (toUpsert.length > 0) {
      for (let i = 0; i < toUpsert.length; i += 500) {
        const batch = toUpsert.slice(i, i + 500);
        await upsertSystemKompetenzen(batch);
      }
    }

    // 6. Identifiziere gelöschte Kompetenzen (optional - könnte viele sein)
    // Wir deaktivieren nur Kompetenzen, die nicht mehr in Themen referenziert werden
    const toDeactivate = firestoreKompetenzen
      .filter((k) => !airtableIds.has(k.airtableId))
      .map((k) => k.airtableId);

    if (toDeactivate.length > 0) {
      await deactivateSystemKompetenzen(toDeactivate);
      deleted = toDeactivate.length;
    }

    return { added, updated, deleted };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error in syncKompetenzen";
    errors.push(errorMessage);
    console.error("Error syncing Kompetenzen:", error);
    return { added, updated, deleted, errors };
  }
}

/**
 * Sync Lektionen
 */
async function syncLektionen(): Promise<{ added: number; updated: number; deleted: number; errors?: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let deleted = 0;

  try {
    // 1. Lade alle Themen (um zu wissen, welche Lektionen wir laden müssen)
    const airtableThemen = await getAllThemen();

    const allLektionen: Omit<SystemLektion, "id">[] = [];
    const allAirtableIds = new Set<string>();

    // 2. Für jedes Thema: Lade Lektionen
    for (const thema of airtableThemen) {
      try {
        const lektionen = await getLektionsplanungByThemaName(thema.thema);

        lektionen.forEach((lektion) => {
          allAirtableIds.add(lektion.id);
          allLektionen.push({
            airtableId: lektion.id,
            eindeutigeBezeichnung: lektion.eindeutigeBezeichnung,
            lektion: lektion.lektion,
            themaId: lektion.themaId,
            themaName: lektion.themaName,
            aufgaben: lektion.aufgaben,
            vorwissen: lektion.vorwissen,
            material: lektion.material,
            websiteTools: lektion.websiteTools,
            einstieg: lektion.einstieg,
            hauptteil: lektion.hauptteil,
            abschluss: lektion.abschluss,
            stolpersteine: lektion.stolpersteine,
            kiZusammenfassung: lektion.kiZusammenfassung,
            isActive: true,
            lastSyncedAt: new Date(),
          });
        });
      } catch (error) {
        const errorMessage = `Error loading Lektionen for Thema "${thema.thema}": ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMessage);
        console.warn(errorMessage);
      }
    }

    // 3. Lade alle Lektionen aus Firestore (um Deleted zu identifizieren)
    const firestoreIds = new Set<string>();
    for (const thema of airtableThemen) {
      try {
        const firestoreLektionen = await getSystemLektionenByThemaName(thema.thema);
        firestoreLektionen.forEach((l) => firestoreIds.add(l.airtableId));
      } catch (error) {
        console.warn(`Could not load Firestore Lektionen for ${thema.thema}:`, error);
      }
    }

    // 4. Zähle Neue vs. Updates
    allLektionen.forEach((lektion) => {
      if (!firestoreIds.has(lektion.airtableId)) {
        added++;
      } else {
        updated++;
      }
    });

    // 5. Upsert in Firestore
    if (allLektionen.length > 0) {
      for (let i = 0; i < allLektionen.length; i += 500) {
        const batch = allLektionen.slice(i, i + 500);
        await upsertSystemLektionen(batch);
      }
    }

    // 6. Identifiziere gelöschte Lektionen
    const toDeactivate = Array.from(firestoreIds).filter((id) => !allAirtableIds.has(id));

    if (toDeactivate.length > 0) {
      await deactivateSystemLektionen(toDeactivate);
      deleted = toDeactivate.length;
    }

    return { added, updated, deleted, errors: errors.length > 0 ? errors : undefined };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error in syncLektionen";
    errors.push(errorMessage);
    console.error("Error syncing Lektionen:", error);
    return { added, updated, deleted, errors };
  }
}
