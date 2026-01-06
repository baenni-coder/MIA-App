import { getAdminDb } from "@/lib/firebase/admin";
import { Notification, NotificationType, UserRole } from "@/types";
import { getTeacherProfile } from "./permissions";
import * as admin from "firebase-admin";

const NOTIFICATIONS_COLLECTION = "notifications";

/**
 * Konvertiert Firestore Timestamp zu Date
 */
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

/**
 * Erstellt eine neue Notification
 */
export async function createNotification(data: {
  recipientId: string;
  recipientRole: UserRole;
  type: NotificationType;
  themeId: string;
  themeTitle: string;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  schuleId: string;
  message: string;
  actionUrl?: string;
}): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    const notificationData = {
      ...data,
      read: false,
      createdAt: now,
    };

    const docRef = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .add(notificationData);

    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
}

/**
 * Erstellt Notifications für alle PICTS-Admins einer Schule
 */
export async function notifyPICTSAdmins(
  schuleId: string,
  data: {
    type: NotificationType;
    themeId: string;
    themeTitle: string;
    createdBy: string;
    createdByName: string;
    createdByEmail: string;
    message: string;
    actionUrl?: string;
  }
): Promise<string[]> {
  try {
    const adminDb = getAdminDb();

    // Finde alle PICTS-Admins der Schule
    const adminsSnapshot = await adminDb
      .collection("teachers")
      .where("schuleId", "==", schuleId)
      .where("role", "in", ["picts_admin", "super_admin"])
      .get();

    if (adminsSnapshot.empty) {
      console.warn(`No PICTS admins found for school ${schuleId}`);
      return [];
    }

    // Erstelle Notification für jeden Admin
    const notificationIds: string[] = [];
    const batch = adminDb.batch();

    adminsSnapshot.docs.forEach((doc) => {
      const admin = doc.data();
      const notifRef = adminDb.collection(NOTIFICATIONS_COLLECTION).doc();

      batch.set(notifRef, {
        recipientId: doc.id,
        recipientRole: admin.role,
        type: data.type,
        themeId: data.themeId,
        themeTitle: data.themeTitle,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByEmail: data.createdByEmail,
        schuleId: schuleId,
        message: data.message,
        actionUrl: data.actionUrl,
        read: false,
        createdAt: new Date(),
      });

      notificationIds.push(notifRef.id);
    });

    await batch.commit();
    return notificationIds;
  } catch (error) {
    console.error("Error notifying PICTS admins:", error);
    throw new Error("Failed to notify PICTS admins");
  }
}

/**
 * Lädt alle Notifications für einen User
 */
export async function getNotificationsByRecipient(
  recipientId: string,
  filters?: {
    unreadOnly?: boolean;
    limit?: number;
  }
): Promise<Notification[]> {
  try {
    const adminDb = getAdminDb();
    let query: admin.firestore.Query = adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where("recipientId", "==", recipientId)
      .orderBy("createdAt", "desc");

    if (filters?.unreadOnly) {
      query = query.where("read", "==", false);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        recipientId: data.recipientId,
        recipientRole: data.recipientRole,
        type: data.type,
        themeId: data.themeId,
        themeTitle: data.themeTitle,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByEmail: data.createdByEmail,
        schuleId: data.schuleId,
        message: data.message,
        actionUrl: data.actionUrl,
        read: data.read,
        createdAt: timestampToDate(data.createdAt),
        readAt: data.readAt ? timestampToDate(data.readAt) : undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

/**
 * Markiert eine Notification als gelesen
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection(NOTIFICATIONS_COLLECTION).doc(id).update({
      read: true,
      readAt: new Date(),
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw new Error("Failed to mark notification as read");
  }
}

/**
 * Markiert alle Notifications eines Users als gelesen
 */
export async function markAllNotificationsAsRead(
  recipientId: string
): Promise<void> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where("recipientId", "==", recipientId)
      .where("read", "==", false)
      .get();

    if (snapshot.empty) return;

    const batch = adminDb.batch();
    const now = new Date();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: now,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error("Failed to mark all notifications as read");
  }
}

/**
 * Löscht eine Notification
 */
export async function deleteNotification(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection(NOTIFICATIONS_COLLECTION).doc(id).delete();
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw new Error("Failed to delete notification");
  }
}

/**
 * Zählt ungelesene Notifications
 */
export async function getUnreadCount(recipientId: string): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where("recipientId", "==", recipientId)
      .where("read", "==", false)
      .get();

    return snapshot.size;
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    return 0;
  }
}

/**
 * Benachrichtigt User über Theme-Submission
 */
export async function notifyThemeSubmitted(
  themeId: string,
  themeTitle: string,
  createdBy: string,
  createdByName: string,
  createdByEmail: string,
  schuleId: string
): Promise<void> {
  try {
    await notifyPICTSAdmins(schuleId, {
      type: "theme_submitted",
      themeId,
      themeTitle,
      createdBy,
      createdByName,
      createdByEmail,
      message: `${createdByName} hat das Thema "${themeTitle}" zur Prüfung eingereicht.`,
      actionUrl: `/dashboard/admin?themeId=${themeId}`,
    });
  } catch (error) {
    console.error("Error notifying theme submitted:", error);
  }
}

