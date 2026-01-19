import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getStudentBadgesForClass,
  awardBadge,
  revokeBadge,
  getStudentBadges,
} from "@/lib/firestore/student-progress";
import { notifyStudentBadgeEarned } from "@/lib/firestore/notifications";
import { BadgeRarity } from "@/types";

/**
 * GET /api/student-badges
 * Holt alle vergebenen Badges für einen Schüler oder eine Klasse
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");

    // Lehrer-Daten holen für Berechtigungsprüfung
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Lehrer nicht gefunden" },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data()!;

    if (classId) {
      // Klasse prüfen
      const classDoc = await adminDb.collection("classes").doc(classId).get();
      if (!classDoc.exists) {
        return NextResponse.json(
          { error: "Klasse nicht gefunden" },
          { status: 404 }
        );
      }

      const classData = classDoc.data()!;

      // Berechtigung: Eigene Klasse oder Admin der Schule
      if (
        classData.teacherId !== userId &&
        classData.schoolId !== teacherData.schuleId
      ) {
        return NextResponse.json(
          { error: "Keine Berechtigung" },
          { status: 403 }
        );
      }

      const studentBadges = await getStudentBadgesForClass(classId);
      return NextResponse.json({ studentBadges });
    }

    if (studentId) {
      // Einzelner Schüler
      const badges = await getStudentBadges(studentId);
      return NextResponse.json({ badges });
    }

    return NextResponse.json(
      { error: "classId oder studentId erforderlich" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching student badges:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Badges" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student-badges
 * Vergibt ein Badge an einen Schüler manuell
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Lehrer-Daten holen
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Lehrer nicht gefunden" },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data()!;

    // Body parsen
    const body = await request.json();
    const { studentId, badgeId, reason } = body;

    if (!studentId || !badgeId) {
      return NextResponse.json(
        { error: "studentId und badgeId sind erforderlich" },
        { status: 400 }
      );
    }

    // Schüler prüfen
    const studentDoc = await adminDb.collection("students").doc(studentId).get();
    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "Schüler nicht gefunden" },
        { status: 404 }
      );
    }

    const studentData = studentDoc.data()!;

    // Berechtigung: Schüler muss zur gleichen Schule gehören
    if (studentData.schoolId !== teacherData.schuleId) {
      return NextResponse.json(
        { error: "Schüler gehört zu einer anderen Schule" },
        { status: 403 }
      );
    }

    // Badge-Daten holen
    const badgeDoc = await adminDb.collection("badges").doc(badgeId).get();
    if (!badgeDoc.exists) {
      return NextResponse.json(
        { error: "Badge nicht gefunden" },
        { status: 404 }
      );
    }

    const badgeData = badgeDoc.data()!;

    // Badge vergeben
    const studentBadgeId = await awardBadge({
      studentId,
      studentName: studentData.name,
      badgeId,
      badgeName: badgeData.name,
      badgeEmoji: badgeData.emoji,
      badgeRarity: badgeData.rarity as BadgeRarity,
      awardedBy: userId,
      awardedByName: teacherData.name || "Lehrer",
      reason: reason || `Manuell vergeben von ${teacherData.name || "Lehrer"}`,
    });

    // Benachrichtigung an den Schüler senden
    await notifyStudentBadgeEarned({
      studentId,
      badgeName: badgeData.name,
      badgeEmoji: badgeData.emoji,
    });

    return NextResponse.json({ id: studentBadgeId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("Error awarding badge:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/student-badges
 * Entfernt ein Badge von einem Schüler
 */
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Lehrer-Daten holen
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Lehrer nicht gefunden" },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data()!;

    // Body parsen
    const body = await request.json();
    const { studentBadgeId, studentId } = body;

    if (!studentBadgeId) {
      return NextResponse.json(
        { error: "studentBadgeId ist erforderlich" },
        { status: 400 }
      );
    }

    // Schüler prüfen wenn studentId angegeben
    if (studentId) {
      const studentDoc = await adminDb.collection("students").doc(studentId).get();
      if (studentDoc.exists) {
        const studentData = studentDoc.data()!;
        if (studentData.schoolId !== teacherData.schuleId) {
          return NextResponse.json(
            { error: "Schüler gehört zu einer anderen Schule" },
            { status: 403 }
          );
        }
      }
    }

    await revokeBadge(studentBadgeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking badge:", error);
    return NextResponse.json(
      { error: "Fehler beim Entfernen des Badges" },
      { status: 500 }
    );
  }
}
