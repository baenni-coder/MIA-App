import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getSchoolFile,
  updateSchoolFile,
  deleteSchoolFile,
  canAccessSchoolFile,
  canDeleteSchoolFile,
} from "@/lib/firestore/school-files";
import {
  deleteSchoolFileFromStorage,
  refreshSchoolFileUrl,
} from "@/lib/storage/school-files";
import { logFileDeletion } from "@/lib/audit/logger";
import { FileShareLevel } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/school-files/[id]
 * Holt eine einzelne Datei inkl. frischer Download-URL
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;

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
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Hole Teacher-Profil
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const teacher = teacherDoc.data()!;
    const schuleId = teacher.schuleId;

    // Prüfe Zugriffsberechtigung
    const canAccess = await canAccessSchoolFile(fileId, userId, schuleId);
    if (!canAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Hole Datei
    const file = await getSchoolFile(fileId);
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Generiere frische Download-URL
    const freshUrl = await refreshSchoolFileUrl(file.storagePath);

    return NextResponse.json(
      {
        ...file,
        storageUrl: freshUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/school-files/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/school-files/[id]
 * Aktualisiert eine Datei (Name, Beschreibung, Freigabe, verknüpfte Themen)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;

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
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Hole aktuelle Datei
    const file = await getSchoolFile(fileId);
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Nur der Uploader darf bearbeiten
    if (file.uploadedBy !== userId) {
      return NextResponse.json(
        { error: "Only the uploader can edit this file" },
        { status: 403 }
      );
    }

    // Parse Request Body
    const body = await request.json();
    const {
      name,
      description,
      sharedWith,
      linkedThemeIds,
      linkedThemeNames,
    } = body;

    // Validierung
    if (sharedWith && !["private", "school"].includes(sharedWith)) {
      return NextResponse.json(
        { error: "Invalid sharedWith value" },
        { status: 400 }
      );
    }

    // Baue Update-Objekt
    const updates: {
      name?: string;
      description?: string;
      sharedWith?: FileShareLevel;
      linkedThemeIds?: string[];
      linkedThemeNames?: string[];
    } = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (sharedWith !== undefined) updates.sharedWith = sharedWith;
    if (linkedThemeIds !== undefined) updates.linkedThemeIds = linkedThemeIds;
    if (linkedThemeNames !== undefined) updates.linkedThemeNames = linkedThemeNames;

    // Update durchführen
    await updateSchoolFile(fileId, updates);

    return NextResponse.json(
      {
        success: true,
        message: "Datei erfolgreich aktualisiert",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/school-files/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/school-files/[id]
 * Löscht eine Datei (Metadaten + Storage)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;

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
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Hole Teacher-Profil für Rolle und Schule
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const teacher = teacherDoc.data()!;
    const schuleId = teacher.schuleId;
    const userRole = teacher.role;

    // Hole Datei-Informationen für Audit-Log
    const file = await getSchoolFile(fileId);
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Prüfe Löschberechtigung
    const canDelete = await canDeleteSchoolFile(fileId, userId, userRole, schuleId);
    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete this file" },
        { status: 403 }
      );
    }

    // Lösche aus Firestore (gibt Storage-Pfad zurück)
    const storagePath = await deleteSchoolFile(fileId);

    if (!storagePath) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Lösche aus Firebase Storage
    try {
      await deleteSchoolFileFromStorage(storagePath);
    } catch (storageError) {
      console.error("Error deleting from storage:", storageError);
      // Metadaten sind gelöscht, Storage-Fehler loggen aber nicht werfen
    }

    // Audit-Log
    await logFileDeletion(userId, teacher.name || "Unknown", fileId, file.name);

    return NextResponse.json(
      {
        success: true,
        message: "Datei erfolgreich gelöscht",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/school-files/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
