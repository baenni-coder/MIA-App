import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getClassById,
  updateClass,
  deleteClass,
  teacherHasAccessToClass,
} from "@/lib/firestore/classes";
import { getStudentsByClass } from "@/lib/firestore/students";
import { Stufe } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/classes/[id]
 * Lädt eine einzelne Klasse mit optionalen Schülern
 * Erlaubt Zugriff für: Lehrer (mit Klassenzugang), Admins, Schüler (nur eigene Klasse)
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
    const adminDb = getAdminDb();

    // Prüfen ob es ein Lehrer ist
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (teacherDoc.exists) {
      // Lehrer-Logik
      const teacherData = teacherDoc.data()!;
      const userRole = teacherData.role;

      // Zugriffsprüfung für Lehrer
      const hasAccess = await teacherHasAccessToClass(userId, id);
      if (!hasAccess && userRole !== "picts_admin" && userRole !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden - No access to this class" },
          { status: 403 }
        );
      }
    } else {
      // Prüfen ob es ein Schüler ist
      const studentDoc = await adminDb.collection("students").doc(userId).get();

      if (!studentDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const studentData = studentDoc.data()!;

      // Schüler dürfen nur ihre eigene Klasse abrufen
      if (studentData.classId !== id) {
        return NextResponse.json(
          { error: "Forbidden - Students can only access their own class" },
          { status: 403 }
        );
      }
    }

    // Klasse laden
    const schoolClass = await getClassById(id);
    if (!schoolClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Optional: Schüler laden (nur für Lehrer)
    const { searchParams } = new URL(request.url);
    const includeStudents = searchParams.get("includeStudents") === "true";

    if (includeStudents && teacherDoc.exists) {
      const students = await getStudentsByClass(id);
      return NextResponse.json({ class: schoolClass, students });
    }

    return NextResponse.json({ class: schoolClass });
  } catch (error) {
    console.error("Error getting class:", error);
    return NextResponse.json({ error: "Failed to get class" }, { status: 500 });
  }
}

/**
 * PUT /api/classes/[id]
 * Aktualisiert eine Klasse
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

    // Zugriffsprüfung
    const hasAccess = await teacherHasAccessToClass(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - No access to this class" },
        { status: 403 }
      );
    }

    // Request Body parsen
    const { name, displayName, grade } = await request.json();

    // Klasse aktualisieren
    await updateClass(id, {
      ...(name && { name }),
      ...(displayName && { displayName }),
      ...(grade && { grade: grade as Stufe }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating class:", error);
    return NextResponse.json(
      { error: "Failed to update class" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/classes/[id]
 * Löscht eine Klasse (nur wenn keine Schüler mehr)
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

    // Zugriffsprüfung
    const hasAccess = await teacherHasAccessToClass(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - No access to this class" },
        { status: 403 }
      );
    }

    // Klasse löschen
    try {
      await deleteClass(id);
      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("students")) {
        return NextResponse.json(
          { error: "Klasse kann nicht gelöscht werden, da noch Schüler zugewiesen sind" },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}
