import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { getAllThemen } from "@/lib/airtable/themen";
import {
  upsertSystemKompetenzen,
  getSystemKompetenzen,
  deactivateSystemKompetenzen,
} from "@/lib/firestore/system-cache";
import { SystemKompetenz, Kompetenz } from "@/types";

// Vercel: 60s Funktion-Timeout (Default ist 10s auf Hobby, hier explizit 60s)
export const maxDuration = 60;

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

    // 3. Lade Themen aus Airtable (resolved Kompetenzen sind bereits enthalten!)
    // OPTIMIERUNG: Vorher wurde hier nochmal getKompetenzenByIds aufgerufen,
    // was die Kompetenzen ein zweites Mal aus Airtable lud. Da getAllThemen()
    // die Kompetenzen bereits vollständig auflöst, extrahieren wir sie direkt.
    const airtableThemen = await getAllThemen();
    const kompetenzenMap = new Map<string, Kompetenz>();

    airtableThemen.forEach((thema) => {
      thema.kompetenzen?.forEach((k) => {
        if (!kompetenzenMap.has(k.id)) {
          kompetenzenMap.set(k.id, k);
        }
      });
    });

    if (kompetenzenMap.size === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        updated: 0,
        deleted: 0,
        duration: Date.now() - startTime,
      });
    }

    const airtableIds = new Set(kompetenzenMap.keys());

    // 5. Lade alle Kompetenzen aus Firestore
    const firestoreKompetenzen = await getSystemKompetenzen();
    const firestoreIds = new Set(firestoreKompetenzen.map((k) => k.airtableId));

    // SAFETY: Nicht alle Kompetenzen deaktivieren, wenn Airtable leer ist
    if (airtableThemen.length === 0 && firestoreKompetenzen.length > 0) {
      throw new Error(
        "Airtable lieferte 0 Themen, aber Firestore enthält Kompetenzen – Sync abgebrochen, um Datenverlust zu vermeiden."
      );
    }

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