/**
 * Benachrichtigt Ersteller über Theme-Approval
 */
export async function notifyThemeApproved(
  themeId: string,
  themeTitle: string,
  createdBy: string,
  approvedByName: string,
  schuleId: string
): Promise<void> {
  try {
    const teacher = await getTeacherProfile(createdBy);
    if (!teacher) return;

    await createNotification({
      recipientId: createdBy,
      recipientRole: teacher.role as UserRole,
      type: "theme_approved",
      themeId,
      themeTitle,
      createdBy: createdBy,
      createdByName: teacher.name,
      createdByEmail: teacher.email,
      schuleId,
      message: `Ihr Thema "${themeTitle}" wurde von ${approvedByName} freigegeben und ist jetzt systemweit sichtbar.`,
      actionUrl: `/dashboard/meine-themen`,
    });
  } catch (error) {
    console.error("Error notifying theme approved:", error);
  }
}

/**
 * Benachrichtigt Ersteller über Theme-Rejection
 */
export async function notifyThemeRejected(
  themeId: string,
  themeTitle: string,
  createdBy: string,
  rejectedByName: string,
  reviewNotes: string,
  schuleId: string
): Promise<void> {
  try {
    const teacher = await getTeacherProfile(createdBy);
    if (!teacher) return;

    await createNotification({
      recipientId: createdBy,
      recipientRole: teacher.role as UserRole,
      type: "theme_rejected",
      themeId,
      themeTitle,
      createdBy: createdBy,
      createdByName: teacher.name,
      createdByEmail: teacher.email,
      schuleId,
      message: `Ihr Thema "${themeTitle}" wurde von ${rejectedByName} abgelehnt. Feedback: ${reviewNotes}`,
      actionUrl: `/dashboard/meine-themen`,
    });
  } catch (error) {
    console.error("Error notifying theme rejected:", error);
  }
}

// ============================================
// Schulwechsel/Schulbeitritt Notifications
// ============================================

/**
 * Benachrichtigt alle Super-Admins über eine neue Schulwechsel-/Schulbeitritts-Anfrage
 */
export async function notifySuperAdminsAboutSchoolRequest(data: {
  requestId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  requestType: "join" | "change";
  currentSchuleName: string;
  newSchuleName: string;
}): Promise<string[]> {
  try {
    const adminDb = getAdminDb();

    // Finde alle Super-Admins
    const superAdminsSnapshot = await adminDb
      .collection("teachers")
      .where("role", "==", "super_admin")
      .get();

    if (superAdminsSnapshot.empty) {
      console.warn("No super admins found to notify about school request");
      return [];
    }

    const isJoin = data.requestType === "join";
    const notificationIds: string[] = [];
    const batch = adminDb.batch();

    superAdminsSnapshot.docs.forEach((doc) => {
      const superAdmin = doc.data();
      const notifRef = adminDb.collection("notifications").doc();

      const message = isJoin
        ? `${data.teacherName} hat sich registriert und möchte der Schule "${data.newSchuleName}" beitreten.`
        : `${data.teacherName} möchte von "${data.currentSchuleName}" zu "${data.newSchuleName}" wechseln.`;

      batch.set(notifRef, {
        recipientId: doc.id,
        recipientRole: superAdmin.role,
        type: "school_change_requested",
        themeId: data.requestId, // Wir nutzen themeId für die Request-ID
        themeTitle: isJoin ? "Schulbeitritts-Anfrage" : "Schulwechsel-Anfrage",
        createdBy: data.teacherId,
        createdByName: data.teacherName,
        createdByEmail: data.teacherEmail,
        schuleId: data.newSchuleName, // Speichere Schulname für Kontext
        message,
        actionUrl: `/dashboard/admin/school-requests`,
        read: false,
        createdAt: new Date(),
      });

      notificationIds.push(notifRef.id);
    });

    await batch.commit();
    console.log(`Notified ${notificationIds.length} super admins about school request`);
    return notificationIds;
  } catch (error) {
    console.error("Error notifying super admins about school request:", error);
    return [];
  }
}

/**
 * Benachrichtigt Lehrer über genehmigte Schulwechsel-/Schulbeitritts-Anfrage
 */
