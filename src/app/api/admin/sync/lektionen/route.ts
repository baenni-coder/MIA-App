import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { getAllLektionsplanung } from "@/lib/airtable/lektionsplanung";
import {
  upsertSystemLektionen,
  getAllSystemLektionen,
  deactivateSystemLektionen,
} from "@/lib/firestore/system-cache";
import { SystemLektion } from "@/types";

// Vercel: 120s Funktion-Timeout (Lektionen können viele sein)
export const maxDuration = 120;

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

    // 3. OPTIMIERUNG: Lade ALLE Lektionen auf einmal (1 API-Call statt N).
    // Vorher wurde pro Thema ein eigener Airtable-Call gemacht (~90 Calls
    // bei 90 Themen, was bei 5 req/sec rund 18s dauert).
    const airtableLektionen = await getAllLektionsplanung();
    const allAirtableIds = new Set(airtableLektionen.map((l) => l.id));

    // 4. Lade ALLE Lektionen aus Firestore auf einmal
    const firestoreLektionen = await getAllSystemLektionen();
    const firestoreIds = new Set(firestoreLektionen.map((l) => l.airtableId));

    // SAFETY: Nicht alle Lektionen deaktivieren, wenn Airtable leer ist
    if (airtableLektionen.length === 0 && firestoreLektionen.length > 0) {
      throw new Error(
        "Airtable lieferte 0 Lektionen, aber Firestore enthält Daten – Sync abgebrochen, um Datenverlust zu vermeiden."
      );
    }

    // 5. Konvertiere Airtable-Lektionen zu SystemLektion-Format
    const allLektionen: Omit<SystemLektion, "id">[] = airtableLektionen.map(
      (lektion) => {
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
      }
    );

    // 7. Upsert in Firestore
    if (allLektionen.length > 0) {
      for (let i = 0; i < allLektionen.length; i += 500) {
        const batch = allLektionen.slice(i, i + 500);
        await upsertSystemLektionen(batch);
      }
    }

    // 8. Identifiziere gelöschte Lektionen
    const toDeactivate = Array.from(firestoreIds).filter(
      (id) => !allAirtableIds.has(id)
    );

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
