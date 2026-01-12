/**
 * Audit Logging System für MIA-App
 *
 * Zentrale Logging-Funktionen für sicherheitsrelevante Aktionen.
 * Logs werden in Firestore gespeichert für spätere Auswertung.
 *
 * Verwendung:
 * ```typescript
 * await auditLog({
 *   action: "THEME_APPROVED",
 *   userId: adminId,
 *   userName: adminName,
 *   resourceType: "custom_theme",
 *   resourceId: themeId,
 *   details: { themeName: "..." },
 * });
 * ```
 */

import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// ============================================
// Types
// ============================================

export type AuditAction =
  // Authentication
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  // User Management
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "ROLE_CHANGED"
  | "SCHOOL_CHANGED"
  // Theme Management
  | "THEME_CREATED"
  | "THEME_UPDATED"
  | "THEME_DELETED"
  | "THEME_SUBMITTED"
  | "THEME_APPROVED"
  | "THEME_REJECTED"
  // Student Management
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "STUDENT_DELETED"
  | "CLASS_CREATED"
  | "CLASS_DELETED"
  // File Operations
  | "FILE_UPLOADED"
  | "FILE_DELETED"
  | "FILE_SHARED"
  // Artifact Operations
  | "ARTIFACT_UPLOADED"
  | "ARTIFACT_DELETED"
  // Admin Operations
  | "SCHOOL_CREATED"
  | "SCHOOL_UPDATED"
  | "SCHOOL_DELETED"
  | "DATA_SYNC_STARTED"
  | "DATA_SYNC_COMPLETED"
  | "DATA_SYNC_FAILED"
  // Security Events
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHORIZED_ACCESS"
  | "PERMISSION_DENIED";

