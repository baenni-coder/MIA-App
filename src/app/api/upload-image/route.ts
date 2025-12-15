import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  uploadImage,
  validateImage,
  generateImagePath,
  compressImage,
} from "@/lib/storage/upload";

/**
 * POST /api/upload-image
 * Lädt ein Bild zu Firebase Storage hoch
 *
 * Form Data:
 * - image: File (required) - Das hochzuladende Bild
 * - compress?: string ("true" für Kompression)
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

    // Parse Form Data
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const shouldCompress = formData.get("compress") === "true";

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validiere Bild
    const validation = validateImage(imageFile.type, imageFile.size, 10);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Konvertiere File zu Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // Optional: Komprimieren
    if (shouldCompress) {
      try {
        buffer = await compressImage(buffer, 1200, 85);
      } catch (compressError) {
        console.warn("Compression failed, using original:", compressError);
        // Bei Fehler: Original verwenden
      }
    }

    // Generiere eindeutigen Pfad
    const imagePath = generateImagePath(userId, imageFile.name);

    // Upload zu Firebase Storage
    const imageUrl = await uploadImage(buffer, imagePath, imageFile.type);

    return NextResponse.json(
      {
        success: true,
        imageUrl,
        path: imagePath,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/upload-image:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
