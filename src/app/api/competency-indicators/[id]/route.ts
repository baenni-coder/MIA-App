import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getCompetencyIndicator,
  updateCompetencyIndicator,
  deleteCompetencyIndicator,
  approveIndicatorSystemWide,
} from "@/lib/firestore/competency-indicators";

/**
 * GET /api/competency-indicators/[id]
 * Holt einen einzelnen Indikator
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const indicator = await getCompetencyIndicator(id);
    if (!indicator) {
      return NextResponse.json(
        { error: "Indicator not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ indicator });
  } catch (error) {
    console.error("Error fetching indicator:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/competency-indicators/[id]
 * Body: { indicators?, competencyName?, action? }
 * action: "approve" für systemweite Freigabe (nur PICTS-Admin)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Hole existierenden Indikator
    const indicator = await getCompetencyIndicator(id);
    if (!indicator) {
      return NextResponse.json(
        { error: "Indicator not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, indicators, competencyName } = body;

    // Aktion: Systemweite Freigabe
    if (action === "approve") {
      // Nur PICTS-Admin oder Super-Admin
      if (teacherData.role !== "picts_admin" && teacherData.role !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden - Only admins can approve indicators" },
          { status: 403 }
        );
      }

      await approveIndicatorSystemWide(id, userId, teacherData.name || "Admin");

      return NextResponse.json({ success: true, action: "approved" });
    }

    // Standard Update - nur Ersteller oder Admin
    const isCreator = indicator.createdBy === userId;
    const isAdmin = teacherData.role === "picts_admin" || teacherData.role === "super_admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Can only edit your own indicators" },
        { status: 403 }
      );
    }

    // Validierung der Indikatoren
    if (indicators) {
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
    }

    await updateCompetencyIndicator(id, { indicators, competencyName });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating indicator:", error);

    if (error instanceof Error && error.message.includes("bereits systemweit")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/competency-indicators/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Hole existierenden Indikator
    const indicator = await getCompetencyIndicator(id);
    if (!indicator) {
      return NextResponse.json(
        { error: "Indicator not found" },
        { status: 404 }
      );
    }

    // Nur Ersteller oder Admin kann löschen
    const isCreator = indicator.createdBy === userId;
    const isAdmin = teacherData.role === "picts_admin" || teacherData.role === "super_admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Can only delete your own indicators" },
        { status: 403 }
      );
    }

    // Systemweite Indikatoren können nur Admins löschen
    if (indicator.isSystemWide && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Only admins can delete system-wide indicators" },
        { status: 403 }
      );
    }

    await deleteCompetencyIndicator(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting indicator:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
