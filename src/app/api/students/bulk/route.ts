import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { createStudentsBulk } from "@/lib/firestore/students";
import { teacherHasAccessToClass } from "@/lib/firestore/classes";

/**
 * POST /api/students/bulk
 * Erstellt mehrere Schüler auf einmal
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

    // Lehrer-Profil laden
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Only teachers can create students" },
        { status: 403 }
      );
    }

    const teacherData = teacherDoc.data()!;

    // Request Body parsen
    const { students, classId } = await request.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: "Students array is required" },
        { status: 400 }
      );
    }

    if (!classId) {
      return NextResponse.json(
        { error: "classId is required" },
        { status: 400 }
      );
    }

    // Validierung der Schülerdaten
    for (const student of students) {
      if (!student.email || !student.name) {
        return NextResponse.json(
          { error: "Each student must have email and name" },
          { status: 400 }
        );
      }
    }

    // Prüfen ob Lehrer Zugriff auf die Klasse hat
    const hasAccess = await teacherHasAccessToClass(userId, classId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - No access to this class" },
        { status: 403 }
      );
    }

    // Schüler bulk erstellen
    const results = await createStudentsBulk(
      students,
      classId,
      teacherData.schuleId,
      userId,
      teacherData.name
    );

    // Ergebnisse aufteilen
    const successful = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);

    return NextResponse.json({
      message: `${successful.length} von ${students.length} Schülern erstellt`,
      successful,
      failed,
      totalCreated: successful.length,
      totalFailed: failed.length,
    });
  } catch (error) {
    console.error("Error bulk creating students:", error);
    return NextResponse.json(
      { error: "Failed to create students" },
      { status: 500 }
    );
  }
}
