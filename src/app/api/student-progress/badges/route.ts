import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getStudentBadges,
  getSystemBadges,
  initializeSystemBadges,
} from "@/lib/firestore/student-progress";
import { getStudentById } from "@/lib/firestore/students";

/**
 * GET /api/student-progress/badges
 * Query params:
 * - studentId: Schüler-ID (optional, für spezifische Badges)
 * - system: "true" um alle System-Badges zu laden
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
    const system = searchParams.get("system");

    // System-Badges laden
    if (system === "true") {
      const badges = await getSystemBadges();
      return NextResponse.json({ badges });
    }

    // Schüler-spezifische Badges laden
    if (!studentId) {
      return NextResponse.json(
        { error: "studentId or system=true is required" },
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
          { error: "Forbidden - Cannot view other students' badges" },
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
            { error: "Forbidden - Cannot view this student's badges" },
            { status: 403 }
          );
        }
      }
    }

    // Hole Badges des Schülers
    const badges = await getStudentBadges(studentId);

    return NextResponse.json({ badges });
  } catch (error) {
    console.error("Error getting badges:", error);
    return NextResponse.json(
      { error: "Failed to get badges" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student-progress/badges
 * Body: { action: "initialize" } - Initialisiert System-Badges (nur Admin)
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

    const authenticatedUserId = decodedToken.uid;
    const { action } = await request.json();

    if (action === "initialize") {
      // Nur Admins können Badges initialisieren
      const adminDb = getAdminDb();
      const teacherDoc = await adminDb
        .collection("teachers")
        .doc(authenticatedUserId)
        .get();

      if (!teacherDoc.exists) {
        return NextResponse.json(
          { error: "Forbidden - Only admins can initialize badges" },
          { status: 403 }
        );
      }

      const teacherData = teacherDoc.data()!;
      if (
        teacherData.role !== "picts_admin" &&
        teacherData.role !== "super_admin"
      ) {
        return NextResponse.json(
          { error: "Forbidden - Only admins can initialize badges" },
          { status: 403 }
        );
      }

      await initializeSystemBadges();
      return NextResponse.json({ success: true, message: "System badges initialized" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing badges action:", error);
    return NextResponse.json(
      { error: "Failed to process badges action" },
      { status: 500 }
    );
  }
}
