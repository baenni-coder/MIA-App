import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createStudent,
  getStudentById,
  getStudentsByClass,
  getStudentsByTeacher,
} from "@/lib/firestore/students";
import { teacherHasAccessToClass } from "@/lib/firestore/classes";

/**
 * GET /api/students
 * Query params:
 * - userId: Einzelner Schüler (für AuthContext)
 * - classId: Schüler einer Klasse
 * - teacherId: Alle Schüler einer Lehrperson
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
    const userId = searchParams.get("userId");
    const classId = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");

    // Einzelner Schüler (für AuthContext)
    if (userId) {
      // Nur eigenen Datensatz oder als Lehrer
      if (userId !== authenticatedUserId) {
        // Prüfen ob der authentifizierte User ein Lehrer ist
        const adminDb = getAdminDb();
        const teacherDoc = await adminDb
          .collection("teachers")
          .doc(authenticatedUserId)
          .get();

        if (!teacherDoc.exists) {
          return NextResponse.json(
            { error: "Forbidden - Cannot view other students" },
            { status: 403 }
          );
        }
      }

      const student = await getStudentById(userId);
      if (!student) {
        // Kein Schüler gefunden - return empty (nicht error für AuthContext)
        return NextResponse.json({});
      }
      return NextResponse.json(student);
    }

    // Schüler einer Klasse
    if (classId) {
      // Prüfen ob der Lehrer Zugriff auf die Klasse hat
      const hasAccess = await teacherHasAccessToClass(authenticatedUserId, classId);
      if (!hasAccess) {
        // Admin-Check
        const adminDb = getAdminDb();
        const teacherDoc = await adminDb
          .collection("teachers")
          .doc(authenticatedUserId)
          .get();

        if (!teacherDoc.exists) {
          return NextResponse.json(
            { error: "Forbidden - No access to this class" },
            { status: 403 }
          );
        }

        const teacherData = teacherDoc.data()!;
        if (teacherData.role !== "picts_admin" && teacherData.role !== "super_admin") {
          return NextResponse.json(
            { error: "Forbidden - No access to this class" },
            { status: 403 }
          );
        }
      }

      const students = await getStudentsByClass(classId);
      return NextResponse.json({ students });
    }

    // Alle Schüler einer Lehrperson
    if (teacherId) {
      // Nur eigene Schüler oder als Admin
      if (teacherId !== authenticatedUserId) {
        const adminDb = getAdminDb();
        const teacherDoc = await adminDb
          .collection("teachers")
          .doc(authenticatedUserId)
          .get();

        if (!teacherDoc.exists) {
          return NextResponse.json(
            { error: "Forbidden - Cannot view other teachers' students" },
            { status: 403 }
          );
        }

        const teacherData = teacherDoc.data()!;
        if (teacherData.role !== "picts_admin" && teacherData.role !== "super_admin") {
          return NextResponse.json(
            { error: "Forbidden - Cannot view other teachers' students" },
            { status: 403 }
          );
        }
      }

      const students = await getStudentsByTeacher(teacherId);
      return NextResponse.json({ students });
    }

    // Default: Alle Schüler des authentifizierten Lehrers
    const students = await getStudentsByTeacher(authenticatedUserId);
    return NextResponse.json({ students });
  } catch (error) {
    console.error("Error getting students:", error);
    return NextResponse.json(
      { error: "Failed to get students" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/students
 * Erstellt einen neuen Schüler
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
    const { email, name, classId, password } = await request.json();

    if (!email || !name || !classId) {
      return NextResponse.json(
        { error: "Email, name, and classId are required" },
        { status: 400 }
      );
    }

    // Prüfen ob Lehrer Zugriff auf die Klasse hat
    const hasAccess = await teacherHasAccessToClass(userId, classId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - No access to this class" },
        { status: 403 }
      );
    }

    // Schüler erstellen
    try {
      const result = await createStudent({
        email,
        name,
        classId,
        schoolId: teacherData.schuleId,
        teacherId: userId,
        teacherName: teacherData.name,
        password, // Optional
      });

      return NextResponse.json(
        {
          id: result.studentId,
          password: result.password,
          message: "Schüler erfolgreich erstellt",
        },
        { status: 201 }
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("existiert bereits")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    );
  }
}
