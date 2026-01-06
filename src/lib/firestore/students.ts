import { getAdminDb } from "@/lib/firebase/admin";
import { Student } from "@/types";
import { updateClassStudentCount, getClassById } from "./classes";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/admin";

const STUDENTS_COLLECTION = "students";

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
 * Konvertiert Firestore-Daten zu Student
 */
const docToStudent = (
  id: string,
  data: FirebaseFirestore.DocumentData
): Student => ({
  id,
  email: data.email,
  name: data.name,
  role: "student",
  classId: data.classId,
  className: data.className,
  schoolId: data.schoolId,
  teacherId: data.teacherId,
  teacherName: data.teacherName,
  createdAt: timestampToDate(data.createdAt),
  lastActive: data.lastActive ? timestampToDate(data.lastActive) : undefined,
});

/**
 * Generiert ein sicheres zufälliges Passwort
 */
function generateSecurePassword(length: number = 12): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Erstellt einen neuen Schüler mit Firebase Auth Account
 */
export async function createStudent(data: {
  email: string;
  name: string;
  classId: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  password?: string; // Optional: wenn nicht angegeben wird eines generiert
}): Promise<{ studentId: string; password: string }> {
  const adminDb = getAdminDb();
  const auth = getAuth(getAdminApp());

  // Passwort generieren oder verwenden
  const password = data.password || generateSecurePassword();

  try {
    // Klassen-Info laden für className
    const schoolClass = await getClassById(data.classId);
    if (!schoolClass) {
      throw new Error("Class not found");
    }

    // Firebase Auth User erstellen
    const userRecord = await auth.createUser({
      email: data.email,
      password: password,
      displayName: data.name,
    });

    const now = new Date();

    // Firestore Dokument mit derselben ID erstellen
    const studentData = {
      email: data.email,
      name: data.name,
      role: "student" as const,
      classId: data.classId,
      className: schoolClass.displayName || schoolClass.name,
      schoolId: data.schoolId,
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      createdAt: now,
      lastActive: null,
    };

    await adminDb
      .collection(STUDENTS_COLLECTION)
      .doc(userRecord.uid)
      .set(studentData);

    // Schülerzahl der Klasse erhöhen
    await updateClassStudentCount(data.classId, 1);

    return { studentId: userRecord.uid, password };
  } catch (error: unknown) {
    console.error("Error creating student:", error);
    // Firebase Auth Fehler behandeln
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "auth/email-already-exists"
    ) {
      throw new Error("Ein Benutzer mit dieser E-Mail existiert bereits");
    }
    throw new Error("Failed to create student");
  }
}

/**
 * Erstellt mehrere Schüler auf einmal (Bulk-Import)
 */
