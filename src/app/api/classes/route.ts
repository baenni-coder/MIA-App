import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createClass,
  getClassesByTeacher,
  getClassesBySchool,
} from "@/lib/firestore/classes";
import { Stufe } from "@/types";

/**
 * GET /api/classes
 * Query params:
 * - teacherId: Klassen einer bestimmten Lehrperson
 * - schoolId: Klassen einer bestimmten Schule
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

    const userId = decodedToken.uid;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const schoolId = searchParams.get("schoolId");

    // Lehrer-Profil laden für Berechtigungsprüfung
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const teacherData = teacherDoc.data()!;
    const userRole = teacherData.role;

    // Klassen laden basierend auf Query-Parameter
    let classes;

    if (teacherId) {
      // Nur eigene Klassen oder als Admin alle
      if (teacherId !== userId && userRole !== "picts_admin" && userRole !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden - Cannot view other teachers' classes" },
          { status: 403 }
        );
      }
      classes = await getClassesByTeacher(teacherId);
    } else if (schoolId) {
      // Nur Klassen der eigenen Schule oder als Admin
      if (schoolId !== teacherData.schuleId && userRole !== "picts_admin" && userRole !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden - Cannot view other schools' classes" },
          { status: 403 }
        );
      }
      classes = await getClassesBySchool(schoolId);
    } else {
      // Standard: eigene Klassen
      classes = await getClassesByTeacher(userId);
    }

    return NextResponse.json({ classes });
  } catch (error) {
    console.error("Error getting classes:", error);
    return NextResponse.json(
      { error: "Failed to get classes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/classes
 * Erstellt eine neue Klasse
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
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const teacherData = teacherDoc.data()!;

    // Request Body parsen
    const { name, displayName, grade } = await request.json();

    if (!name || !grade) {
      return NextResponse.json(
        { error: "Name and grade are required" },
        { status: 400 }
      );
    }

    // Klasse erstellen
    const classId = await createClass({
      name,
      displayName,
      grade: grade as Stufe,
      schoolId: teacherData.schuleId,
      teacherId: userId,
      teacherName: teacherData.name,
    });

    return NextResponse.json({ id: classId }, { status: 201 });
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}
