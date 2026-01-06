import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

/**
 * POST /api/classes/[id]/transfer
 * Übergibt eine Klasse an eine andere Lehrperson
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;

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

    // Aktuelle Benutzer-Rolle laden
    const userDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    const userRole = userData.role;
    const userSchoolId = userData.schuleId;

    // Klasse laden
    const classDoc = await adminDb.collection("classes").doc(classId).get();
    if (!classDoc.exists) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    const classData = classDoc.data()!;

    // Berechtigung prüfen: Nur Besitzer, PICTS-Admin (gleiche Schule) oder Super-Admin
    const isOwner = classData.teacherId === userId;
    const isPictsAdminSameSchool = userRole === "picts_admin" && classData.schoolId === userSchoolId;
    const isSuperAdmin = userRole === "super_admin";

    if (!isOwner && !isPictsAdminSameSchool && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Not authorized to transfer this class" },
        { status: 403 }
      );
    }

    // Request Body parsen
    const { newTeacherId } = await request.json();

    if (!newTeacherId) {
      return NextResponse.json(
        { error: "newTeacherId is required" },
        { status: 400 }
      );
    }

    // Neue Lehrperson laden und prüfen
    const newTeacherDoc = await adminDb.collection("teachers").doc(newTeacherId).get();
    if (!newTeacherDoc.exists) {
      return NextResponse.json(
        { error: "New teacher not found" },
        { status: 404 }
      );
    }

    const newTeacherData = newTeacherDoc.data()!;

    // Prüfen ob neue Lehrperson zur gleichen Schule gehört
    // (Super-Admins können Klassen schulübergreifend übertragen)
    if (!isSuperAdmin && newTeacherData.schuleId !== classData.schoolId) {
      return NextResponse.json(
        { error: "New teacher must be from the same school" },
        { status: 400 }
      );
    }

    // Klasse übertragen
    await adminDb.collection("classes").doc(classId).update({
      teacherId: newTeacherId,
      teacherName: newTeacherData.name || newTeacherData.email,
      updatedAt: new Date(),
    });

    // Auch alle Schüler der Klasse aktualisieren
    const studentsSnapshot = await adminDb
      .collection("students")
      .where("classId", "==", classId)
      .get();

    const batch = adminDb.batch();
    studentsSnapshot.docs.forEach((studentDoc) => {
      batch.update(studentDoc.ref, {
        teacherId: newTeacherId,
        teacherName: newTeacherData.name || newTeacherData.email,
      });
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error transferring class:", error);
    return NextResponse.json(
      { error: "Failed to transfer class" },
      { status: 500 }
    );
  }
}
