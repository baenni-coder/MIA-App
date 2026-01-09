import { getAdminDb } from "@/lib/firebase/admin";
import { StudentArtifact, ArtifactType } from "@/types";

const COLLECTION = "student_artifacts";

// ============================================
// CRUD Operations für Schüler-Artefakte
// ============================================

/**
 * Erstellt ein neues Artefakt
 */
export async function createArtifact(
  data: Omit<StudentArtifact, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const adminDb = getAdminDb();
  const now = new Date();

  const docRef = await adminDb.collection(COLLECTION).add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * Lädt ein einzelnes Artefakt
 */
export async function getArtifactById(
  id: string
): Promise<StudentArtifact | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection(COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    teacherCommentAt: data.teacherCommentAt?.toDate?.() || (data.teacherCommentAt ? new Date(data.teacherCommentAt) : undefined),
  } as StudentArtifact;
}

/**
 * Lädt alle Artefakte für einen Schüler
 */
export async function getArtifactsByStudent(
  studentId: string
): Promise<StudentArtifact[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("studentId", "==", studentId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      teacherCommentAt: data.teacherCommentAt?.toDate?.() || (data.teacherCommentAt ? new Date(data.teacherCommentAt) : undefined),
    } as StudentArtifact;
  });
}

/**
 * Lädt alle Artefakte für eine Kompetenz eines Schülers
 */
export async function getArtifactsByStudentAndCompetency(
  studentId: string,
  competencyId: string
): Promise<StudentArtifact[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("studentId", "==", studentId)
    .where("competencyId", "==", competencyId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      teacherCommentAt: data.teacherCommentAt?.toDate?.() || (data.teacherCommentAt ? new Date(data.teacherCommentAt) : undefined),
    } as StudentArtifact;
  });
}

/**
 * Lädt alle Artefakte für eine Klasse (für Lehrer)
 */
export async function getArtifactsByClass(
  classId: string
): Promise<StudentArtifact[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("classId", "==", classId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      teacherCommentAt: data.teacherCommentAt?.toDate?.() || (data.teacherCommentAt ? new Date(data.teacherCommentAt) : undefined),
    } as StudentArtifact;
  });
}

/**
 * Aktualisiert ein Artefakt (für Schüler: Titel, Beschreibung, Themen-Verknüpfungen)
 */
export async function updateArtifact(
  id: string,
  data: Partial<Pick<StudentArtifact, "title" | "description" | "linkedThemeIds" | "linkedThemeNames">>
): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb
    .collection(COLLECTION)
    .doc(id)
    .update({
      ...data,
      updatedAt: new Date(),
    });
}

/**
 * Fügt Lehrer-Kommentar hinzu oder aktualisiert ihn
 */
export async function addTeacherComment(
  artifactId: string,
  teacherId: string,
  teacherName: string,
  comment: string
): Promise<void> {
  const adminDb = getAdminDb();
  const now = new Date();

  await adminDb.collection(COLLECTION).doc(artifactId).update({
    teacherComment: comment,
    teacherCommentBy: teacherId,
    teacherCommentByName: teacherName,
    teacherCommentAt: now,
    updatedAt: now,
  });
}

/**
 * Entfernt den Lehrer-Kommentar
 */
export async function removeTeacherComment(artifactId: string): Promise<void> {
  const adminDb = getAdminDb();
  const { FieldValue } = await import("firebase-admin/firestore");

  await adminDb.collection(COLLECTION).doc(artifactId).update({
    teacherComment: FieldValue.delete(),
    teacherCommentBy: FieldValue.delete(),
    teacherCommentByName: FieldValue.delete(),
    teacherCommentAt: FieldValue.delete(),
    updatedAt: new Date(),
  });
}

/**
 * Löscht ein Artefakt
 */
export async function deleteArtifact(id: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION).doc(id).delete();
}

/**
 * Prüft ob ein Schüler Zugriff auf ein Artefakt hat (nur eigene)
 */
export async function studentHasAccessToArtifact(
  studentId: string,
  artifactId: string
): Promise<boolean> {
  const artifact = await getArtifactById(artifactId);
  return artifact?.studentId === studentId;
}

/**
 * Prüft ob ein Lehrer Zugriff auf ein Artefakt hat (Klasse des Schülers)
 */
export async function teacherHasAccessToArtifact(
  teacherId: string,
  artifactId: string
): Promise<boolean> {
  const artifact = await getArtifactById(artifactId);
  if (!artifact) return false;

  // Prüfen ob der Lehrer Zugriff auf die Klasse des Schülers hat
  const adminDb = getAdminDb();
  const classDoc = await adminDb.collection("classes").doc(artifact.classId).get();

  if (!classDoc.exists) return false;

  const classData = classDoc.data()!;
  return classData.teacherId === teacherId;
}

/**
 * Zählt Artefakte für einen Schüler
 */
export async function countArtifactsByStudent(studentId: string): Promise<number> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("studentId", "==", studentId)
    .count()
    .get();

  return snapshot.data().count;
}

/**
 * Zählt Artefakte pro Kompetenz für einen Schüler
 */
export async function countArtifactsByCompetency(
  studentId: string,
  competencyId: string
): Promise<number> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("studentId", "==", studentId)
    .where("competencyId", "==", competencyId)
    .count()
    .get();

  return snapshot.data().count;
}
