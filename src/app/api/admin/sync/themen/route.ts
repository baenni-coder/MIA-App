import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { getAllThemen } from "@/lib/airtable/themen";
import {
  upsertSystemThemes,
  getSystemThemes,
  deactivateSystemThemes,
} from "@/lib/firestore/system-cache";
import { SystemTheme } from "@/types";

// Vercel: 60s Funktion-Timeout (Default ist 10s auf Hobby)
export const maxDuration = 60;

/**
 * POST /api/admin/sync/themen
 * Synchronisiert nur Themen von Airtable → Firestore
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Auth Check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Permission Check (nur Super Admins)
    const teacher = await getTeacherProfile(userId);
    if (!teacher || teacher.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden - Super Admin required" }, { status: 403 });
    }

    console.log("📖 Syncing Themen...");

    let added = 0;
    let updated = 0;
    let deleted = 0;
    const errors: string[] = [];

    // 3. Lade alle Themen aus Airtable
    const airtableThemen = await getAllThemen();
    const airtableIds = new Set(airtableThemen.map((t) => t.id));

    // 4. Lade alle Themen aus Firestore
    const firestoreThemen = await getSystemThemes();
    const firestoreIds = new Set(firestoreThemen.map((t) => t.airtableId));

    // Map für schnellen Zugriff auf existierende Firestore-Themen
    const firestoreThemeMap = new Map(firestoreThemen.map((t) => [t.airtableId, t]));

    // SAFETY: Wenn Airtable leer zurückkommt, wäre die nachfolgende
    // Deaktivierung katastrophal (alle Cache-Einträge weg). Abbrechen.
    if (airtableThemen.length === 0 && firestoreThemen.length > 0) {
      throw new Error(
        "Airtable lieferte 0 Themen, aber Firestore enthält Daten – wahrscheinlich Verbindungs- oder Auth-Problem. Sync abgebrochen, um Datenverlust zu vermeiden."
      );
    }

    // Debug: zähle Themen mit empfohleneIntegrationsfaecher
    const themenWithIntegration = airtableThemen.filter(
      (t) => t.empfohleneIntegrationsfaecher && t.empfohleneIntegrationsfaecher.length > 0
    ).length;
    console.log(
      `   ${themenWithIntegration}/${airtableThemen.length} themen haben empfohleneIntegrationsfaecher`
    );

    // 5. Identifiziere neue und zu aktualisierende Themen
    const toUpsert: Omit<SystemTheme, "id">[] = airtableThemen.map((thema) => {
      const isNew = !firestoreIds.has(thema.id);
      if (isNew) {
        added++;
      } else {
        updated++;
      }

      // WICHTIG: Bestehende Firebase Storage URLs beibehalten!
      // Airtable Attachment-URLs laufen nach ~2 Stunden ab.
      const existingBild = firestoreThemeMap.get(thema.id)?.bildLehrmittel;
      const existingHasStorageUrl = existingBild?.includes("storage.googleapis.com");
      const bildLehrmittel = existingHasStorageUrl ? existingBild : thema.bildLehrmittel;

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

    // 6. Upsert in Firestore (in Batches von 500)
    if (toUpsert.length > 0) {
      for (let i = 0; i < toUpsert.length; i += 500) {
        const batch = toUpsert.slice(i, i + 500);
        await upsertSystemThemes(batch);
      }
    }

    // 7. Identifiziere gelöschte Themen
    const toDeactivate = firestoreThemen
      .filter((t) => !airtableIds.has(t.airtableId))
      .map((t) => t.airtableId);

    if (toDeactivate.length > 0) {
      await deactivateSystemThemes(toDeactivate);
      deleted = toDeactivate.length;
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Themen synced: +${added} ~${updated} -${deleted} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      added,
      updated,
      deleted,
      duration,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error syncing Themen:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        added: 0,
        updated: 0,
        deleted: 0,
        duration: Date.now() - startTime,
        errors: [errorMessage],
      },
      { status: 500 }
    );
  }
}
