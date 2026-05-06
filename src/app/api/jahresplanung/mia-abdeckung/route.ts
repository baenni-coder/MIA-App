import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import {
  getMiaCoverage,
  calculateMiaCoverageStats,
} from "@/lib/firestore/mia-coverage";
import { Stufe } from "@/types";

// Vercel: 60s reichen großzügig (Coverage-Berechnung ist hauptsächlich Firestore)
export const maxDuration = 60;

/**
 * GET /api/jahresplanung/mia-abdeckung?schuljahr=2025/2026[&stufe=4. Klasse]
 *
 * Liefert die Abdeckung der MI/IB-Kompetenzen durch Jahresplanungs-Einheiten.
 * Kanton wird automatisch aus dem Lehrer-Profil übernommen (für IB↔MI-Anzeige).
 */
export async function GET(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);

    let userId: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const teacher = await getTeacherProfile(userId);
    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    // Query Params
    const { searchParams } = new URL(request.url);
    const schuljahr = searchParams.get("schuljahr");
    if (!schuljahr) {
      return NextResponse.json(
        { error: "Missing required query param: schuljahr" },
        { status: 400 }
      );
    }

    // Stufe-Filter: Default = Stufe der Lehrperson (konsistent mit Jahresplan).
    // "all" deaktiviert den Filter explizit.
    const stufeParam = searchParams.get("stufe");
    let stufe: Stufe | undefined = undefined;
    if (stufeParam === null) {
      stufe = teacher.stufe;
    } else if (stufeParam !== "all") {
      stufe = stufeParam as Stufe;
    }

    const results = await getMiaCoverage(userId, schuljahr, {
      kanton: teacher.kanton,
      stufe,
    });
    const stats = calculateMiaCoverageStats(results);

    return NextResponse.json({
      schuljahr,
      stufe: stufe ?? null,
      kanton: teacher.kanton ?? null,
      results,
      stats,
    });
  } catch (error) {
    console.error("Error in GET /api/jahresplanung/mia-abdeckung:", error);
    return NextResponse.json(
      {
        error: "Failed to compute MIA coverage",
        message: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
