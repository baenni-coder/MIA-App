import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { createSchoolFile } from "@/lib/firestore/school-files";
import { FileShareLevel } from "@/types";

/**
 * POST /api/school-files/metadata
 * Speichert nur die Metadaten einer Datei (nach Client-seitigem Upload zu Storage)
 *
 * Request Body (JSON):
 * - name: string (required)
 * - storagePath: string (required)
 * - storageUrl: string (required)
 * - contentType: string (required)
 * - size: number (required)
 * - sharedWith: "private" | "school" (required)
 * - linkedThemeIds?: string[]
 * - description?: string
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

    // Parse JSON Body
    const body = await request.json();
    const {
      name,
      storagePath,
      storageUrl,
      contentType,
      size,
      sharedWith,
      linkedThemeIds,
      linkedThemeNames,
      description,
    } = body;

    // Validierung
    if (!name || !storagePath || !storageUrl || !contentType || !size) {
      return NextResponse.json(
        { error: "Missing required fields: name, storagePath, storageUrl, contentType, size" },
        { status: 400 }
      );
    }

    if (!sharedWith || !["private", "school"].includes(sharedWith)) {
      return NextResponse.json(
        { error: "Invalid sharedWith value. Must be 'private' or 'school'" },
        { status: 400 }
      );
    }

    // Validiere dass der Storage-Pfad zur Schule des Users gehört
    const expectedPathPrefix = `school-files/${schuleId}/`;
    if (!storagePath.startsWith(expectedPathPrefix)) {
      return NextResponse.json(
        { error: "Invalid storage path - must belong to your school" },
        { status: 403 }
      );
    }

    // Hole Schulnamen (optional)
    let schuleName: string | undefined;
    try {
      const schuleDoc = await adminDb.collection("system_schulen").doc(schuleId).get();
      if (schuleDoc.exists) {
        schuleName = schuleDoc.data()?.name;
      }
    } catch {
      // Ignore - schuleName ist optional
    }

    // Speichere Metadaten in Firestore
    const fileId = await createSchoolFile({
      name,
      storagePath,
      storageUrl,
      contentType,
      size: Number(size),
      schuleId,
      schuleName,
      uploadedBy: userId,
      uploadedByName: teacherName,
      sharedWith: sharedWith as FileShareLevel,
      linkedThemeIds: linkedThemeIds || [],
      linkedThemeNames: linkedThemeNames || [],
      description: description || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        fileId,
        message: sharedWith === "school"
          ? "Datei-Metadaten gespeichert und mit der Schule geteilt"
          : "Datei-Metadaten gespeichert (privat)",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/school-files/metadata:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to save file metadata" },
      { status: 500 }
    );
  }
}
