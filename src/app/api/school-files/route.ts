import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createSchoolFile,
  getSchoolFilesForUser,
  getSchoolFilesForTheme,
} from "@/lib/firestore/school-files";
import { uploadSchoolFile, validateSchoolFile } from "@/lib/storage/school-files";
import { FileShareLevel } from "@/types";

// Next.js 15 Route Segment Config
export const maxDuration = 60; // 60 Sekunden Timeout für Uploads
export const dynamic = "force-dynamic";

/**
 * GET /api/school-files
 * Holt alle Dateien für den aktuellen User (eigene + geteilte der Schule)
 *
 * Query Parameters:
 * - themeId: Optional - Nur Dateien für ein bestimmtes Thema
 */
export async function GET(request: NextRequest) {
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
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Hole Teacher-Profil für schuleId
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

    if (!schuleId) {
      return NextResponse.json(
        { error: "No school assigned to teacher" },
        { status: 400 }
      );
    }

    // Prüfe ob Schulzugehörigkeit genehmigt wurde
    if (teacher.schoolApproved === false) {
      return NextResponse.json(
        {
          error: "Ihre Schulzugehörigkeit wurde noch nicht genehmigt. Bitte warten Sie auf die Bestätigung durch einen Administrator.",
          schoolApprovalPending: true,
        },
        { status: 403 }
      );
    }

    // Check for themeId query parameter
    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get("themeId");

    // Hole Dateien - entweder für ein Thema oder alle
    const files = themeId
      ? await getSchoolFilesForTheme(themeId, userId, schuleId)
      : await getSchoolFilesForUser(userId, schuleId);

    return NextResponse.json({ files }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/school-files:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch school files" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school-files
 * Lädt eine neue Datei hoch
 *
 * Form Data:
 * - file: File (required) - Die hochzuladende Datei
 * - sharedWith: "private" | "school" (required)
 * - name: string (optional) - Custom Name
 * - description: string (optional)
 * - linkedThemeIds: string (optional) - Komma-separierte Theme-IDs
 */
export async function POST(request: NextRequest) {
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
    const teacherName = teacher.name;

    if (!schuleId) {
      return NextResponse.json(
        { error: "No school assigned to teacher" },
        { status: 400 }
      );
    }

    // Prüfe ob Schulzugehörigkeit genehmigt wurde
    if (teacher.schoolApproved === false) {
      return NextResponse.json(
        {
          error: "Ihre Schulzugehörigkeit wurde noch nicht genehmigt. Bitte warten Sie auf die Bestätigung durch einen Administrator.",
          schoolApprovalPending: true,
        },
        { status: 403 }
      );
    }

    // Parse Form Data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sharedWith = formData.get("sharedWith") as FileShareLevel;
    const customName = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;
    const linkedThemeIdsStr = formData.get("linkedThemeIds") as string | null;

    // Validierung
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!sharedWith || !["private", "school"].includes(sharedWith)) {
      return NextResponse.json(
        { error: "Invalid sharedWith value. Must be 'private' or 'school'" },
        { status: 400 }
      );
    }

    // Validiere Datei (Typ und Größe)
    const validation = validateSchoolFile(file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse linkedThemeIds
    const linkedThemeIds = linkedThemeIdsStr
      ? linkedThemeIdsStr.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    // Konvertiere File zu Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generiere Dateiname
    const fileName = customName || file.name;

    // Upload zu Firebase Storage
    const { storagePath, storageUrl } = await uploadSchoolFile(
      buffer,
      schuleId,
      userId,
      fileName,
      file.type,
      sharedWith
    );

    // Hole Schulnamen (optional)
    let schuleName: string | undefined;
    try {
      // Versuche aus Firestore Cache
      const schuleDoc = await adminDb.collection("system_schulen").doc(schuleId).get();
      if (schuleDoc.exists) {
        schuleName = schuleDoc.data()?.name;
      }
    } catch {
      // Ignore - schuleName ist optional
    }

    // Speichere Metadaten in Firestore
    const fileId = await createSchoolFile({
      name: fileName,
      storagePath,
      storageUrl,
      contentType: file.type,
      size: file.size,
      schuleId,
      schuleName,
      uploadedBy: userId,
      uploadedByName: teacherName,
      sharedWith,
      linkedThemeIds,
      description: description || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        fileId,
        storageUrl,
        message: sharedWith === "school"
          ? "Datei erfolgreich hochgeladen und mit der Schule geteilt"
          : "Datei erfolgreich hochgeladen (privat)",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/school-files:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
