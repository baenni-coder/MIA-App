import * as admin from "firebase-admin";

/**
 * Initialisiert Firebase Admin (falls noch nicht geschehen)
 */
function ensureFirebaseAdmin() {
  if (!admin.apps.length) {
    // Import getAdminAuth to trigger initialization
    require("@/lib/firebase/admin");
  }
}

/**
 * Lädt ein Bild zu Firebase Storage hoch
 *
 * @param file - File Objekt oder Buffer
 * @param path - Pfad im Storage (z.B. "themes/user123/image.jpg")
 * @param contentType - MIME-Type (z.B. "image/jpeg")
 * @returns Public URL des hochgeladenen Bildes
 */
export async function uploadImage(
  fileBuffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  try {
    ensureFirebaseAdmin();

    const bucket = admin.storage().bucket();
    const file = bucket.file(path);

    // Upload das Bild
    await file.save(fileBuffer, {
      metadata: {
        contentType: contentType,
      },
      public: true, // Mache das Bild öffentlich zugänglich
    });

    // Hole die public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    throw new Error("Failed to upload image");
  }
}

/**
 * Löscht ein Bild aus Firebase Storage
 *
 * @param path - Pfad im Storage
 */
export async function deleteImage(path: string): Promise<void> {
  try {
    ensureFirebaseAdmin();

    const bucket = admin.storage().bucket();
    const file = bucket.file(path);

    await file.delete();
  } catch (error) {
    console.error("Error deleting image from Firebase Storage:", error);
    throw new Error("Failed to delete image");
  }
}

/**
 * Extrahiert den Pfad aus einer Firebase Storage URL
 *
 * @param url - Public URL (z.B. "https://storage.googleapis.com/bucket/path/to/file.jpg")
 * @returns Pfad im Storage (z.B. "path/to/file.jpg")
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    const match = url.match(/googleapis\.com\/[^/]+\/(.+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extracting path from URL:", error);
    return null;
  }
}

/**
 * Validiert eine Bilddatei
 *
 * @param contentType - MIME-Type
 * @param fileSize - Größe in Bytes
 * @param maxSizeMB - Maximale Größe in MB (default: 10)
 * @returns Validation Result
 */
export function validateImage(
  contentType: string,
  fileSize: number,
  maxSizeMB = 10
): { valid: boolean; error?: string } {
  // Erlaubte Formate
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Ungültiges Bildformat. Erlaubt sind: JPEG, PNG, WEBP`,
    };
  }

  // Maximale Größe (default 10MB)
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `Bild ist zu groß. Maximum: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Generiert einen eindeutigen Dateinamen für ein Bild
 *
 * @param userId - User ID
 * @param originalFilename - Original Dateiname
 * @returns Eindeutiger Pfad
 */
export function generateImagePath(
  userId: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const extension = originalFilename.split(".").pop();
  const sanitizedName = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 50);

  return `themes/${userId}/${timestamp}_${sanitizedName}`;
}

/**
 * Komprimiert ein Bild (benötigt sharp library)
 * Diese Funktion ist optional und wird nur verwendet, wenn sharp installiert ist
 *
 * @param buffer - Bild Buffer
 * @param maxWidth - Maximale Breite (default: 1200)
 * @param quality - Qualität 0-100 (default: 85)
 * @returns Komprimierter Buffer
 */
export async function compressImage(
  buffer: Buffer,
  maxWidth = 1200,
  quality = 85
): Promise<Buffer> {
  try {
    // Dynamischer Import von sharp (falls installiert)
    const sharp = await import("sharp");

    return await sharp
      .default(buffer)
      .resize(maxWidth, null, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();
  } catch (error) {
    console.warn("sharp not available, skipping compression:", error);
    // Falls sharp nicht installiert ist, gebe original Buffer zurück
    return buffer;
  }
}
