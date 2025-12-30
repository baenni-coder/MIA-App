/**
 * Firestore CRUD-Funktionen für School Files
 *
 * Diese Datei enthält alle Datenbankoperationen für schulspezifische Dateien.
 * Dateien werden in Firebase Storage gespeichert, Metadaten in Firestore.
 */

import { getAdminDb } from "@/lib/firebase/admin";
import { SchoolFile, FileShareLevel } from "@/types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const COLLECTION = "school_files";

/**
 * Konvertiert Firestore Timestamp zu Date
 */
function timestampToDate(
  timestamp: Timestamp | Date | undefined
): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  return new Date();
}

/**
 * Erstellt einen neuen School File Eintrag
 */
export async function createSchoolFile(data: {
  name: string;
  storagePath: string;
  storageUrl: string;
  contentType: string;
  size: number;
  schuleId: string;
  schuleName?: string;
  uploadedBy: string;
  uploadedByName: string;
  sharedWith: FileShareLevel;
  linkedThemeIds?: string[];
  linkedThemeNames?: string[];
  description?: string;
}): Promise<string> {
  const adminDb = getAdminDb();

  const docRef = await adminDb.collection(COLLECTION).add({
    name: data.name,
    storagePath: data.storagePath,
    storageUrl: data.storageUrl,
    contentType: data.contentType,
    size: data.size,
    schuleId: data.schuleId,
    schuleName: data.schuleName || null,
    uploadedBy: data.uploadedBy,
    uploadedByName: data.uploadedByName,
    sharedWith: data.sharedWith,
    linkedThemeIds: data.linkedThemeIds || [],
    linkedThemeNames: data.linkedThemeNames || [],
    description: data.description || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Holt eine einzelne Datei nach ID
 */
export async function getSchoolFile(fileId: string): Promise<SchoolFile | null> {
  const adminDb = getAdminDb();

  const docRef = await adminDb.collection(COLLECTION).doc(fileId).get();

  if (!docRef.exists) {
    return null;
  }

  const data = docRef.data()!;

  return {
    id: docRef.id,
    name: data.name,
    storagePath: data.storagePath,
    storageUrl: data.storageUrl,
    contentType: data.contentType,
    size: data.size,
    schuleId: data.schuleId,
    schuleName: data.schuleName,
    uploadedBy: data.uploadedBy,
    uploadedByName: data.uploadedByName,
    sharedWith: data.sharedWith,
    linkedThemeIds: data.linkedThemeIds || [],
    linkedThemeNames: data.linkedThemeNames || [],
    description: data.description,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

/**
 * Holt alle Dateien für einen User
 * Inkludiert: Eigene Dateien + geteilte Dateien der Schule
 */
export async function getSchoolFilesForUser(
  userId: string,
  schuleId: string
): Promise<SchoolFile[]> {
  const adminDb = getAdminDb();

  // Query 1: Eigene Dateien (privat + school)
  const ownFilesQuery = adminDb
    .collection(COLLECTION)
    .where("uploadedBy", "==", userId)
    .orderBy("createdAt", "desc");

  // Query 2: Geteilte Dateien der Schule (von anderen)
  const sharedFilesQuery = adminDb
    .collection(COLLECTION)
    .where("schuleId", "==", schuleId)
    .where("sharedWith", "==", "school")
    .orderBy("createdAt", "desc");

  const [ownSnapshot, sharedSnapshot] = await Promise.all([
    ownFilesQuery.get(),
    sharedFilesQuery.get(),
  ]);

  // Kombiniere und dedupliziere
  const filesMap = new Map<string, SchoolFile>();

  const processDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
    const data = doc.data()!;
    filesMap.set(doc.id, {
      id: doc.id,
      name: data.name,
      storagePath: data.storagePath,
      storageUrl: data.storageUrl,
      contentType: data.contentType,
      size: data.size,
      schuleId: data.schuleId,
      schuleName: data.schuleName,
      uploadedBy: data.uploadedBy,
      uploadedByName: data.uploadedByName,
      sharedWith: data.sharedWith,
      linkedThemeIds: data.linkedThemeIds || [],
      linkedThemeNames: data.linkedThemeNames || [],
      description: data.description,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    });
  };

  ownSnapshot.forEach(processDoc);
  sharedSnapshot.forEach(processDoc);

  // Sortiere nach Erstellungsdatum (neueste zuerst)
  return Array.from(filesMap.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Holt Dateien, die mit einem bestimmten Thema verknüpft sind
 */
export async function getSchoolFilesForTheme(
  themeId: string,
  userId: string,
  schuleId: string
): Promise<SchoolFile[]> {
  const adminDb = getAdminDb();

  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("linkedThemeIds", "array-contains", themeId)
    .get();

  const files: SchoolFile[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    // Prüfe Berechtigung: Eigene Datei oder geteilte Datei der Schule
    const canAccess =
      data.uploadedBy === userId ||
      (data.sharedWith === "school" && data.schuleId === schuleId);

    if (canAccess) {
      files.push({
        id: doc.id,
        name: data.name,
        storagePath: data.storagePath,
        storageUrl: data.storageUrl,
        contentType: data.contentType,
        size: data.size,
        schuleId: data.schuleId,
        schuleName: data.schuleName,
        uploadedBy: data.uploadedBy,
        uploadedByName: data.uploadedByName,
        sharedWith: data.sharedWith,
        linkedThemeIds: data.linkedThemeIds || [],
        linkedThemeNames: data.linkedThemeNames || [],
        description: data.description,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      });
    }
  });

  return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Aktualisiert eine Datei (nur bestimmte Felder)
 */
export async function updateSchoolFile(
  fileId: string,
  updates: {
    name?: string;
    sharedWith?: FileShareLevel;
    linkedThemeIds?: string[];
    linkedThemeNames?: string[];
    description?: string;
  }
): Promise<void> {
  const adminDb = getAdminDb();

  await adminDb
    .collection(COLLECTION)
    .doc(fileId)
    .update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Löscht eine Datei (Metadaten aus Firestore)
 * WICHTIG: Die eigentliche Datei in Storage muss separat gelöscht werden!
 */
export async function deleteSchoolFile(fileId: string): Promise<string | null> {
  const adminDb = getAdminDb();

  // Hole zuerst den Storage-Pfad für das Löschen der Datei
  const doc = await adminDb.collection(COLLECTION).doc(fileId).get();

  if (!doc.exists) {
    return null;
  }

  const storagePath = doc.data()?.storagePath;

  // Lösche Metadaten
  await adminDb.collection(COLLECTION).doc(fileId).delete();

  return storagePath;
}

/**
 * Prüft ob ein User Zugriff auf eine Datei hat
 */
export async function canAccessSchoolFile(
  fileId: string,
  userId: string,
  schuleId: string
): Promise<boolean> {
  const file = await getSchoolFile(fileId);

  if (!file) {
    return false;
  }

  // Eigene Datei
  if (file.uploadedBy === userId) {
    return true;
  }

  // Geteilte Datei der gleichen Schule
  if (file.sharedWith === "school" && file.schuleId === schuleId) {
    return true;
  }

  return false;
}

/**
 * Prüft ob ein User eine Datei löschen darf
 */
export async function canDeleteSchoolFile(
  fileId: string,
  userId: string,
  userRole: string,
  schuleId: string
): Promise<boolean> {
  const file = await getSchoolFile(fileId);

  if (!file) {
    return false;
  }

  // Eigene Datei
  if (file.uploadedBy === userId) {
    return true;
  }

  // PICTS-Admin oder Super-Admin der gleichen Schule
  if (
    (userRole === "picts_admin" || userRole === "super_admin") &&
    file.schuleId === schuleId
  ) {
    return true;
  }

  return false;
}
