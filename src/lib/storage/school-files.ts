/**
 * Firebase Storage Funktionen für School Files
 *
 * Schulspezifische Dateien werden in folgendem Schema gespeichert:
 * - Geteilte Dateien: school-files/{schuleId}/shared/{userId}/{timestamp}_{filename}
 * - Private Dateien: school-files/{schuleId}/users/{userId}/{timestamp}_{filename}
 *
 * WICHTIG: Der userId ist im Pfad enthalten, damit Storage Rules den Besitzer prüfen können.
 */

import * as admin from "firebase-admin";
import { FileShareLevel } from "@/types";

/**
 * Initialisiert Firebase Admin (falls noch nicht geschehen)
 */
function ensureFirebaseAdmin() {
  if (!admin.apps.length) {
    require("@/lib/firebase/admin");
  }
}

/**
 * Erlaubte Dateitypen für School Files
 */
const ALLOWED_FILE_TYPES = [
  // Dokumente
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Präsentationen
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Tabellen
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Bilder
  "image/jpeg",
  "image/png",
  "image/webp",
  // HTML
  "text/html",
];

/**
 * Maximale Dateigröße in MB
 */
const MAX_FILE_SIZE_MB = 50;

/**
 * Validiert eine Datei für School Files Upload
 */
export function validateSchoolFile(
  contentType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  // Prüfe Dateityp
  if (!ALLOWED_FILE_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: `Ungültiges Dateiformat. Erlaubt sind: PDF, Word, PowerPoint, Excel, Bilder, HTML`,
    };
  }

  // Prüfe Dateigröße
  const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `Datei ist zu groß. Maximum: ${MAX_FILE_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Generiert einen sicheren Dateinamen
 */
function sanitizeFilename(filename: string): string {
  // Entferne oder ersetze problematische Zeichen
  return filename
    .replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
}

/**
 * Generiert den Storage-Pfad für eine School File
 */
export function generateSchoolFilePath(
  schuleId: string,
  userId: string,
  filename: string,
  sharedWith: FileShareLevel
): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFilename(filename);

  if (sharedWith === "school") {
    // Geteilte Dateien: Alle der Schule können lesen, aber nur Besitzer kann schreiben/löschen
    // userId im Pfad ermöglicht Storage Rules Validierung
    return `school-files/${schuleId}/shared/${userId}/${timestamp}_${sanitizedName}`;
  } else {
    // Private Dateien: Nur der User kann zugreifen
    return `school-files/${schuleId}/users/${userId}/${timestamp}_${sanitizedName}`;
  }
}

/**
 * Lädt eine Datei zu Firebase Storage hoch
 */
export async function uploadSchoolFile(
  fileBuffer: Buffer,
  schuleId: string,
  userId: string,
  filename: string,
  contentType: string,
  sharedWith: FileShareLevel
): Promise<{ storagePath: string; storageUrl: string }> {
  try {
    ensureFirebaseAdmin();

    const storagePath = generateSchoolFilePath(schuleId, userId, filename, sharedWith);
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    // Upload die Datei
    await file.save(fileBuffer, {
      metadata: {
        contentType: contentType,
        metadata: {
          schuleId,
          uploadedBy: userId,
          sharedWith,
          originalName: filename,
        },
      },
      // Nicht öffentlich - Zugriff nur über signierte URLs oder Firebase Auth
      public: false,
    });

    // Generiere eine signierte URL (gültig für 7 Tage)
    // In Produktion könnte man kürzere Zeiten oder On-Demand-Signierung verwenden
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 Tage
    });

    return {
      storagePath,
      storageUrl: signedUrl,
    };
  } catch (error) {
    console.error("Error uploading school file to Firebase Storage:", error);
    throw new Error("Failed to upload file");
  }
}

/**
 * Generiert eine neue signierte URL für eine Datei
 * Wird verwendet wenn die alte URL abgelaufen ist
 */
export async function refreshSchoolFileUrl(
  storagePath: string,
  expiresInDays: number = 7
): Promise<string> {
  try {
    ensureFirebaseAdmin();

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    });

    return signedUrl;
  } catch (error) {
    console.error("Error refreshing school file URL:", error);
    throw new Error("Failed to refresh file URL");
  }
}

/**
 * Löscht eine Datei aus Firebase Storage
 */
export async function deleteSchoolFileFromStorage(storagePath: string): Promise<void> {
  try {
    ensureFirebaseAdmin();

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    // Prüfe ob Datei existiert
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`File not found in storage: ${storagePath}`);
      return;
    }

    await file.delete();
  } catch (error) {
    console.error("Error deleting school file from Firebase Storage:", error);
    throw new Error("Failed to delete file");
  }
}

/**
 * Holt Datei-Metadaten aus Firebase Storage
 */
export async function getSchoolFileMetadata(storagePath: string): Promise<{
  size: number;
  contentType: string;
  created: Date;
  updated: Date;
} | null> {
  try {
    ensureFirebaseAdmin();

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    const [metadata] = await file.getMetadata();

    return {
      size: parseInt(metadata.size as string, 10),
      contentType: metadata.contentType || "application/octet-stream",
      created: new Date(metadata.timeCreated as string),
      updated: new Date(metadata.updated as string),
    };
  } catch (error) {
    console.error("Error getting school file metadata:", error);
    return null;
  }
}

/**
 * Prüft ob eine Datei in Storage existiert
 */
export async function schoolFileExists(storagePath: string): Promise<boolean> {
  try {
    ensureFirebaseAdmin();

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error("Error checking school file existence:", error);
    return false;
  }
}
