import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { getData, getDataBatch, extractUidFromUrl } from "@/lib/lp21/client";
import { kantonToLP21 } from "@/lib/lp21/config";
import type { LP21Kanton } from "@/lib/lp21";

// Kompetenzaufbau Root-UID
const KOMPETENZAUFBAU_UID = "00000000000000000000000000000000";

/**
 * GET /api/admin/sync/lp21/fachbereiche?kanton=so
 * Lädt alle verfügbaren Fachbereiche von der LP21 API für einen Kanton.
 * Damit kann die Admin Sync-Seite dynamisch die korrekten Fachbereich-Codes anzeigen.
 */
export async function GET(req: NextRequest) {
  try {
    // Auth Check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const teacher = await getTeacherProfile(userId);
    if (!teacher || teacher.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden - Super Admin required" }, { status: 403 });
    }

    // Kanton-Parameter
    const kantonParam = req.nextUrl.searchParams.get("kanton") || "v-fe";
    const kanton: LP21Kanton = kantonParam.includes("-") || kantonParam === kantonParam.toLowerCase()
      ? kantonParam as LP21Kanton
      : kantonToLP21(kantonParam);

    // Kompetenzaufbau laden
    const kompetenzaufbau = await getData(KOMPETENZAUFBAU_UID, kanton, "de");

    if (!kompetenzaufbau.hierarchie_unten?.length) {
      return NextResponse.json({ fachbereiche: [], kanton });
    }

    // Alle Fachbereiche laden
    const fachbereichUids = kompetenzaufbau.hierarchie_unten.map(extractUidFromUrl);
    const fachbereiche = await getDataBatch(fachbereichUids, kanton, "de");

    const result = Array.from(fachbereiche.entries()).map(([uid, fb]) => {
      const bezeichnung = typeof fb.bezeichnung === "string"
        ? fb.bezeichnung
        : Array.isArray(fb.bezeichnung) ? fb.bezeichnung[0] : "";
      return {
        uid,
        code: fb.code || "",
        bezeichnung,
      };
    });

    // Nach Code sortieren
    result.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({
      fachbereiche: result,
      kanton,
    });
  } catch (error) {
    console.error("Error fetching LP21 fachbereiche:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
