import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createArtifact,
  getArtifactsByStudent,
  getArtifactsByStudentAndCompetency,
  getArtifactsByClass,
} from "@/lib/firestore/student-artifacts";
import { ArtifactType } from "@/types";

/**
 * GET /api/student-artifacts
 * Lädt Artefakte basierend auf Query-Parametern
 * - studentId: Alle Artefakte eines Schülers (Schüler: nur eigene)
 * - studentId + competencyId: Artefakte für eine Kompetenz
 * - classId: Alle Artefakte einer Klasse (nur Lehrer)
 */
export async function GET(request: Request) {
  try {
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

    // Prüfen ob Schüler oder Lehrer
    const studentDoc = await adminDb.collection("students").doc(userId).get();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    const isStudent = studentDoc.exists;
    const isTeacher = teacherDoc.exists;

    if (!isStudent && !isTeacher) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const competencyId = searchParams.get("competencyId");
    const classId = searchParams.get("classId");

    // Schüler können nur eigene Artefakte sehen
    if (isStudent) {
      if (studentId && studentId !== userId) {
        return NextResponse.json(
          { error: "Forbidden - Students can only view their own artifacts" },
          { status: 403 }
        );
      }

      if (competencyId) {
        const artifacts = await getArtifactsByStudentAndCompetency(userId, competencyId);
        return NextResponse.json({ artifacts });
      }

      const artifacts = await getArtifactsByStudent(userId);
      return NextResponse.json({ artifacts });
    }

    // Lehrer können Artefakte ihrer Klassen sehen
    if (isTeacher) {
      if (classId) {
        // Prüfen ob Lehrer Zugriff auf die Klasse hat
        const classDoc = await adminDb.collection("classes").doc(classId).get();
        if (!classDoc.exists) {
          return NextResponse.json({ error: "Class not found" }, { status: 404 });
        }

        const classData = classDoc.data()!;
        const teacherData = teacherDoc.data()!;
        const userRole = teacherData.role;

        if (classData.teacherId !== userId && userRole !== "picts_admin" && userRole !== "super_admin") {
          return NextResponse.json(
            { error: "Forbidden - No access to this class" },
            { status: 403 }
          );
        }

        const artifacts = await getArtifactsByClass(classId);
        return NextResponse.json({ artifacts });
      }

      if (studentId) {
        // Prüfen ob der Schüler in einer Klasse des Lehrers ist
        const targetStudentDoc = await adminDb.collection("students").doc(studentId).get();
        if (!targetStudentDoc.exists) {
          return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const targetStudentData = targetStudentDoc.data()!;
        const classDoc = await adminDb.collection("classes").doc(targetStudentData.classId).get();

        if (classDoc.exists) {
          const classData = classDoc.data()!;
          const teacherData = teacherDoc.data()!;
          const userRole = teacherData.role;

          if (classData.teacherId !== userId && userRole !== "picts_admin" && userRole !== "super_admin") {
            return NextResponse.json(
              { error: "Forbidden - No access to this student" },
              { status: 403 }
            );
          }
        }

        if (competencyId) {
          const artifacts = await getArtifactsByStudentAndCompetency(studentId, competencyId);
          return NextResponse.json({ artifacts });
        }

        const artifacts = await getArtifactsByStudent(studentId);
        return NextResponse.json({ artifacts });
      }

      return NextResponse.json(
        { error: "Missing required parameter: studentId or classId" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  } catch (error) {
    console.error("Error fetching artifacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch artifacts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student-artifacts
 * Erstellt ein neues Artefakt (nur für Schüler)
 */
export async function POST(request: Request) {
  try {
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

    // Nur Schüler können Artefakte erstellen
    const studentDoc = await adminDb.collection("students").doc(userId).get();
    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "Forbidden - Only students can create artifacts" },
        { status: 403 }
      );
    }

    const studentData = studentDoc.data()!;
    const body = await request.json();

    const {
      competencyId,
      competencyName,
      type,
      title,
      description,
      storagePath,
      storageUrl,
      contentType,
      size,
      url,
      linkedThemeIds,
      linkedThemeNames,
    } = body;

    // Validierung
    if (!competencyId || !competencyName || !type || !title) {
      return NextResponse.json(
        { error: "Missing required fields: competencyId, competencyName, type, title" },
        { status: 400 }
      );
    }

    if (!["image", "pdf", "link"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be: image, pdf, or link" },
        { status: 400 }
      );
    }

    // Für Dateien: storagePath und storageUrl erforderlich
    if ((type === "image" || type === "pdf") && (!storagePath || !storageUrl)) {
      return NextResponse.json(
        { error: "Missing storagePath or storageUrl for file artifact" },
        { status: 400 }
      );
    }

    // Für Links: url erforderlich
    if (type === "link" && !url) {
      return NextResponse.json(
        { error: "Missing url for link artifact" },
        { status: 400 }
      );
    }

    // Größenbeschränkung (20 MB)
    if (size && size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20 MB" },
        { status: 400 }
      );
    }

    // Artefakt erstellen
    const artifactData: Parameters<typeof createArtifact>[0] = {
      studentId: userId,
      studentName: studentData.name,
      classId: studentData.classId,
      competencyId,
      competencyName,
      type: type as ArtifactType,
      title,
    };

    // Optionale Felder hinzufügen
    if (description) artifactData.description = description;
    if (storagePath) artifactData.storagePath = storagePath;
    if (storageUrl) artifactData.storageUrl = storageUrl;
    if (contentType) artifactData.contentType = contentType;
    if (size) artifactData.size = size;
    if (url) artifactData.url = url;
    if (linkedThemeIds) artifactData.linkedThemeIds = linkedThemeIds;
    if (linkedThemeNames) artifactData.linkedThemeNames = linkedThemeNames;

    const id = await createArtifact(artifactData);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error creating artifact:", error);
    return NextResponse.json(
      { error: "Failed to create artifact" },
      { status: 500 }
    );
  }
}
