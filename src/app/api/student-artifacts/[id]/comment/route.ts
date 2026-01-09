import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getArtifactById,
  addTeacherComment,
  removeTeacherComment,
  teacherHasAccessToArtifact,
} from "@/lib/firestore/student-artifacts";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/student-artifacts/[id]/comment
 * Fügt einen Lehrer-Kommentar zu einem Artefakt hinzu
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    // Nur Lehrer können kommentieren
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Forbidden - Only teachers can comment on artifacts" },
        { status: 403 }
      );
    }

    const teacherData = teacherDoc.data()!;
    const userRole = teacherData.role;

    // Prüfen ob das Artefakt existiert
    const artifact = await getArtifactById(id);
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    // Zugriffsprüfung
    const hasAccess = await teacherHasAccessToArtifact(userId, id);
    if (!hasAccess && userRole !== "picts_admin" && userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - No access to this artifact" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { comment } = body;

    if (!comment || typeof comment !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid comment" },
        { status: 400 }
      );
    }

    await addTeacherComment(id, userId, teacherData.name, comment);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student-artifacts/[id]/comment
 * Entfernt den Lehrer-Kommentar von einem Artefakt
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    // Nur Lehrer können Kommentare entfernen
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Forbidden - Only teachers can remove comments" },
        { status: 403 }
      );
    }

    const teacherData = teacherDoc.data()!;
    const userRole = teacherData.role;

    // Prüfen ob das Artefakt existiert
    const artifact = await getArtifactById(id);
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    // Nur der kommentierende Lehrer oder Admins können den Kommentar entfernen
    if (artifact.teacherCommentBy !== userId && userRole !== "picts_admin" && userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - You can only remove your own comments" },
        { status: 403 }
      );
    }

    await removeTeacherComment(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing comment:", error);
    return NextResponse.json(
      { error: "Failed to remove comment" },
      { status: 500 }
    );
  }
}
