import { getAdminDb } from "@/lib/firebase/admin";
import { UserRole, Teacher } from "@/types";

/**
 * Lädt ein Teacher-Profil aus Firestore
 */
export async function getTeacherProfile(userId: string): Promise<Teacher | null> {
  try {
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return null;
    }

    const data = teacherDoc.data();
    return {
      id: teacherDoc.id,
      email: data?.email || "",
      name: data?.name || "",
      schuleId: data?.schuleId || "",
      stufe: data?.stufe,
      role: data?.role || "teacher",
      createdAt: data?.createdAt?.toDate() || new Date(),
    } as Teacher;
  } catch (error) {
    console.error("Error fetching teacher profile:", error);
    return null;
  }
}

/**
 * Prüft ob ein User eine bestimmte Rolle hat
 */
export async function hasRole(
  userId: string,
  requiredRole: UserRole | UserRole[]
): Promise<boolean> {
  const teacher = await getTeacherProfile(userId);
  if (!teacher) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(teacher.role as UserRole);
}

/**
 * Prüft ob ein User PICTS-Admin ist
 */
export async function isPICTSAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, ["picts_admin", "super_admin"]);
}

/**
 * Prüft ob ein User Super-Admin ist
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, "super_admin");
}

/**
 * Prüft ob ein User PICTS-Admin einer bestimmten Schule ist
 */
export async function isPICTSAdminOfSchule(
  userId: string,
  schuleId: string
): Promise<boolean> {
  const teacher = await getTeacherProfile(userId);
  if (!teacher) return false;

  const isAdmin = await isPICTSAdmin(userId);
  return isAdmin && teacher.schuleId === schuleId;
}

/**
 * Prüft ob ein User ein Custom Theme lesen darf
 * - Ersteller kann es immer lesen
 * - PICTS-Admin der gleichen Schule kann es lesen
 * - Systemweite (approved) Themen kann jeder lesen
 */
export async function canReadCustomTheme(
  userId: string,
  theme: {
    createdBy: string;
    schuleId: string;
    isSystemWide: boolean;
  }
): Promise<boolean> {
  // Eigenes Thema
  if (theme.createdBy === userId) return true;

  // Systemweites Thema
  if (theme.isSystemWide) return true;

  // Admin der gleichen Schule
  const isAdmin = await isPICTSAdminOfSchule(userId, theme.schuleId);
  return isAdmin;
}

/**
 * Prüft ob ein User ein Custom Theme bearbeiten darf
 * - Ersteller kann draft/rejected Themen bearbeiten
 * - Ersteller kann auch approved Themen bearbeiten (laut Anforderung)
 * - PICTS-Admin kann Themen seiner Schule bearbeiten (Status ändern)
 */
export async function canEditCustomTheme(
  userId: string,
  theme: {
    createdBy: string;
    schuleId: string;
    status: string;
  }
): Promise<boolean> {
  // Ersteller kann sein eigenes Thema bearbeiten
  if (theme.createdBy === userId) return true;

  // Admin der gleichen Schule kann bearbeiten (für Review)
  const isAdmin = await isPICTSAdminOfSchule(userId, theme.schuleId);
  return isAdmin;
}

/**
 * Prüft ob ein User ein Custom Theme löschen darf
 * - Nur Ersteller kann draft Themen löschen
 * - Super-Admin kann alle Themen löschen
 */
export async function canDeleteCustomTheme(
  userId: string,
  theme: {
    createdBy: string;
    status: string;
  }
): Promise<boolean> {
  // Super-Admin kann alles löschen
  if (await isSuperAdmin(userId)) return true;

  // Ersteller kann nur draft Themen löschen
  return theme.createdBy === userId && theme.status === "draft";
}

/**
 * Prüft ob ein User ein Custom Theme reviewen darf
 * - PICTS-Admin der gleichen Schule kann reviewen
 */
export async function canReviewCustomTheme(
  userId: string,
  schuleId: string
): Promise<boolean> {
  return isPICTSAdminOfSchule(userId, schuleId);
}
