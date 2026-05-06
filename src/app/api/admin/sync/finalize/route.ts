import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { createSyncLog } from "@/lib/firestore/system-cache";
import * as admin from "firebase-admin";

const SYNC_METADATA_COLLECTION = "sync_metadata";

/**
 * POST /api/admin/sync/finalize
 *
 * Wird nach Abschluss eines mehrstufigen UI-Syncs aufgerufen, um:
 * 1. sync_metadata mit dem Endergebnis zu aktualisieren (lastFullSync,
 *    syncStatus, errorMessage, recordCounts, lastSyncDuration).
 * 2. einen sync_logs-Eintrag für das Sync-Vorgänge-Verlaufsfenster
 *    zu erstellen.
 *
 * Hintergrund: Die UI ruft individuelle Sync-Routen sequentiell auf
 * (schulen, themen, kompetenzen, lektionen, images). Diese Routen
 * schreiben weder das Metadata-Doc komplett (lastFullSync) noch
 * Log-Einträge. Ohne diesen Finalize-Schritt zeigte die Sync-Status-
 * Seite immer veraltete Daten und alte Fehler.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();
    let userId: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Permission: nur Super-Admins
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    const teacher = teacherDoc.data();
    if (teacher?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Super Admin required" },
        { status: 403 }
      );
    }

    // Body parsen
    const body = await request.json();
    const {
      duration,
      recordsProcessed,
      errors,
    } = body as {
      duration: number;
      recordsProcessed: {
        schulen: { added: number; updated: number; deleted: number };
        themes: { added: number; updated: number; deleted: number };
        kompetenzen: { added: number; updated: number; deleted: number };
        lektionen: { added: number; updated: number; deleted: number };
      };
      errors?: string[];
    };

    const hasErrors = Array.isArray(errors) && errors.length > 0;
    const success = !hasErrors;

    // sync_metadata aktualisieren. Wichtig:
    // - errorMessage muss bei Erfolg explizit ENTFERNT werden (FieldValue.delete),
    //   sonst bleibt der Text "Letzter Fehler: ..." der vorherigen Ausführung stehen.
    // - lastFullSync ist der korrekte Feldname (NICHT lastSyncedAt).
    // - syncStatus muss ein gültiger SyncStatus-Wert sein ("success"/"error").
    const metadataUpdate: Record<string, unknown> = {
      lastFullSync: new Date(),
      syncStatus: success ? "success" : "error",
      lastSyncDuration: duration,
      recordCounts: {
        themes:
          (recordsProcessed?.themes?.added ?? 0) +
          (recordsProcessed?.themes?.updated ?? 0),
        schulen:
          (recordsProcessed?.schulen?.added ?? 0) +
          (recordsProcessed?.schulen?.updated ?? 0),
        kompetenzen:
          (recordsProcessed?.kompetenzen?.added ?? 0) +
          (recordsProcessed?.kompetenzen?.updated ?? 0),
        lektionen:
          (recordsProcessed?.lektionen?.added ?? 0) +
          (recordsProcessed?.lektionen?.updated ?? 0),
      },
    };

    if (success) {
      // Bei Erfolg: alten Fehler löschen
      metadataUpdate.errorMessage = admin.firestore.FieldValue.delete();
    } else {
      metadataUpdate.errorMessage = errors!.join("; ");
    }

    // Direktes Schreiben (helper updateSyncMetadata unterstützt FieldValue.delete()
    // typseitig nicht, weil seine Signatur auf Partial<SyncMetadata> begrenzt ist).
    await adminDb
      .collection(SYNC_METADATA_COLLECTION)
      .doc("global")
      .set(metadataUpdate, { merge: true });

    // sync_logs Eintrag anlegen
    await createSyncLog({
      timestamp: new Date(),
      type: "manual_sync",
      status: success ? "success" : "error",
      duration,
      recordsProcessed,
      errors: hasErrors ? errors : undefined,
      triggeredBy: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in sync finalize:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
