import { getAllThemen } from "@/lib/airtable/themen";
import { getAllSchulen } from "@/lib/airtable/schulen";
import { getAllLektionsplanung } from "@/lib/airtable/lektionsplanung";
import {
  upsertSystemThemes,
  upsertSystemSchulen,
  upsertSystemKompetenzen,
  upsertSystemLektionen,
  getSystemThemes,
  getSystemSchulen,
  getSystemKompetenzen,
  getAllSystemLektionen,
  deactivateSystemThemes,
  deactivateSystemSchulen,
  deactivateSystemKompetenzen,
  deactivateSystemLektionen,
  updateSyncMetadata,
  createSyncLog,
} from "@/lib/firestore/system-cache";
import { downloadAndUploadImage, generateSystemImagePath } from "@/lib/storage/upload";
import { SystemTheme, SystemSchule, SystemKompetenz, SystemLektion, Thema, Schule, Kompetenz } from "@/types";

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
 * Helper: Promise mit Timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Hauptfunktion: Vollständiger Sync von Airtable zu Firestore
 * OPTIMIERT: Parallel Execution + Timeout Handling
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

    // OPTIMIERUNG: Airtable-Daten EINMAL laden (sequentiell, respektiert
    // Rate-Limit von 5 req/sec). Vorher wurde getAllThemen() doppelt
    // aufgerufen (in syncThemen UND syncKompetenzen), was bei vielen
    // Kompetenzen das 8s-Timeout sprengte.
    console.log("📥 Loading source data from Airtable...");
    const sourceLoadStart = Date.now();
    let airtableThemen: Thema[];
    let airtableSchulen: Schule[];
    try {
      [airtableThemen, airtableSchulen] = await withTimeout(
        Promise.all([getAllThemen(), getAllSchulen()]),
        90000, // 90s – grosszügig, da Airtable manchmal langsam ist
        "Airtable load timeout after 90 seconds"
      );
    } catch (loadError) {
      const msg =
        loadError instanceof Error ? loadError.message : String(loadError);
      throw new Error(`Airtable-Load fehlgeschlagen: ${msg}`);
    }
    const sourceLoadDuration = Date.now() - sourceLoadStart;
    console.log(
      `   Loaded ${airtableThemen.length} themen, ${airtableSchulen.length} schulen in ${sourceLoadDuration}ms`
    );

    // SAFETY: Wenn Airtable leer zurückkommt, ist meist ein Verbindungs-/
    // Konfigurationsfehler die Ursache. Sync abbrechen, statt versehentlich
    // ALLE Cache-Einträge zu deaktivieren.
    if (airtableThemen.length === 0 && airtableSchulen.length === 0) {
      throw new Error(
        "Airtable lieferte 0 Themen UND 0 Schulen – wahrscheinlich Verbindungs- oder Auth-Problem. Sync abgebrochen, um Datenverlust zu vermeiden."
      );
    }

    // Zähle Themen mit empfohleneIntegrationsfaecher (für Debug-Sichtbarkeit)
    const themenWithIntegrationField = airtableThemen.filter(
      (t) => t.empfohleneIntegrationsfaecher && t.empfohleneIntegrationsfaecher.length > 0
    ).length;
    console.log(
      `   ${themenWithIntegrationField}/${airtableThemen.length} themen haben empfohleneIntegrationsfaecher gesetzt`
    );

    // Kompetenzen-Map aus den bereits geladenen Themen extrahieren
    // (getAllThemen liefert Kompetenzen schon als aufgelöste Objekte mit
    // Unterrichtsideen – wir müssen sie nicht erneut laden).
    const kompetenzenMap = new Map<string, Kompetenz>();
    airtableThemen.forEach((thema) => {
      thema.kompetenzen?.forEach((k) => {
        if (!kompetenzenMap.has(k.id)) {
          kompetenzenMap.set(k.id, k);
        }
      });
    });
    console.log(`   Extracted ${kompetenzenMap.size} unique kompetenzen`);

    // OPTIMIERUNG: Firestore-Upserts parallel ausführen (keine Airtable-Calls
    // mehr in Phase 1, daher ist Parallelisierung sicher und schnell).
    console.log("⚡ Running parallel Firestore upserts...");
    const phase1Start = Date.now();
    const [schulenResult, themenResult, kompetenzenResult] = await withTimeout(
      Promise.all([
        syncSchulen(airtableSchulen).catch((error) => {
          console.error("Error syncing Schulen:", error);
          return { added: 0, updated: 0, deleted: 0, errors: [error.message] };
        }),
        syncThemen(airtableThemen).catch((error) => {
          console.error("Error syncing Themen:", error);
          return { added: 0, updated: 0, deleted: 0, errors: [error.message] };
        }),
        syncKompetenzen(kompetenzenMap).catch((error) => {
          console.error("Error syncing Kompetenzen:", error);
          return { added: 0, updated: 0, deleted: 0, errors: [error.message] };
        }),
      ]),
      60000, // 60s Timeout (war 8s – zu kurz für Firestore-Batches)
      "Sync Phase 1 timeout after 60 seconds"
    );

    console.log(
      `✅ Phase 1 (parallel Firestore upserts) completed in ${Date.now() - phase1Start}ms`
    );

    result.recordsProcessed.schulen = schulenResult;
    result.recordsProcessed.themes = themenResult;
    result.recordsProcessed.kompetenzen = kompetenzenResult;

    if (schulenResult.errors) result.errors.push(...schulenResult.errors);
    if (themenResult.errors) result.errors.push(...themenResult.errors);
    if (kompetenzenResult.errors) result.errors.push(...kompetenzenResult.errors);

    // Phase 2: Sync Lektionen (jetzt optimiert mit Bulk-Load)
    // Timeout nach 60 Sekunden (genug Zeit für Airtable API + Firestore Batches)
    console.log("📝 Syncing Lektionen...");
    const lektionenResult = await withTimeout(
      syncLektionen(),
      60000, // 60 Sekunden Timeout (war 5s - zu kurz)
      "Sync Phase 2 (Lektionen) timeout after 60 seconds"
    ).catch((error) => {
      console.error("Error syncing Lektionen:", error);
      return { added: 0, updated: 0, deleted: 0, errors: [error.message] };
    });

    result.recordsProcessed.lektionen = lektionenResult;
    if (lektionenResult.errors) {
      result.errors.push(...lektionenResult.errors);
    }

    console.log("✅ Phase 2 (lektionen) completed");

    // Phase 3: Sync Bilder zu Firebase Storage (damit URLs nicht ablaufen)
    console.log("🖼️ Syncing theme images to Firebase Storage...");
    const imageResult = await withTimeout(
      syncThemenImages(),
      120000, // 120 Sekunden Timeout (Bilder brauchen mehr Zeit)
      "Sync Phase 3 (Images) timeout after 120 seconds"
    ).catch((error) => {
      console.error("Error syncing images:", error);
      return { synced: 0, skipped: 0, failed: 0, errors: [error instanceof Error ? error.message : String(error)] };
    });

    if (imageResult.errors && imageResult.errors.length > 0) {
      result.errors.push(...imageResult.errors);
    }
    console.log(`✅ Phase 3 (images) completed: ${imageResult.synced} synced, ${imageResult.skipped} skipped, ${imageResult.failed} failed`);

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
 * @param airtableSchulen - Bereits aus Airtable geladene Schulen
 */
