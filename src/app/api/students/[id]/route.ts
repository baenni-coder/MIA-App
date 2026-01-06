import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getStudentById,
  updateStudent,
  deleteStudent,
  resetStudentPassword,
  teacherHasAccessToStudent,
} from "@/lib/firestore/students";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/students/[id]
 * Lädt einen einzelnen Schüler
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    // Zugriffsprüfung: eigener Datensatz oder Lehrer mit Zugriff
    if (userId !== id) {
      const hasAccess = await teacherHasAccessToStudent(userId, id);
      if (!hasAccess) {
        // Admin-Check
        const adminDb = getAdminDb();
        const teacherDoc = await adminDb
          .collection("teachers")
          .doc(userId)
          .get();

        if (!teacherDoc.exists) {
          return NextResponse.json(
            { error: "Forbidden - No access to this student" },
            { status: 403 }
          );
        }

        const teacherData = teacherDoc.data()!;
        if (
          teacherData.role !== "picts_admin" &&
          teacherData.role !== "super_admin"
        ) {
          return NextResponse.json(
            { error: "Forbidden - No access to this student" },
            { status: 403 }
          );
        }
      }
    }

    // Schüler laden
    const student = await getStudentById(id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Error getting student:", error);
    return NextResponse.json(
      { error: "Failed to get student" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/students/[id]
 * Aktualisiert einen Schüler
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    // Zugriffsprüfung: nur Lehrer mit Zugriff
    const hasAccess = await teacherHasAccessToStudent(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - No access to this student" },
        { status: 403 }
      );
    }

    // Request Body parsen
    const { name, classId } = await request.json();

    // Schüler aktualisieren
    await updateStudent(id, {
      ...(name && { name }),
      ...(classId && { classId }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/students/[id]
 * Löscht einen Schüler
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    // Zugriffsprüfung: nur Lehrer mit Zugriff
    const hasAccess = await teacherHasAccessToStudent(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - No access to this student" },
        { status: 403 }
      );
    }

    // Schüler löschen
    await deleteStudent(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/students/[id]
 * Spezielle Aktionen: Passwort zurücksetzen
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    // Zugriffsprüfung: nur Lehrer mit Zugriff
    const hasAccess = await teacherHasAccessToStudent(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - No access to this student" },
        { status: 403 }
      );
    }

    // Request Body parsen
    const { action } = await request.json();

    if (action === "resetPassword") {
      const result = await resetStudentPassword(id);
      return NextResponse.json({
        password: result.password,
        message: "Passwort erfolgreich zurückgesetzt",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error with student action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
