import { getAdminDb } from "@/lib/firebase/admin";
import { SchoolChangeRequest, SchoolChangeStatus } from "@/types";

const COLLECTION = "school_change_requests";

/**
 * Erstellt eine neue Schulwechsel-Anfrage
 */
export async function createSchoolChangeRequest(data: {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  currentSchuleId: string;
  currentSchuleName: string;
  newSchuleId: string;
  newSchuleName: string;
}): Promise<string> {
  const adminDb = getAdminDb();

  // Prüfe ob bereits eine offene Anfrage existiert
  const existingQuery = await adminDb
    .collection(COLLECTION)
    .where("teacherId", "==", data.teacherId)
    .where("status", "==", "pending")
    .get();

  if (!existingQuery.empty) {
    throw new Error("Es existiert bereits eine offene Schulwechsel-Anfrage");
  }

  const now = new Date();
  const docRef = await adminDb.collection(COLLECTION).add({
    ...data,
    status: "pending" as SchoolChangeStatus,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * Holt eine einzelne Anfrage
 */
export async function getSchoolChangeRequest(
  requestId: string
): Promise<SchoolChangeRequest | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection(COLLECTION).doc(requestId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    reviewedAt: data.reviewedAt?.toDate?.() || (data.reviewedAt ? new Date(data.reviewedAt) : undefined),
  } as SchoolChangeRequest;
}

/**
 * Holt alle offenen Anfragen (für Super-Admins)
 */
export async function getPendingSchoolChangeRequests(): Promise<
  SchoolChangeRequest[]
> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    } as SchoolChangeRequest;
  });
}

/**
 * Holt alle Anfragen (optional gefiltert nach Status)
 */
export async function getAllSchoolChangeRequests(
  status?: SchoolChangeStatus
): Promise<SchoolChangeRequest[]> {
  const adminDb = getAdminDb();

  let query = adminDb.collection(COLLECTION).orderBy("createdAt", "desc");

  if (status) {
    query = adminDb
      .collection(COLLECTION)
      .where("status", "==", status)
      .orderBy("createdAt", "desc");
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      reviewedAt: data.reviewedAt?.toDate?.() || (data.reviewedAt ? new Date(data.reviewedAt) : undefined),
    } as SchoolChangeRequest;
  });
}

/**
 * Holt die offene Anfrage eines bestimmten Lehrers (falls vorhanden)
 */
export async function getPendingRequestForTeacher(
  teacherId: string
): Promise<SchoolChangeRequest | null> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("teacherId", "==", teacherId)
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
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
  } as SchoolChangeRequest;
}

/**
 * Genehmigt eine Schulwechsel-Anfrage
 */
export async function approveSchoolChangeRequest(
  requestId: string,
  reviewerId: string,
  reviewerName: string
): Promise<void> {
  const adminDb = getAdminDb();
  const now = new Date();

  // Hole die Anfrage
  const request = await getSchoolChangeRequest(requestId);
  if (!request) {
    throw new Error("Anfrage nicht gefunden");
  }

  if (request.status !== "pending") {
    throw new Error("Anfrage wurde bereits bearbeitet");
  }

  // Batch: Update Anfrage + Update Lehrer
  const batch = adminDb.batch();

  // Update Anfrage-Status
  const requestRef = adminDb.collection(COLLECTION).doc(requestId);
  batch.update(requestRef, {
    status: "approved" as SchoolChangeStatus,
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: now,
    updatedAt: now,
  });

  // Update Lehrer-Profil mit neuer Schule
  const teacherRef = adminDb.collection("teachers").doc(request.teacherId);
  batch.update(teacherRef, {
    schuleId: request.newSchuleId,
  });

  await batch.commit();
}

/**
 * Lehnt eine Schulwechsel-Anfrage ab
 */
export async function rejectSchoolChangeRequest(
  requestId: string,
  reviewerId: string,
  reviewerName: string,
  reviewNotes?: string
): Promise<void> {
  const adminDb = getAdminDb();
  const now = new Date();

  // Hole die Anfrage
  const request = await getSchoolChangeRequest(requestId);
  if (!request) {
    throw new Error("Anfrage nicht gefunden");
  }

  if (request.status !== "pending") {
    throw new Error("Anfrage wurde bereits bearbeitet");
  }

  // Update nur die Anfrage (Lehrer bleibt bei aktueller Schule)
  await adminDb.collection(COLLECTION).doc(requestId).update({
    status: "rejected" as SchoolChangeStatus,
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: now,
    reviewNotes: reviewNotes || undefined,
    updatedAt: now,
  });
}

/**
 * Storniert eine eigene offene Anfrage
 */
export async function cancelSchoolChangeRequest(
  requestId: string,
  teacherId: string
): Promise<void> {
  const adminDb = getAdminDb();

  const request = await getSchoolChangeRequest(requestId);
  if (!request) {
    throw new Error("Anfrage nicht gefunden");
  }

  if (request.teacherId !== teacherId) {
    throw new Error("Keine Berechtigung zum Stornieren dieser Anfrage");
  }

  if (request.status !== "pending") {
    throw new Error("Nur offene Anfragen können storniert werden");
  }

  // Lösche die Anfrage
  await adminDb.collection(COLLECTION).doc(requestId).delete();
}

/**
 * Zählt die offenen Anfragen (für Badge im Admin-Dashboard)
 */
export async function countPendingSchoolChangeRequests(): Promise<number> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("status", "==", "pending")
    .count()
    .get();

  return snapshot.data().count;
}
