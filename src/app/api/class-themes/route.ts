import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  markThemeAsCompleted,
  unmarkThemeAsCompleted,
  getCompletedThemesForClass,
} from "@/lib/firestore/student-progress";
import { teacherHasAccessToClass, getClassById } from "@/lib/firestore/classes";
import { notifyClassThemeCompleted } from "@/lib/firestore/notifications";

/**
 * GET /api/class-themes
 * Query params:
 * - classId: Klassen-ID (required)
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

    if (!classId) {
      return NextResponse.json(
        { error: "classId is required" },
        { status: 400 }
      );
    }

    // Zugriffsprüfung
    const hasAccess = await teacherHasAccessToClass(authenticatedUserId, classId);
    if (!hasAccess) {
      // Admin-Check
      const adminDb = getAdminDb();
      const teacherDoc = await adminDb
        .collection("teachers")
        .doc(authenticatedUserId)
        .get();

      if (!teacherDoc.exists) {
        // Prüfen ob der User ein Schüler dieser Klasse ist
        const studentDoc = await adminDb
          .collection("students")
          .doc(authenticatedUserId)
          .get();

        if (!studentDoc.exists || studentDoc.data()?.classId !== classId) {
          return NextResponse.json(
            { error: "Forbidden - No access to this class" },
            { status: 403 }
          );
        }
      } else {
        const teacherData = teacherDoc.data()!;
        if (
          teacherData.role !== "picts_admin" &&
          teacherData.role !== "super_admin"
        ) {
          return NextResponse.json(
            { error: "Forbidden - No access to this class" },
            { status: 403 }
          );
        }
      }
    }

    // Hole bearbeitete Themen
    const themes = await getCompletedThemesForClass(classId);

    return NextResponse.json({ themes });
  } catch (error) {
    console.error("Error getting class themes:", error);
    return NextResponse.json(
      { error: "Failed to get class themes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/class-themes
 * Body: { classId, themeId, themeName, themeDescription?, competencyIds, competencyNames?, zeitraum? }
 * Markiert ein Thema als bearbeitet
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
    const {
      classId,
      themeId,
      themeName,
      themeDescription,
      competencyIds,
      competencyNames,
      zeitraum,
    } = await request.json();

    if (!classId || !themeId || !themeName) {
      return NextResponse.json(
        { error: "classId, themeId, and themeName are required" },
        { status: 400 }
      );
    }

    // Zugriffsprüfung: Nur Lehrer mit Zugriff auf die Klasse
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
          { error: "Forbidden - Only teachers can mark themes" },
          { status: 403 }
        );
      }

      const teacherData = teacherDoc.data()!;
      if (
        teacherData.role !== "picts_admin" &&
        teacherData.role !== "super_admin"
      ) {
        return NextResponse.json(
          { error: "Forbidden - No access to this class" },
          { status: 403 }
        );
      }
    }

    // Hole Lehrer-Daten
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb
      .collection("teachers")
      .doc(authenticatedUserId)
      .get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data()!;

    // Hole Klassen-Daten
    const schoolClass = await getClassById(classId);
    if (!schoolClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Markiere Thema als bearbeitet
    try {
      console.log("[class-themes] Marking theme:", {
        classId,
        themeId,
        themeName,
        competencyCount: (competencyIds || []).length,
      });

      const id = await markThemeAsCompleted({
        classId,
        className: schoolClass.displayName || schoolClass.name,
        themeId,
        themeName,
        themeDescription,
        competencyIds: competencyIds || [],
        competencyNames,
        zeitraum,
        markedCompletedBy: authenticatedUserId,
        markedCompletedByName: teacherData.name,
      });

      console.log("[class-themes] Theme marked successfully, id:", id);

      // Benachrichtige alle Schüler der Klasse
      try {
        await notifyClassThemeCompleted({
          classId,
          themeName,
          teacherName: teacherData.name,
        });
        console.log("[class-themes] Notifications sent");
      } catch (notifyError) {
        console.error("[class-themes] Notification error (non-fatal):", notifyError);
        // Notification failure should not block the response
      }

      return NextResponse.json({ success: true, id });
    } catch (error) {
      if (error instanceof Error && error.message.includes("bereits")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error marking theme as completed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to mark theme as completed", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/class-themes
 * Query params:
 * - classId: Klassen-ID (required)
 * - themeId: Themen-ID (required)
 */
export async function DELETE(request: Request) {
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
    const themeId = searchParams.get("themeId");

    if (!classId || !themeId) {
      return NextResponse.json(
        { error: "classId and themeId are required" },
        { status: 400 }
      );
    }

    // Zugriffsprüfung: Nur Lehrer mit Zugriff auf die Klasse
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
          { error: "Forbidden - Only teachers can unmark themes" },
          { status: 403 }
        );
      }

      const teacherData = teacherDoc.data()!;
      if (
        teacherData.role !== "picts_admin" &&
        teacherData.role !== "super_admin"
      ) {
        return NextResponse.json(
          { error: "Forbidden - No access to this class" },
          { status: 403 }
        );
      }
    }

    // Entferne Markierung
    try {
      await unmarkThemeAsCompleted(classId, themeId);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("nicht")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error unmarking theme:", error);
    return NextResponse.json(
      { error: "Failed to unmark theme" },
      { status: 500 }
    );
  }
}
