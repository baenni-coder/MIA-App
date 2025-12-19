import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { getAllSchulen } from "@/lib/airtable/schulen";
import {
  upsertSystemSchulen,
  getSystemSchulen,
  deactivateSystemSchulen,
} from "@/lib/firestore/system-cache";
import { SystemSchule } from "@/types";

/**
 * POST /api/admin/sync/schulen
 * Synchronisiert nur Schulen von Airtable → Firestore
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

    console.log("📚 Syncing Schulen...");

    let added = 0;
    let updated = 0;
    let deleted = 0;
    const errors: string[] = [];

    // 3. Lade alle Schulen aus Airtable
    const airtableSchulen = await getAllSchulen();
    const airtableIds = new Set(airtableSchulen.map((s) => s.id));

    // 4. Lade alle Schulen aus Firestore
    const firestoreSchulen = await getSystemSchulen();
    const firestoreIds = new Set(firestoreSchulen.map((s) => s.airtableId));

    // 5. Identifiziere neue und zu aktualisierende Schulen
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

    // 6. Upsert in Firestore
    if (toUpsert.length > 0) {
      await upsertSystemSchulen(toUpsert);
    }

    // 7. Identifiziere gelöschte Schulen
    const toDeactivate = firestoreSchulen
      .filter((s) => !airtableIds.has(s.airtableId))
      .map((s) => s.airtableId);

    if (toDeactivate.length > 0) {
      await deactivateSystemSchulen(toDeactivate);
      deleted = toDeactivate.length;
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Schulen synced: +${added} ~${updated} -${deleted} in ${duration}ms`);

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
    console.error("❌ Error syncing Schulen:", errorMessage);

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