export async function notifySchoolRequestApproved(data: {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  requestType: "join" | "change";
  newSchuleName: string;
  approvedByName: string;
}): Promise<void> {
  try {
    const teacher = await getTeacherProfile(data.teacherId);
    if (!teacher) return;

    const isJoin = data.requestType === "join";
    const message = isJoin
      ? `Willkommen! Ihre Anfrage, der Schule "${data.newSchuleName}" beizutreten, wurde von ${data.approvedByName} genehmigt. Sie haben jetzt vollen Zugriff auf alle Schulfunktionen.`
      : `Ihre Anfrage, zur Schule "${data.newSchuleName}" zu wechseln, wurde von ${data.approvedByName} genehmigt.`;

    await createNotification({
      recipientId: data.teacherId,
      recipientRole: teacher.role as UserRole,
      type: "school_change_approved",
      themeId: "", // Keine Theme-ID
      themeTitle: isJoin ? "Schulbeitritt genehmigt" : "Schulwechsel genehmigt",
      createdBy: data.teacherId,
      createdByName: data.teacherName,
      createdByEmail: data.teacherEmail,
      schuleId: data.newSchuleName,
      message,
      actionUrl: `/dashboard`,
    });
  } catch (error) {
    console.error("Error notifying school request approved:", error);
  }
}

/**
 * Benachrichtigt Lehrer über abgelehnte Schulwechsel-/Schulbeitritts-Anfrage
 */
export async function notifySchoolRequestRejected(data: {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  requestType: "join" | "change";
  newSchuleName: string;
  rejectedByName: string;
  reviewNotes?: string;
}): Promise<void> {
  try {
    const teacher = await getTeacherProfile(data.teacherId);
    if (!teacher) return;

    const isJoin = data.requestType === "join";
    let message = isJoin
      ? `Ihre Anfrage, der Schule "${data.newSchuleName}" beizutreten, wurde von ${data.rejectedByName} abgelehnt.`
      : `Ihre Anfrage, zur Schule "${data.newSchuleName}" zu wechseln, wurde von ${data.rejectedByName} abgelehnt.`;

    if (data.reviewNotes) {
      message += ` Begründung: ${data.reviewNotes}`;
    }

    await createNotification({
      recipientId: data.teacherId,
      recipientRole: teacher.role as UserRole,
      type: "school_change_rejected",
      themeId: "",
      themeTitle: isJoin ? "Schulbeitritt abgelehnt" : "Schulwechsel abgelehnt",
      createdBy: data.teacherId,
      createdByName: data.teacherName,
      createdByEmail: data.teacherEmail,
      schuleId: data.newSchuleName,
      message,
      actionUrl: `/dashboard`,
    });
  } catch (error) {
    console.error("Error notifying school request rejected:", error);
  }
}

// ============================================
// Student Notifications
// ============================================

/**
 * Erstellt eine einfache Notification für einen Schüler
 */
export async function createStudentNotification(data: {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    const notificationData = {
      recipientId: data.recipientId,
      recipientRole: "student" as UserRole,
      type: data.type,
      themeId: "",
      themeTitle: data.title,
      createdBy: "system",
      createdByName: "System",
      createdByEmail: "",
      schuleId: "",
      message: data.message,
      actionUrl: data.actionUrl,
      read: false,
      createdAt: now,
    };

    const docRef = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .add(notificationData);

    return docRef.id;
  } catch (error) {
    console.error("Error creating student notification:", error);
    throw new Error("Failed to create student notification");
  }
}

/**
 * Benachrichtigt einen Schüler über ein neues Badge
 */
export async function notifyStudentBadgeEarned(data: {
  studentId: string;
  badgeName: string;
  badgeEmoji: string;
}): Promise<void> {
  try {
    await createStudentNotification({
      recipientId: data.studentId,
      type: "badge_earned" as NotificationType,
      title: "Neues Badge erhalten!",
      message: `Herzlichen Glückwunsch! Du hast das Badge "${data.badgeEmoji} ${data.badgeName}" erhalten!`,
      actionUrl: "/schueler/badges",
    });
  } catch (error) {
    console.error("Error notifying student about badge:", error);
  }
}

/**
 * Benachrichtigt alle Schüler einer Klasse über ein neues Thema
 */
export async function notifyClassThemeCompleted(data: {
  classId: string;
  themeName: string;
  teacherName: string;
}): Promise<void> {
  try {
    const adminDb = getAdminDb();

    // Finde alle Schüler der Klasse
    const studentsSnapshot = await adminDb
      .collection("students")
      .where("classId", "==", data.classId)
      .get();

    if (studentsSnapshot.empty) return;

    const batch = adminDb.batch();

    studentsSnapshot.docs.forEach((doc) => {
      const notifRef = adminDb.collection(NOTIFICATIONS_COLLECTION).doc();

      batch.set(notifRef, {
        recipientId: doc.id,
        recipientRole: "student",
        type: "theme_completed",
        themeId: "",
        themeTitle: "Neues Thema abgeschlossen",
        createdBy: "system",
        createdByName: data.teacherName,
        createdByEmail: "",
        schuleId: "",
        message: `${data.teacherName} hat das Thema "${data.themeName}" für eure Klasse als bearbeitet markiert. Vergiss nicht, deine Kompetenzen zu bewerten!`,
        actionUrl: "/schueler/kompetenzen",
        read: false,
        createdAt: new Date(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error notifying class about theme:", error);
  }
}
