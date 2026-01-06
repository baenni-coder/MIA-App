import { getAdminDb } from "@/lib/firebase/admin";
import { SchoolClass, Stufe } from "@/types";

const CLASSES_COLLECTION = "classes";

/**
 * Konvertiert Firestore Timestamp zu Date
 */
const timestampToDate = (timestamp: unknown): Date => {
  if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp as string | number);
};

/**
 * Konvertiert Firestore-Daten zu SchoolClass
 */
const docToSchoolClass = (
  id: string,
  data: FirebaseFirestore.DocumentData
): SchoolClass => ({
  id,
  name: data.name,
  displayName: data.displayName,
  grade: data.grade as Stufe,
  schoolId: data.schoolId,
  teacherId: data.teacherId,
  teacherName: data.teacherName,
  studentCount: data.studentCount || 0,
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

/**
 * Erstellt eine neue Klasse
 */
export async function createClass(data: {
  name: string;
  displayName?: string;
  grade: Stufe;
  schoolId: string;
  teacherId: string;
  teacherName: string;
}): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    const classData = {
      ...data,
      displayName: data.displayName || `${data.grade} ${data.name}`,
      studentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection(CLASSES_COLLECTION).add(classData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating class:", error);
    throw new Error("Failed to create class");
  }
}

/**
 * Lädt eine Klasse nach ID
 */
export async function getClassById(id: string): Promise<SchoolClass | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(CLASSES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return docToSchoolClass(doc.id, doc.data()!);
  } catch (error) {
    console.error("Error getting class:", error);
    throw new Error("Failed to get class");
  }
}

/**
 * Lädt alle Klassen einer Lehrperson
 */
export async function getClassesByTeacher(
  teacherId: string
): Promise<SchoolClass[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(CLASSES_COLLECTION)
      .where("teacherId", "==", teacherId)
      .orderBy("name")
      .get();

    return snapshot.docs.map((doc) => docToSchoolClass(doc.id, doc.data()));
  } catch (error) {
    console.error("Error getting classes by teacher:", error);
    throw new Error("Failed to get classes");
  }
}

/**
 * Lädt alle Klassen einer Schule
 */
export async function getClassesBySchool(
  schoolId: string
): Promise<SchoolClass[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(CLASSES_COLLECTION)
      .where("schoolId", "==", schoolId)
      .orderBy("name")
      .get();

    return snapshot.docs.map((doc) => docToSchoolClass(doc.id, doc.data()));
  } catch (error) {
    console.error("Error getting classes by school:", error);
    throw new Error("Failed to get classes");
  }
}

/**
 * Aktualisiert eine Klasse
 */
export async function updateClass(
  id: string,
  data: Partial<{
    name: string;
    displayName: string;
    grade: Stufe;
    teacherId: string;
    teacherName: string;
  }>
): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb
      .collection(CLASSES_COLLECTION)
      .doc(id)
      .update({
        ...data,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error("Error updating class:", error);
    throw new Error("Failed to update class");
  }
}

/**
 * Aktualisiert die Schülerzahl einer Klasse
 */
export async function updateClassStudentCount(
  classId: string,
  increment: number
): Promise<void> {
  try {
    const adminDb = getAdminDb();
    const classDoc = await adminDb
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .get();

    if (!classDoc.exists) {
      throw new Error("Class not found");
    }

    const currentCount = classDoc.data()?.studentCount || 0;
    const newCount = Math.max(0, currentCount + increment);

    await adminDb.collection(CLASSES_COLLECTION).doc(classId).update({
      studentCount: newCount,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating class student count:", error);
    throw new Error("Failed to update student count");
  }
}

/**
 * Löscht eine Klasse (nur wenn keine Schüler mehr zugewiesen)
 */
export async function deleteClass(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();

    // Prüfen ob noch Schüler in der Klasse sind
    const studentsSnapshot = await adminDb
      .collection("students")
      .where("classId", "==", id)
      .limit(1)
      .get();

    if (!studentsSnapshot.empty) {
      throw new Error(
        "Cannot delete class with students. Remove all students first."
      );
    }

    await adminDb.collection(CLASSES_COLLECTION).doc(id).delete();
  } catch (error) {
    console.error("Error deleting class:", error);
    throw error;
  }
}

/**
 * Prüft ob eine Lehrperson Zugriff auf eine Klasse hat
 */
export async function teacherHasAccessToClass(
  teacherId: string,
  classId: string
): Promise<boolean> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(CLASSES_COLLECTION).doc(classId).get();

    if (!doc.exists) {
      return false;
    }

    return doc.data()?.teacherId === teacherId;
  } catch (error) {
    console.error("Error checking class access:", error);
    return false;
  }
}
