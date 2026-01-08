import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createPendingRating,
  getPendingRatingsForClass,
  getPendingRatingsForStudent,
  getPendingRatingsCount,
} from "@/lib/firestore/pending-ratings";
import { getStudentById } from "@/lib/firestore/students";
import { notifyTeacherPendingRating } from "@/lib/firestore/notifications";

/**
 * GET /api/pending-ratings
 * Query params:
 * - classId: Klassen-ID (für Lehrer)
 * - studentId: Schüler-ID (für Schüler)
 * - countOnly: "true" für nur Anzahl
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
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");
    const countOnly = searchParams.get("countOnly") === "true";

    const adminDb = getAdminDb();

    // Fall 1: Lehrer fragt nach Klassen-Daten
    if (classId) {
      // Prüfen ob User ein Lehrer ist
      const teacherDoc = await adminDb
        .collection("teachers")
        .doc(authenticatedUserId)
        .get();

      if (!teacherDoc.exists) {
        return NextResponse.json(
          { error: "Forbidden - Not a teacher" },
          { status: 403 }
        );
      }

      if (countOnly) {
        const count = await getPendingRatingsCount(classId);
        return NextResponse.json({ count });
      }

      const pendingRatings = await getPendingRatingsForClass(classId);
      return NextResponse.json({ pendingRatings });
    }

    // Fall 2: Schüler fragt nach eigenen Daten
    if (studentId) {
      // Nur eigene Daten oder Lehrer darf zugreifen
      if (authenticatedUserId !== studentId) {
        const teacherDoc = await adminDb
          .collection("teachers")
          .doc(authenticatedUserId)
          .get();

        if (!teacherDoc.exists) {
          return NextResponse.json(
            { error: "Forbidden - Cannot view other students' data" },
            { status: 403 }
          );
        }
      }

      const pendingRatings = await getPendingRatingsForStudent(studentId);
      return NextResponse.json({ pendingRatings });
    }

    return NextResponse.json(
      { error: "Either classId or studentId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching pending ratings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pending-ratings
 * Body: { competencyId, competencyName, studentRating }
 * Erstellt eine neue ausstehende Bewertung
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

    const studentId = decodedToken.uid;

    // Hole Schüler-Daten
    const student = await getStudentById(studentId);
    if (!student) {
      return NextResponse.json(
        { error: "Student not found - only students can submit ratings" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { competencyId, competencyName, studentRating } = body;

    if (!competencyId || !competencyName || studentRating === undefined) {
      return NextResponse.json(
        { error: "competencyId, competencyName, and studentRating are required" },
        { status: 400 }
      );
    }

    if (studentRating < 1 || studentRating > 5) {
      return NextResponse.json(
        { error: "studentRating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Erstelle pending rating
    const id = await createPendingRating({
      studentId,
      studentName: student.name,
      classId: student.classId,
      competencyId,
      competencyName,
      studentRating,
    });

    // Benachrichtige Lehrer (optional - nur wenn Funktion existiert)
    try {
      if (student.teacherId) {
        await notifyTeacherPendingRating({
          teacherId: student.teacherId,
          studentName: student.name,
          competencyName,
          studentRating,
        });
      }
    } catch (notifyError) {
      // Notification-Fehler sind nicht kritisch
      console.error("Error notifying teacher:", notifyError);
    }

    return NextResponse.json({ id, status: "pending" });
  } catch (error) {
    console.error("Error creating pending rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