export async function createStudentsBulk(
  students: Array<{
    email: string;
    name: string;
  }>,
  classId: string,
  schoolId: string,
  teacherId: string,
  teacherName: string
): Promise<Array<{ email: string; name: string; password: string; error?: string }>> {
  const results: Array<{ email: string; name: string; password: string; error?: string }> = [];

  for (const student of students) {
    try {
      const { password } = await createStudent({
        email: student.email,
        name: student.name,
        classId,
        schoolId,
        teacherId,
        teacherName,
      });
      results.push({ email: student.email, name: student.name, password });
    } catch (error: unknown) {
      results.push({
        email: student.email,
        name: student.name,
        password: "",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Lädt einen Schüler nach ID
 */
export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(STUDENTS_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return docToStudent(doc.id, doc.data()!);
  } catch (error) {
    console.error("Error getting student:", error);
    throw new Error("Failed to get student");
  }
}

/**
 * Lädt alle Schüler einer Klasse
 */
export async function getStudentsByClass(classId: string): Promise<Student[]> {
  try {
    const adminDb = getAdminDb();
    // Note: Using only .where() without .orderBy() to avoid composite index requirement
    const snapshot = await adminDb
      .collection(STUDENTS_COLLECTION)
      .where("classId", "==", classId)
      .get();

    const students = snapshot.docs.map((doc) => docToStudent(doc.id, doc.data()));
    // Sort by name in memory
    return students.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error getting students by class:", error);
    throw new Error("Failed to get students");
  }
}

/**
 * Lädt alle Schüler einer Schule
 */
export async function getStudentsBySchool(schoolId: string): Promise<Student[]> {
  try {
    const adminDb = getAdminDb();
    // Note: Using only .where() without .orderBy() to avoid composite index requirement
    const snapshot = await adminDb
      .collection(STUDENTS_COLLECTION)
      .where("schoolId", "==", schoolId)
      .get();

    const students = snapshot.docs.map((doc) => docToStudent(doc.id, doc.data()));
    // Sort by name in memory
    return students.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error getting students by school:", error);
    throw new Error("Failed to get students");
  }
}

/**
 * Lädt alle Schüler einer Lehrperson
 */
export async function getStudentsByTeacher(teacherId: string): Promise<Student[]> {
  try {
    const adminDb = getAdminDb();
    // Note: Using only .where() without .orderBy() to avoid composite index requirement
    const snapshot = await adminDb
      .collection(STUDENTS_COLLECTION)
      .where("teacherId", "==", teacherId)
      .get();

    const students = snapshot.docs.map((doc) => docToStudent(doc.id, doc.data()));
    // Sort by name in memory
    return students.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error getting students by teacher:", error);
    throw new Error("Failed to get students");
  }
}

/**
 * Aktualisiert einen Schüler
 */
export async function updateStudent(
  id: string,
  data: Partial<{
    name: string;
    classId: string;
    className: string;
  }>
): Promise<void> {
  try {
    const adminDb = getAdminDb();

    // Wenn classId geändert wird, auch studentCount aktualisieren
    if (data.classId) {
      const student = await getStudentById(id);
      if (student && student.classId !== data.classId) {
        // Alte Klasse: -1
        await updateClassStudentCount(student.classId, -1);
        // Neue Klasse: +1
        await updateClassStudentCount(data.classId, 1);

        // Klassenname aktualisieren
        const newClass = await getClassById(data.classId);
        if (newClass) {
          data.className = newClass.displayName || newClass.name;
        }
      }
    }

    await adminDb.collection(STUDENTS_COLLECTION).doc(id).update({
      ...data,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    throw new Error("Failed to update student");
  }
}

/**
 * Aktualisiert den lastActive Timestamp eines Schülers
 */
export async function updateStudentLastActive(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection(STUDENTS_COLLECTION).doc(id).update({
      lastActive: new Date(),
    });
  } catch (error) {
    console.error("Error updating student last active:", error);
    // Kein Throw - nicht kritisch
  }
}

/**
 * Löscht einen Schüler (inkl. Firebase Auth Account)
 */
export async function deleteStudent(id: string): Promise<void> {
  const adminDb = getAdminDb();
  const auth = getAuth(getAdminApp());

  try {
    // Schüler-Daten laden für classId
    const student = await getStudentById(id);
    if (!student) {
      throw new Error("Student not found");
    }

    // Firebase Auth User löschen
    try {
      await auth.deleteUser(id);
    } catch (authError) {
      console.error("Error deleting auth user (may not exist):", authError);
      // Fortfahren auch wenn Auth-User nicht existiert
    }

    // Firestore Dokument löschen
    await adminDb.collection(STUDENTS_COLLECTION).doc(id).delete();

    // Schülerzahl der Klasse verringern
    await updateClassStudentCount(student.classId, -1);

    // Optional: Fortschritt und Badges löschen
    // await deleteStudentProgress(id);
    // await deleteStudentBadges(id);
  } catch (error) {
    console.error("Error deleting student:", error);
    throw new Error("Failed to delete student");
  }
}

/**
 * Setzt das Passwort eines Schülers zurück
 */
export async function resetStudentPassword(
  id: string
): Promise<{ password: string }> {
  const auth = getAuth(getAdminApp());
  const password = generateSecurePassword();

  try {
    await auth.updateUser(id, { password });
    return { password };
  } catch (error) {
    console.error("Error resetting password:", error);
    throw new Error("Failed to reset password");
  }
}

/**
 * Prüft ob eine Lehrperson Zugriff auf einen Schüler hat
 */
export async function teacherHasAccessToStudent(
  teacherId: string,
  studentId: string
): Promise<boolean> {
  try {
    const student = await getStudentById(studentId);
    if (!student) {
      return false;
    }
    return student.teacherId === teacherId;
  } catch (error) {
    console.error("Error checking student access:", error);
    return false;
  }
}
