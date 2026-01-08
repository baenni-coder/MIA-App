/**
 * Firestore CRUD-Funktionen für Pending Ratings
 *
 * Schüler-Bewertungen die auf Lehrer-Bestätigung warten.
 */

import { getAdminDb } from "@/lib/firebase/admin";
import { PendingRating, PendingRatingStatus } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION = "pending_ratings";

/**
 * Konvertiert Firestore Timestamp zu Date
 */
function timestampToDate(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  return new Date();
}

/**
 * Erstellt eine neue ausstehende Bewertung
 */
export async function createPendingRating(data: {
  studentId: string;
  studentName: string;
  classId: string;
  competencyId: string;
  competencyName: string;
  studentRating: number;
}): Promise<string> {
  const adminDb = getAdminDb();

  // Prüfen ob bereits eine pending Rating existiert
  const existing = await adminDb
    .collection(COLLECTION)
    .where("studentId", "==", data.studentId)
    .where("competencyId", "==", data.competencyId)
    .where("status", "==", "pending")
    .get();

  if (!existing.empty) {
    // Update existing pending rating
    const existingDoc = existing.docs[0];
    await existingDoc.ref.update({
      studentRating: data.studentRating,
      createdAt: new Date(),
    });
    return existingDoc.id;
  }

  // Neue pending rating erstellen
  const docRef = await adminDb.collection(COLLECTION).add({
    studentId: data.studentId,
    studentName: data.studentName,
    classId: data.classId,
    competencyId: data.competencyId,
    competencyName: data.competencyName,
    studentRating: data.studentRating,
    status: "pending" as PendingRatingStatus,
    createdAt: new Date(),
  });

  return docRef.id;
}

/**
 * Holt alle ausstehenden Bewertungen für eine Klasse
 */
export async function getPendingRatingsForClass(
  classId: string
): Promise<PendingRating[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("classId", "==", classId)
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      studentId: data.studentId,
      studentName: data.studentName,
      classId: data.classId,
      competencyId: data.competencyId,
      competencyName: data.competencyName,
      studentRating: data.studentRating,
      status: data.status as PendingRatingStatus,
      createdAt: timestampToDate(data.createdAt),
      reviewedAt: data.reviewedAt ? timestampToDate(data.reviewedAt) : undefined,
      reviewedBy: data.reviewedBy,
      reviewedByName: data.reviewedByName,
      teacherRating: data.teacherRating,
    };
  });
}

/**
 * Holt alle ausstehenden Bewertungen für einen Schüler
 */
export async function getPendingRatingsForStudent(
  studentId: string
): Promise<PendingRating[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("studentId", "==", studentId)
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      studentId: data.studentId,
      studentName: data.studentName,
      classId: data.classId,
      competencyId: data.competencyId,
      competencyName: data.competencyName,
      studentRating: data.studentRating,
      status: data.status as PendingRatingStatus,
      createdAt: timestampToDate(data.createdAt),
    };
  });
}

/**
 * Holt eine einzelne pending rating
 */
export async function getPendingRating(id: string): Promise<PendingRating | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection(COLLECTION).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    studentId: data.studentId,
    studentName: data.studentName,
    classId: data.classId,
    competencyId: data.competencyId,
    competencyName: data.competencyName,
    studentRating: data.studentRating,
    status: data.status as PendingRatingStatus,
    createdAt: timestampToDate(data.createdAt),
    reviewedAt: data.reviewedAt ? timestampToDate(data.reviewedAt) : undefined,
    reviewedBy: data.reviewedBy,
    reviewedByName: data.reviewedByName,
    teacherRating: data.teacherRating,
  };
}

/**
 * Bestätigt eine ausstehende Bewertung (Lehrer akzeptiert Schüler-Vorschlag)
 */
export async function confirmPendingRating(
  id: string,
  reviewedBy: string,
  reviewedByName: string
): Promise<void> {
  const adminDb = getAdminDb();
  const docRef = adminDb.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Pending Rating nicht gefunden");
  }

  const data = doc.data()!;
  if (data.status !== "pending") {
    throw new Error("Diese Bewertung wurde bereits bearbeitet");
  }

  // Update status
  const updateData: Record<string, unknown> = {
    status: "confirmed" as PendingRatingStatus,
    reviewedAt: new Date(),
    reviewedBy,
    reviewedByName,
  };

  await docRef.update(updateData);
}

/**
 * Passt eine ausstehende Bewertung an (Lehrer gibt andere Bewertung)
 */
export async function adjustPendingRating(
  id: string,
  teacherRating: number,
  reviewedBy: string,
  reviewedByName: string
): Promise<void> {
  const adminDb = getAdminDb();
  const docRef = adminDb.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Pending Rating nicht gefunden");
  }

  const data = doc.data()!;
  if (data.status !== "pending") {
    throw new Error("Diese Bewertung wurde bereits bearbeitet");
  }

  // Update status with teacher rating
  const updateData: Record<string, unknown> = {
    status: "adjusted" as PendingRatingStatus,
    teacherRating,
    reviewedAt: new Date(),
    reviewedBy,
    reviewedByName,
  };

  await docRef.update(updateData);
}

/**
 * Holt die Anzahl offener Bewertungen für eine Klasse
 */
export async function getPendingRatingsCount(classId: string): Promise<number> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("classId", "==", classId)
    .where("status", "==", "pending")
    .count()
    .get();

  return snapshot.data().count;
}

/**
 * Batch-Bestätigung mehrerer Bewertungen
 */
export async function confirmMultiplePendingRatings(
  ids: string[],
  reviewedBy: string,
  reviewedByName: string
): Promise<void> {
  const adminDb = getAdminDb();
  const batch = adminDb.batch();

  for (const id of ids) {
    const docRef = adminDb.collection(COLLECTION).doc(id);
    batch.update(docRef, {
      status: "confirmed" as PendingRatingStatus,
      reviewedAt: new Date(),
      reviewedBy,
      reviewedByName,
    });
  }

  await batch.commit();
}

/**
 * Löscht eine pending rating (z.B. wenn Schüler sie zurückzieht)
 */
export async function deletePendingRating(id: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION).doc(id).delete();
}

/**
 * Prüft ob eine pending rating für eine bestimmte Kompetenz existiert
 */
export async function hasPendingRating(
  studentId: string,
  competencyId: string
): Promise<boolean> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("studentId", "==", studentId)
    .where("competencyId", "==", competencyId)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Holt die pending rating für eine bestimmte Kompetenz eines Schülers
 */
export async function getPendingRatingForCompetency(
  studentId: string,
  competencyId: string
): Promise<PendingRating | null> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("studentId", "==", studentId)
    .where("competencyId", "==", competencyId)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    studentId: data.studentId,
    studentName: data.studentName,
    classId: data.classId,
    competencyId: data.competencyId,
    competencyName: data.competencyName,
    studentRating: data.studentRating,
    status: data.status as PendingRatingStatus,
    createdAt: timestampToDate(data.createdAt),
  };
}
