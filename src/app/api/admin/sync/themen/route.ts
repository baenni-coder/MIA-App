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

    // 5. Identifiziere neue und zu aktualisierende Themen
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