export type ResourceType =
  | "user"
  | "teacher"
  | "student"
  | "class"
  | "custom_theme"
  | "system_theme"
  | "custom_lektion"
  | "school_file"
  | "artifact"
  | "school"
  | "notification"
  | "faq"
  | "system";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export interface AuditLogEntry {
  action: AuditAction;
  severity?: AuditSeverity;
  userId?: string;
  userName?: string;
  userRole?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  resourceName?: string;
  schuleId?: string;
  schuleName?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

interface StoredAuditLog extends AuditLogEntry {
  id: string;
  timestamp: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.FieldValue;
}

// ============================================
// Severity Mapping
// ============================================

const ACTION_SEVERITY: Record<AuditAction, AuditSeverity> = {
  // Info Level
  LOGIN_SUCCESS: "info",
  LOGOUT: "info",
  THEME_CREATED: "info",
  THEME_UPDATED: "info",
  THEME_SUBMITTED: "info",
  FILE_UPLOADED: "info",
  FILE_SHARED: "info",
  ARTIFACT_UPLOADED: "info",
  STUDENT_CREATED: "info",
  CLASS_CREATED: "info",
  USER_CREATED: "info",
  DATA_SYNC_STARTED: "info",
  DATA_SYNC_COMPLETED: "info",

  // Warning Level
  LOGIN_FAILED: "warning",
  PASSWORD_RESET_REQUESTED: "warning",
  USER_UPDATED: "warning",
  SCHOOL_CHANGED: "warning",
  THEME_REJECTED: "warning",
  FILE_DELETED: "warning",
  ARTIFACT_DELETED: "warning",
  STUDENT_UPDATED: "warning",

  // Error Level
  USER_DELETED: "error",
  STUDENT_DELETED: "error",
  CLASS_DELETED: "error",
  THEME_DELETED: "error",
  SCHOOL_DELETED: "error",
  DATA_SYNC_FAILED: "error",
  RATE_LIMIT_EXCEEDED: "error",

  // Critical Level
  ROLE_CHANGED: "critical",
  THEME_APPROVED: "critical",
  SCHOOL_CREATED: "critical",
  SCHOOL_UPDATED: "critical",
  PASSWORD_RESET_COMPLETED: "critical",
  UNAUTHORIZED_ACCESS: "critical",
  PERMISSION_DENIED: "critical",
};

// ============================================
// Main Logging Function
// ============================================

/**
 * Schreibt einen Audit-Log-Eintrag in Firestore
 *
 * @param entry - Die Audit-Log-Daten
 * @returns Die ID des erstellten Log-Eintrags
 */
export async function auditLog(entry: AuditLogEntry): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const collection = adminDb.collection("audit_logs");

    const severity = entry.severity || ACTION_SEVERITY[entry.action] || "info";

    const logEntry: Omit<StoredAuditLog, "id"> = {
      ...entry,
      severity,
      timestamp: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await collection.add(logEntry);

    // Bei kritischen Events zusätzlich in der Konsole loggen
    if (severity === "critical" || severity === "error") {
      console.log(`[AUDIT:${severity.toUpperCase()}] ${entry.action}`, {
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        details: entry.details,
      });
    }

    return docRef.id;
  } catch (error) {
    // Audit-Logging sollte niemals die Haupt-Operation blockieren
    console.error("[AUDIT] Failed to write audit log:", error, entry);
    return "";
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Loggt einen erfolgreichen Login
 */
export async function logLoginSuccess(
  userId: string,
  userName: string,
  userRole: string,
  ipAddress?: string
): Promise<void> {
  await auditLog({
    action: "LOGIN_SUCCESS",
    userId,
    userName,
    userRole,
    ipAddress,
    resourceType: "user",
    resourceId: userId,
  });
}

/**
 * Loggt einen fehlgeschlagenen Login-Versuch
 */
export async function logLoginFailed(
  email: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await auditLog({
    action: "LOGIN_FAILED",
    details: { email, reason },
    ipAddress,
    resourceType: "user",
  });
}

/**
 * Loggt eine Rollenänderung
 */
export async function logRoleChange(
  adminUserId: string,
  adminUserName: string,
  targetUserId: string,
  targetUserName: string,
  previousRole: string,
  newRole: string
): Promise<void> {
  await auditLog({
    action: "ROLE_CHANGED",
    userId: adminUserId,
    userName: adminUserName,
    resourceType: "user",
    resourceId: targetUserId,
    resourceName: targetUserName,
    previousValue: { role: previousRole },
    newValue: { role: newRole },
  });
}

/**
 * Loggt eine Theme-Genehmigung
 */
export async function logThemeApproval(
  adminUserId: string,
  adminUserName: string,
  themeId: string,
  themeName: string,
  createdByName: string
): Promise<void> {
  await auditLog({
    action: "THEME_APPROVED",
    userId: adminUserId,
    userName: adminUserName,
    resourceType: "custom_theme",
    resourceId: themeId,
    resourceName: themeName,
    details: { createdBy: createdByName },
  });
}

/**
 * Loggt eine Theme-Ablehnung
 */
export async function logThemeRejection(
  adminUserId: string,
  adminUserName: string,
  themeId: string,
  themeName: string,
  reason: string
): Promise<void> {
  await auditLog({
    action: "THEME_REJECTED",
    userId: adminUserId,
    userName: adminUserName,
    resourceType: "custom_theme",
    resourceId: themeId,
    resourceName: themeName,
    details: { reason },
  });
}

/**
 * Loggt einen Datei-Upload
 */
export async function logFileUpload(
  userId: string,
  userName: string,
  fileId: string,
  fileName: string,
  schuleId: string,
  sharedWith: string
): Promise<void> {
  await auditLog({
    action: "FILE_UPLOADED",
    userId,
    userName,
    resourceType: "school_file",
    resourceId: fileId,
    resourceName: fileName,
    schuleId,
    details: { sharedWith },
  });
}

/**
 * Loggt eine Datei-Löschung
 */
export async function logFileDeletion(
  userId: string,
  userName: string,
  fileId: string,
  fileName: string
): Promise<void> {
  await auditLog({
    action: "FILE_DELETED",
    userId,
    userName,
    resourceType: "school_file",
    resourceId: fileId,
    resourceName: fileName,
  });
}

/**
 * Loggt einen Sicherheitsvorfall
 */
export async function logSecurityEvent(
  action: "RATE_LIMIT_EXCEEDED" | "UNAUTHORIZED_ACCESS" | "PERMISSION_DENIED",
  details: Record<string, unknown>,
  ipAddress?: string,
  userId?: string
): Promise<void> {
  await auditLog({
    action,
    userId,
    ipAddress,
    resourceType: "system",
    details,
    severity: "critical",
  });
}

/**
 * Loggt einen Data Sync
 */
export async function logDataSync(
  action: "DATA_SYNC_STARTED" | "DATA_SYNC_COMPLETED" | "DATA_SYNC_FAILED",
  userId: string,
  userName: string,
  details?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    action,
    userId,
    userName,
    resourceType: "system",
    details,
  });
}

// ============================================
// Query Functions
// ============================================

/**
 * Lädt Audit-Logs mit optionalen Filtern
 */
export async function getAuditLogs(options: {
  limit?: number;
  userId?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
}): Promise<StoredAuditLog[]> {
  const adminDb = getAdminDb();
  let query: FirebaseFirestore.Query = adminDb.collection("audit_logs");

  if (options.userId) {
    query = query.where("userId", "==", options.userId);
  }
  if (options.resourceType) {
    query = query.where("resourceType", "==", options.resourceType);
  }
  if (options.resourceId) {
    query = query.where("resourceId", "==", options.resourceId);
  }
  if (options.action) {
    query = query.where("action", "==", options.action);
  }
  if (options.severity) {
    query = query.where("severity", "==", options.severity);
  }

  query = query.orderBy("timestamp", "desc");

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StoredAuditLog[];
}
