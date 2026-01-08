import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getPendingRating,
  confirmPendingRating,
  adjustPendingRating,
  deletePendingRating,
} from "@/lib/firestore/pending-ratings";
import {
  updateCompetencyRating,
  checkAndAwardAutoBadges,
  getStudentProgress,
} from "@/lib/firestore/student-progress";
import { getStudentById } from "@/lib/firestore/students";
import { notifyStudentRatingConfirmed } from "@/lib/firestore/notifications";

/**
 * GET /api/pending-ratings/[id]
 * Holt eine einzelne pending rating
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

    const pendingRating = await getPendingRating(id);
    if (!pendingRating) {
      return NextResponse.json(
        { error: "Pending rating not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ pendingRating });
  } catch (error) {
    console.error("Error fetching pending rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pending-ratings/[id]
 * Body: { action: "confirm" | "adjust", teacherRating?: number }
 * Bestätigt oder passt eine Bewertung an
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

    const teacherId = decodedToken.uid;
    const adminDb = getAdminDb();

    // Prüfen ob User ein Lehrer ist
    const teacherDoc = await adminDb
      .collection("teachers")
      .doc(teacherId)
      .get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Forbidden - Not a teacher" },
        { status: 403 }
      );
    }

    const teacherData = teacherDoc.data()!;
    const teacherName = teacherData.name || "Lehrer";

    // Hole pending rating
    const pendingRating = await getPendingRating(id);
    if (!pendingRating) {
      return NextResponse.json(
        { error: "Pending rating not found" },
        { status: 404 }
      );
    }

    if (pendingRating.status !== "pending") {
      return NextResponse.json(
        { error: "This rating has already been reviewed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, teacherRating } = body;

    if (!action || !["confirm", "adjust"].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "confirm" or "adjust"' },
        { status: 400 }
      );
    }

    let finalRating: number;

    if (action === "confirm") {
      // Lehrer bestätigt Schüler-Bewertung
      await confirmPendingRating(id, teacherId, teacherName);
      finalRating = pendingRating.studentRating;
    } else {
      // Lehrer passt Bewertung an
      if (teacherRating === undefined || teacherRating < 1 || teacherRating > 5) {
        return NextResponse.json(
          { error: "teacherRating must be between 1 and 5 for adjust action" },
          { status: 400 }
        );
      }
      await adjustPendingRating(id, teacherRating, teacherId, teacherName);
      finalRating = teacherRating;
    }

    // Hole Schüler-Daten
    const student = await getStudentById(pendingRating.studentId);
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Aktualisiere den tatsächlichen Progress mit der finalen Bewertung
    await updateCompetencyRating(
      pendingRating.studentId,
      pendingRating.classId,
      pendingRating.competencyId,
      finalRating,
      teacherId,
      teacherName
    );

    // Prüfe auf neue Badges
    try {
      const progress = await getStudentProgress(pendingRating.studentId);
      if (progress) {
        await checkAndAwardAutoBadges(
          pendingRating.studentId,
          student.name,
          progress
        );
      }
    } catch (badgeError) {
      console.error("Error checking badges (non-fatal):", badgeError);
    }

    // Benachrichtige Schüler
    try {
      await notifyStudentRatingConfirmed({
        studentId: pendingRating.studentId,
        competencyName: pendingRating.competencyName,
        wasAdjusted: action === "adjust",
        finalRating,
        studentRating: pendingRating.studentRating,
      });
    } catch (notifyError) {
      console.error("Error notifying student:", notifyError);
    }

    return NextResponse.json({
      success: true,
      action,
      finalRating,
      wasAdjusted: action === "adjust",
    });
  } catch (error) {
    console.error("Error reviewing pending rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pending-ratings/[id]
 * Löscht eine pending rating (nur Schüler kann eigene löschen)
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

    // Hole pending rating
    const pendingRating = await getPendingRating(id);
    if (!pendingRating) {
      return NextResponse.json(
        { error: "Pending rating not found" },
        { status: 404 }
      );
    }

    // Nur der Schüler selbst kann seine pending rating löschen
    if (pendingRating.studentId !== userId) {
      return NextResponse.json(
        { error: "Forbidden - Can only delete your own pending ratings" },
        { status: 403 }
      );
    }

    if (pendingRating.status !== "pending") {
      return NextResponse.json(
        { error: "Cannot delete already reviewed rating" },
        { status: 400 }
      );
    }

    await deletePendingRating(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pending rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
