import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getArtifactById,
  updateArtifact,
  deleteArtifact,
  studentHasAccessToArtifact,
  teacherHasAccessToArtifact,
} from "@/lib/firestore/student-artifacts";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/student-artifacts/[id]
 * Lädt ein einzelnes Artefakt
 */
export async function GET(request: Request, context: RouteContext) {
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

    // Artefakt laden
    const artifact = await getArtifactById(id);
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    // Zugriffsprüfung
    const studentDoc = await adminDb.collection("students").doc(userId).get();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (studentDoc.exists) {
      // Schüler: nur eigene Artefakte
      if (artifact.studentId !== userId) {
        return NextResponse.json(
          { error: "Forbidden - Students can only view their own artifacts" },
          { status: 403 }
        );
      }
    } else if (teacherDoc.exists) {
      // Lehrer: Artefakte ihrer Schüler
      const hasAccess = await teacherHasAccessToArtifact(userId, id);
      const teacherData = teacherDoc.data()!;
      const userRole = teacherData.role;

      if (!hasAccess && userRole !== "picts_admin" && userRole !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden - No access to this artifact" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ artifact });
  } catch (error) {
    console.error("Error fetching artifact:", error);
    return NextResponse.json(
      { error: "Failed to fetch artifact" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/student-artifacts/[id]
 * Aktualisiert ein Artefakt (nur Schüler: eigene Artefakte)
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

    // Nur Schüler können ihre eigenen Artefakte bearbeiten
    const studentDoc = await adminDb.collection("students").doc(userId).get();
    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "Forbidden - Only students can update their artifacts" },
        { status: 403 }
      );
    }

    // Prüfen ob das Artefakt dem Schüler gehört
    const hasAccess = await studentHasAccessToArtifact(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - Not your artifact" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, linkedThemeIds, linkedThemeNames } = body;

    const updateData: Parameters<typeof updateArtifact>[1] = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (linkedThemeIds !== undefined) updateData.linkedThemeIds = linkedThemeIds;
    if (linkedThemeNames !== undefined) updateData.linkedThemeNames = linkedThemeNames;

    await updateArtifact(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating artifact:", error);
    return NextResponse.json(
      { error: "Failed to update artifact" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student-artifacts/[id]
 * Löscht ein Artefakt (Schüler: eigene, Lehrer: ihrer Klassen)
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

    // Artefakt laden für Storage-Cleanup
    const artifact = await getArtifactById(id);
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    // Zugriffsprüfung
    const studentDoc = await adminDb.collection("students").doc(userId).get();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (studentDoc.exists) {
      // Schüler: nur eigene Artefakte löschen
      if (artifact.studentId !== userId) {
        return NextResponse.json(
          { error: "Forbidden - Students can only delete their own artifacts" },
          { status: 403 }
        );
      }
    } else if (teacherDoc.exists) {
      // Lehrer: Artefakte ihrer Schüler löschen
      const hasAccess = await teacherHasAccessToArtifact(userId, id);
      const teacherData = teacherDoc.data()!;
      const userRole = teacherData.role;

      if (!hasAccess && userRole !== "picts_admin" && userRole !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden - No access to this artifact" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // TODO: Storage-Cleanup (Datei aus Firebase Storage löschen)
    // if (artifact.storagePath) {
    //   const storage = getAdminStorage();
    //   await storage.bucket().file(artifact.storagePath).delete();
    // }

    await deleteArtifact(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting artifact:", error);
    return NextResponse.json(
      { error: "Failed to delete artifact" },
      { status: 500 }
    );
  }
}
