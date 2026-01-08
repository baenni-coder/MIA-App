import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createCompetencyIndicator,
  getIndicatorsForTeacher,
  getIndicatorsByCreator,
  getIndicatorsForCompetencies,
} from "@/lib/firestore/competency-indicators";

/**
 * GET /api/competency-indicators
 * Query params:
 * - competencyIds: Komma-separierte Liste von Kompetenz-IDs
 * - createdBy: User ID des Erstellers (für eigene Indikatoren)
 * - schoolId: Schul-ID (für alle verfügbaren Indikatoren)
 */
export async function GET(request: Request) {
  try {
    // Authentifizierung prüfen
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const competencyIds = searchParams.get("competencyIds");
    const createdBy = searchParams.get("createdBy");
    const schoolId = searchParams.get("schoolId");

    // Fall 1: Indikatoren für bestimmte Kompetenzen (Batch)
    if (competencyIds) {
      const ids = competencyIds.split(",").filter(Boolean);
      const indicatorsMap = await getIndicatorsForCompetencies(ids, schoolId || undefined);

      // Map zu Object konvertieren für JSON
      const indicators: Record<string, unknown> = {};
      indicatorsMap.forEach((value, key) => {
        indicators[key] = value;
      });

      return NextResponse.json({ indicators });
    }

    // Fall 2: Indikatoren nach Ersteller
    if (createdBy) {
      // Nur eigene Indikatoren oder Admin darf alle sehen
      const adminDb = getAdminDb();
      if (decodedToken.uid !== createdBy) {
        const teacherDoc = await adminDb
          .collection("teachers")
          .doc(decodedToken.uid)
          .get();

        if (!teacherDoc.exists) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }

        const teacherData = teacherDoc.data()!;
        if (teacherData.role !== "picts_admin" && teacherData.role !== "super_admin") {
          return NextResponse.json(
            { error: "Forbidden - Cannot view other users' indicators" },
            { status: 403 }
          );
        }
      }

      const indicators = await getIndicatorsByCreator(createdBy);
      return NextResponse.json({ indicators });
    }

    // Fall 3: Alle verfügbaren Indikatoren für eine Schule
    if (schoolId) {
      const indicators = await getIndicatorsForTeacher(schoolId);
      return NextResponse.json({ indicators });
    }

    return NextResponse.json(
      { error: "competencyIds, createdBy, or schoolId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching indicators:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/competency-indicators
 * Body: { competencyId, competencyName, indicators, schoolId? }
 */
export async function POST(request: Request) {
  try {
    // Authentifizierung prüfen
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const adminDb = getAdminDb();

    // Prüfen ob User ein Lehrer ist
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Forbidden - Not a teacher" },
        { status: 403 }
      );
    }

    const teacherData = teacherDoc.data()!;

    const body = await request.json();
    const { competencyId, competencyName, indicators, schoolId } = body;

    // Validierung
    if (!competencyId || !competencyName || !indicators) {
      return NextResponse.json(
        { error: "competencyId, competencyName, and indicators are required" },
        { status: 400 }
      );
    }

    if (
      !indicators.star1 ||
      !indicators.star2 ||
      !indicators.star3 ||
      !indicators.star4 ||
      !indicators.star5
    ) {
      return NextResponse.json(
        { error: "All star indicators (star1-star5) are required" },
        { status: 400 }
      );
    }

    // Nur PICTS-Admin oder Super-Admin können systemweite Indikatoren erstellen
    const isAdmin = teacherData.role === "picts_admin" || teacherData.role === "super_admin";
    const effectiveSchoolId = isAdmin && !schoolId ? undefined : (schoolId || teacherData.schuleId);

    const id = await createCompetencyIndicator({
      competencyId,
      competencyName,
      indicators,
      schoolId: effectiveSchoolId,
      createdBy: userId,
      createdByName: teacherData.name || "Unbekannt",
    });

    return NextResponse.json({
      id,
      isSystemWide: !effectiveSchoolId,
    });
  } catch (error) {
    console.error("Error creating indicator:", error);

    if (error instanceof Error && error.message.includes("bereits ein Indikator")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
