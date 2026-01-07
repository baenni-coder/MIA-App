import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getOrCreateStudentProgress,
  getStudentProgress,
  updateCompetencyRating,
  checkAndAwardAutoBadges,
} from "@/lib/firestore/student-progress";
import { getStudentById } from "@/lib/firestore/students";

/**
 * GET /api/student-progress
 * Query params:
 * - studentId: Schüler-ID (required)
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

    const authenticatedUserId = decodedToken.uid;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    // Hole Schüler-Daten
    const student = await getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Zugriffsprüfung: Nur der Schüler selbst oder sein Lehrer
    if (authenticatedUserId !== studentId) {
      // Prüfen ob der authentifizierte User der Lehrer ist
      const adminDb = getAdminDb();
      const teacherDoc = await adminDb
        .collection("teachers")
        .doc(authenticatedUserId)
        .get();

      if (!teacherDoc.exists) {
        return NextResponse.json(
          { error: "Forbidden - Cannot view other students' progress" },
          { status: 403 }
        );
      }

      // Prüfen ob der Lehrer Zugriff auf diesen Schüler hat
      if (student.teacherId !== authenticatedUserId) {
        const teacherData = teacherDoc.data()!;
        if (
          teacherData.role !== "picts_admin" &&
          teacherData.role !== "super_admin"
        ) {
          return NextResponse.json(
            { error: "Forbidden - Cannot view this student's progress" },
            { status: 403 }
          );
        }
      }
    }

    // Hole oder erstelle Progress
    const progress = await getOrCreateStudentProgress(studentId, student.classId);

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Error getting student progress:", error);
    return NextResponse.json(
      { error: "Failed to get student progress" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/student-progress
 * Body: { studentId, competencyId, rating, competencyName? }
 * Aktualisiert die Bewertung einer Kompetenz
 */
export async function PUT(request: Request) {
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

    const authenticatedUserId = decodedToken.uid;
    const body = await request.json();
    const { studentId, competencyId, rating } = body;

    console.log("[student-progress PUT] Request:", {
      authenticatedUserId,
      studentId,
      competencyId,
      rating,
      isSameUser: authenticatedUserId === studentId,
    });

    if (!studentId || !competencyId || rating === undefined) {
      return NextResponse.json(
        { error: "studentId, competencyId, and rating are required" },
        { status: 400 }
      );
    }

    // Validierung: Rating muss 0-5 sein
    if (rating < 0 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "Rating must be an integer between 0 and 5" },
        { status: 400 }
      );
    }

    // Hole Schüler-Daten
    const student = await getStudentById(studentId);
    console.log("[student-progress PUT] Student found:", student ? { id: student.id, classId: student.classId } : null);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.classId) {
      console.error("[student-progress PUT] Student has no classId:", studentId);
      return NextResponse.json({ error: "Student has no class assigned" }, { status: 400 });
    }

    // Bestimme wer die Änderung vornimmt
    let changedBy: "student" | string = "student";
    let changedByName: string | undefined;

    if (authenticatedUserId !== studentId) {
      // Prüfen ob der authentifizierte User der Lehrer ist
      const adminDb = getAdminDb();
      const teacherDoc = await adminDb
        .collection("teachers")
        .doc(authenticatedUserId)
        .get();

      if (!teacherDoc.exists) {
        return NextResponse.json(
          { error: "Forbidden - Cannot update other students' progress" },
          { status: 403 }
        );
      }

      // Prüfen ob der Lehrer Zugriff auf diesen Schüler hat
      if (student.teacherId !== authenticatedUserId) {
        const teacherData = teacherDoc.data()!;
        if (
          teacherData.role !== "picts_admin" &&
          teacherData.role !== "super_admin"
        ) {
          return NextResponse.json(
            { error: "Forbidden - Cannot update this student's progress" },
            { status: 403 }
          );
        }
      }

      changedBy = authenticatedUserId;
      changedByName = teacherDoc.data()?.name;
    }

    // Aktualisiere die Bewertung
    await updateCompetencyRating(
      studentId,
      student.classId,
      competencyId,
      rating,
      changedBy,
      changedByName
    );

    // Prüfe und vergebe automatische Badges
    let newBadges: unknown[] = [];
    try {
      const progress = await getStudentProgress(studentId);
      if (progress) {
        newBadges = await checkAndAwardAutoBadges(studentId, student.name, progress);
      }
    } catch (badgeError) {
      // Badge-Fehler sollten das Rating nicht blockieren
      console.error("Error checking badges (non-fatal):", badgeError);
    }

    return NextResponse.json({
      success: true,
      newBadges,
    });
  } catch (error) {
    console.error("Error updating student progress:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update student progress", details: errorMessage },
      { status: 500 }
    );
  }
}
