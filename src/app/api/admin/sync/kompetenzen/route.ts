import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { getAllThemen } from "@/lib/airtable/themen";
import { getKompetenzenByIds } from "@/lib/airtable/kompetenzen";
import {
  upsertSystemKompetenzen,
  getSystemKompetenzen,
  deactivateSystemKompetenzen,
} from "@/lib/firestore/system-cache";
import { SystemKompetenz } from "@/types";

/**
 * POST /api/admin/sync/kompetenzen
 * Synchronisiert nur Kompetenzen von Airtable → Firestore
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

    console.log("🎯 Syncing Kompetenzen...");

    let added = 0;
    let updated = 0;
    let deleted = 0;
    const errors: string[] = [];

    // 3. Sammle alle Kompetenzen-IDs aus den Themen
    const airtableThemen = await getAllThemen();
    const allKompetenzIds = new Set<string>();

    airtableThemen.forEach((thema) => {
      if (thema.kompetenzen) {
        thema.kompetenzen.forEach((k) => allKompetenzIds.add(k.id));
      }
    });

    if (allKompetenzIds.size === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        updated: 0,
        deleted: 0,
        duration: Date.now() - startTime,
      });
    }

    // 4. Lade alle Kompetenzen aus Airtable
    const kompetenzenMap = await getKompetenzenByIds(Array.from(allKompetenzIds));
    const airtableIds = new Set(kompetenzenMap.keys());

    // 5. Lade alle Kompetenzen aus Firestore
    const firestoreKompetenzen = await getSystemKompetenzen();
    const firestoreIds = new Set(firestoreKompetenzen.map((k) => k.airtableId));

    // 6. Identifiziere neue und zu aktualisierende Kompetenzen
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

    // 7. Upsert in Firestore
    if (toUpsert.length > 0) {
      for (let i = 0; i < toUpsert.length; i += 500) {
        const batch = toUpsert.slice(i, i + 500);
        await upsertSystemKompetenzen(batch);
      }
    }

    // 8. Identifiziere gelöschte Kompetenzen
    const toDeactivate = firestoreKompetenzen
      .filter((k) => !airtableIds.has(k.airtableId))
      .map((k) => k.airtableId);

    if (toDeactivate.length > 0) {
      await deactivateSystemKompetenzen(toDeactivate);
      deleted = toDeactivate.length;
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Kompetenzen synced: +${added} ~${updated} -${deleted} in ${duration}ms`);

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
    console.error("❌ Error syncing Kompetenzen:", errorMessage);

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