async function syncSchulen(
  airtableSchulen: Schule[]
): Promise<{ added: number; updated: number; deleted: number; errors?: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let deleted = 0;

  try {
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
 * @param airtableThemen - Bereits aus Airtable geladene Themen (mit aufgelösten Kompetenzen)
 */
async function syncThemen(
  airtableThemen: Thema[]
): Promise<{ added: number; updated: number; deleted: number; errors?: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let deleted = 0;

  try {
    const airtableIds = new Set(airtableThemen.map((t) => t.id));

    // 2. Lade alle Themen aus Firestore
    const firestoreThemen = await getSystemThemes();
    const firestoreIds = new Set(firestoreThemen.map((t) => t.airtableId));

    // Map für schnellen Zugriff auf existierende Firestore-Themen
    const firestoreThemeMap = new Map(firestoreThemen.map((t) => [t.airtableId, t]));

    // 3. Identifiziere neue und zu aktualisierende Themen
    const toUpsert: Omit<SystemTheme, "id">[] = airtableThemen.map((thema) => {
      const isNew = !firestoreIds.has(thema.id);
      if (isNew) {
        added++;
      } else {
        updated++;
      }

      // WICHTIG: Wenn bereits eine permanente Firebase Storage URL existiert,
      // diese beibehalten statt mit der temporären Airtable-URL zu überschreiben.
      // Airtable Attachment-URLs laufen nach ~2 Stunden ab!
      const existingTheme = firestoreThemeMap.get(thema.id);
      const existingBild = existingTheme?.bildLehrmittel;
      const existingHasStorageUrl = existingBild?.includes("storage.googleapis.com");
      const bildLehrmittel = existingHasStorageUrl
        ? existingBild
        : thema.bildLehrmittel;

      return {
        airtableId: thema.id,
        thema: thema.thema,
        beschreibung: thema.beschreibung,
        lehrmittel: thema.lehrmittel,
        bildLehrmittel,
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
        empfohleneIntegrationsfaecher: thema.empfohleneIntegrationsfaecher,
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
 * @param kompetenzenMap - Bereits aus Airtable extrahierte Kompetenzen (Map: id → Kompetenz)
 */
async function syncKompetenzen(
  kompetenzenMap: Map<string, Kompetenz>
): Promise<{ added: number; updated: number; deleted: number; errors?: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let deleted = 0;

  try {
    if (kompetenzenMap.size === 0) {
      return { added: 0, updated: 0, deleted: 0 };
    }

    const airtableIds = new Set(kompetenzenMap.keys());

    // Lade alle Kompetenzen aus Firestore
    const firestoreKompetenzen = await getSystemKompetenzen();
    const firestoreIds = new Set(firestoreKompetenzen.map((k) => k.airtableId));

    // Identifiziere neue und zu aktualisierende Kompetenzen
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
 * Sync Lektionen (OPTIMIERT: Bulk-Load statt pro-Thema)
 */
async function syncLektionen(): Promise<{ added: number; updated: number; deleted: number; errors?: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let deleted = 0;

  try {
    // 1. Lade ALLE Lektionen auf einmal aus Airtable (1 API-Call statt N)
    console.log("📥 Loading all Lektionen from Airtable...");
    const airtableLektionen = await getAllLektionsplanung();
    console.log(`   Found ${airtableLektionen.length} Lektionen in Airtable`);

    const allAirtableIds = new Set(airtableLektionen.map((l) => l.id));

    // 2. Lade ALLE Lektionen aus Firestore auf einmal (1 Query statt N)
    console.log("📥 Loading all Lektionen from Firestore...");
    const firestoreLektionen = await getAllSystemLektionen();
    const firestoreIds = new Set(firestoreLektionen.map((l) => l.airtableId));
    console.log(`   Found ${firestoreLektionen.length} Lektionen in Firestore`);

    // 3. Konvertiere Airtable-Lektionen zu SystemLektion Format
    const allLektionen: Omit<SystemLektion, "id">[] = airtableLektionen.map((lektion) => {
      if (!firestoreIds.has(lektion.id)) {
        added++;
      } else {
        updated++;
      }

      return {
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
      };
    });

    // 4. Upsert in Firestore (in Batches von 500)
    if (allLektionen.length > 0) {
      console.log(`📤 Upserting ${allLektionen.length} Lektionen to Firestore...`);
      for (let i = 0; i < allLektionen.length; i += 500) {
        const batch = allLektionen.slice(i, i + 500);
        await upsertSystemLektionen(batch);
      }
    }

    // 5. Identifiziere gelöschte Lektionen
    const toDeactivate = Array.from(firestoreIds).filter((id) => !allAirtableIds.has(id));

    if (toDeactivate.length > 0) {
      console.log(`🗑️ Deactivating ${toDeactivate.length} removed Lektionen...`);
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

/**
 * Sync Themen-Bilder zu Firebase Storage
 * Airtable Attachment-URLs laufen nach ~2 Stunden ab.
 * Diese Funktion lädt die Bilder herunter und speichert sie permanent in Firebase Storage.
 */
async function syncThemenImages(): Promise<{ synced: number; skipped: number; failed: number; errors?: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Lade alle Themen aus Firestore Cache
    const themes = await getSystemThemes();

    // Filtere Themen die ein Bild haben, das noch nicht in Firebase Storage liegt
    const themesNeedingImageSync = themes.filter((theme) => {
      if (!theme.bildLehrmittel) return false;
      // Bereits in Firebase Storage → überspringen
      if (theme.bildLehrmittel.includes("storage.googleapis.com")) return false;
      return true;
    });

    if (themesNeedingImageSync.length === 0) {
      console.log("   All images already in Firebase Storage, nothing to sync");
      return { synced: 0, skipped: themes.length, failed: 0 };
    }

    skipped = themes.length - themesNeedingImageSync.length;
    console.log(`   ${themesNeedingImageSync.length} images to download, ${skipped} already synced`);

    // Verarbeite in kleinen Batches (3 parallel) um Airtable nicht zu überlasten
    const BATCH_SIZE = 3;
    for (let i = 0; i < themesNeedingImageSync.length; i += BATCH_SIZE) {
      const batch = themesNeedingImageSync.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (theme) => {
          const storagePath = generateSystemImagePath(theme.airtableId, theme.bildLehrmittel);
          const storageUrl = await downloadAndUploadImage(theme.bildLehrmittel!, storagePath);

          if (storageUrl) {
            // Update Firestore mit permanenter Firebase Storage URL
            await upsertSystemThemes([{
              ...theme,
              bildLehrmittel: storageUrl,
              lastSyncedAt: new Date(),
            }]);
            return true;
          }
          return false;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          synced++;
        } else {
          failed++;
          if (result.status === "rejected") {
            errors.push(String(result.reason));
          }
        }
      }

      // Kurze Pause zwischen Batches um Rate-Limits zu respektieren
      if (i + BATCH_SIZE < themesNeedingImageSync.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return { synced, skipped, failed, errors: errors.length > 0 ? errors : undefined };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error in syncThemenImages";
    errors.push(errorMessage);
    console.error("Error syncing theme images:", error);
    return { synced, skipped, failed, errors };
  }
}
