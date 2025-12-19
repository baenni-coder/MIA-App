import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { getAllThemen } from "@/lib/airtable/themen";
import { getLektionsplanungByThemaName } from "@/lib/airtable/lektionsplanung";
import {
  upsertSystemLektionen,
  getSystemLektionenByThemaName,
  deactivateSystemLektionen,
} from "@/lib/firestore/system-cache";
import { SystemLektion } from "@/types";

/**
 * POST /api/admin/sync/lektionen
 * Synchronisiert nur Lektionen von Airtable → Firestore
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

    console.log("📝 Syncing Lektionen...");

    let added = 0;
    let updated = 0;
    let deleted = 0;
    const errors: string[] = [];

    // 3. Lade alle Themen (um zu wissen, welche Lektionen wir laden müssen)
    const airtableThemen = await getAllThemen();

    const allLektionen: Omit<SystemLektion, "id">[] = [];
    const allAirtableIds = new Set<string>();

    // 4. Für jedes Thema: Lade Lektionen
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

    // 5. Lade alle Lektionen aus Firestore (um Deleted zu identifizieren)
    const firestoreIds = new Set<string>();
    for (const thema of airtableThemen) {
      try {
        const firestoreLektionen = await getSystemLektionenByThemaName(thema.thema);
        firestoreLektionen.forEach((l) => firestoreIds.add(l.airtableId));
      } catch (error) {
        console.warn(`Could not load Firestore Lektionen for ${thema.thema}:`, error);
      }
    }

    // 6. Zähle Neue vs. Updates
    allLektionen.forEach((lektion) => {
      if (!firestoreIds.has(lektion.airtableId)) {
        added++;
      } else {
        updated++;
      }
    });

    // 7. Upsert in Firestore
    if (allLektionen.length > 0) {
      for (let i = 0; i < allLektionen.length; i += 500) {
        const batch = allLektionen.slice(i, i + 500);
        await upsertSystemLektionen(batch);
      }
    }

    // 8. Identifiziere gelöschte Lektionen
    const toDeactivate = Array.from(firestoreIds).filter((id) => !allAirtableIds.has(id));

    if (toDeactivate.length > 0) {
      await deactivateSystemLektionen(toDeactivate);
      deleted = toDeactivate.length;
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Lektionen synced: +${added} ~${updated} -${deleted} in ${duration}ms`);

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
    console.error("❌ Error syncing Lektionen:", errorMessage);

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
