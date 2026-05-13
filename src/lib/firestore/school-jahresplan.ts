import { getAdminDb } from "@/lib/firebase/admin";
import {
  SchoolJahresplanAssignment,
  SchoolJahresplanSourceType,
  Stufe,
  Zeitraum,
  Fachbereich,
} from "@/types";
import * as admin from "firebase-admin";

const COLLECTION = "school_jahresplan_assignments";

/**
 * Konvertiert Firestore Timestamp zu Date (robust gegen verschiedene Eingabetypen)
 */
const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp?.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "string") return new Date(timestamp);
  return new Date();
};

/**
 * Mapped ein Firestore-Dokument auf das SchoolJahresplanAssignment-Interface
 */
const mapDoc = (
  doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot
): SchoolJahresplanAssignment => {
  const data = doc.data() || {};
  return {
    id: doc.id,
    schuleId: data.schuleId,
    sourceThemeId: data.sourceThemeId,
    sourceType: data.sourceType,
    zeitraumOverride: data.zeitraumOverride,
    stufeOverride: data.stufeOverride,
    themaOverride: data.themaOverride,
    beschreibungOverride: data.beschreibungOverride,
    lehrmittelOverride: data.lehrmittelOverride,
    bildLehrmittelOverride: data.bildLehrmittelOverride,
    anzahlLektionenOverride: data.anzahlLektionenOverride,
    fileRougeOverride: data.fileRougeOverride,
    unterlagenOverride: data.unterlagenOverride,
    empfohleneIntegrationsfaecherOverride:
      data.empfohleneIntegrationsfaecherOverride,
    schulMaterialien: data.schulMaterialien,
    schulNotizen: data.schulNotizen,
    schulUnterlagen: data.schulUnterlagen,
    assignedBy: data.assignedBy,
    assignedByName: data.assignedByName,
    assignedAt: timestampToDate(data.assignedAt),
    lastModifiedBy: data.lastModifiedBy,
    lastModifiedByName: data.lastModifiedByName,
    lastModifiedAt: data.lastModifiedAt
      ? timestampToDate(data.lastModifiedAt)
      : undefined,
    isActive: data.isActive !== false, // default true
    sortOrder: data.sortOrder,
  };
};

/**
 * Alle Assignments einer Schule laden (optional inkl. inaktive für Admin-UI)
 */
export async function getAssignmentsBySchule(
  schuleId: string,
  options?: { includeInactive?: boolean }
): Promise<SchoolJahresplanAssignment[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("schuleId", "==", schuleId)
      .get();

    const assignments = snapshot.docs.map(mapDoc);
    if (options?.includeInactive) return assignments;
    return assignments.filter((a) => a.isActive);
  } catch (error) {
    console.error("Error fetching school jahresplan assignments:", error);
    return [];
  }
}

/**
 * Einzelnes Assignment laden
 */
export async function getAssignmentById(
  id: string
): Promise<SchoolJahresplanAssignment | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return mapDoc(doc);
  } catch (error) {
    console.error("Error fetching assignment by ID:", error);
    return null;
  }
}

/**
 * Prüft, ob für eine Schule bereits ein Assignment für das Thema existiert.
 * Verhindert doppelte Zuordnungen.
 */
export async function findAssignment(
  schuleId: string,
  sourceThemeId: string,
  sourceType: SchoolJahresplanSourceType
): Promise<SchoolJahresplanAssignment | null> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("schuleId", "==", schuleId)
      .where("sourceThemeId", "==", sourceThemeId)
      .where("sourceType", "==", sourceType)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return mapDoc(snapshot.docs[0]);
  } catch (error) {
    console.error("Error finding assignment:", error);
    return null;
  }
}

/**
 * Erstellt ein neues Assignment oder reaktiviert ein vorhandenes (isActive = true)
 */
export async function upsertAssignment(input: {
  schuleId: string;
  sourceThemeId: string;
  sourceType: SchoolJahresplanSourceType;
  assignedBy: string;
  assignedByName: string;
}): Promise<string> {
  const adminDb = getAdminDb();
  const existing = await findAssignment(
    input.schuleId,
    input.sourceThemeId,
    input.sourceType
  );

  if (existing) {
    // Reaktiviere, falls inaktiv
    if (!existing.isActive) {
      await adminDb.collection(COLLECTION).doc(existing.id).update({
        isActive: true,
        lastModifiedBy: input.assignedBy,
        lastModifiedByName: input.assignedByName,
        lastModifiedAt: new Date(),
      });
    }
    return existing.id;
  }

  const now = new Date();
  const docRef = await adminDb.collection(COLLECTION).add({
    schuleId: input.schuleId,
    sourceThemeId: input.sourceThemeId,
    sourceType: input.sourceType,
    assignedBy: input.assignedBy,
    assignedByName: input.assignedByName,
    assignedAt: now,
    isActive: true,
  });
  return docRef.id;
}

/**
 * Bulk-Upsert mehrerer Assignments (z.B. beim Initial-Populate)
 * Verwendet Firestore-Batches (max. 500 Writes pro Batch).
 */
export async function bulkUpsertAssignments(
  schuleId: string,
  themes: Array<{ sourceThemeId: string; sourceType: SchoolJahresplanSourceType }>,
  assignedBy: string,
  assignedByName: string
): Promise<{ created: number; reactivated: number; skipped: number }> {
  const adminDb = getAdminDb();
  let created = 0;
  let reactivated = 0;
  let skipped = 0;

  // Bestehende Assignments in Batch holen, um Duplikate zu vermeiden
  const existing = await getAssignmentsBySchule(schuleId, { includeInactive: true });
  const existingMap = new Map<string, SchoolJahresplanAssignment>();
  existing.forEach((a) => {
    existingMap.set(`${a.sourceType}:${a.sourceThemeId}`, a);
  });

  const now = new Date();
  // Firestore Batches haben ein Limit von 500
  const CHUNK_SIZE = 450;
  for (let i = 0; i < themes.length; i += CHUNK_SIZE) {
    const chunk = themes.slice(i, i + CHUNK_SIZE);
    const batch = adminDb.batch();

    for (const t of chunk) {
      const key = `${t.sourceType}:${t.sourceThemeId}`;
      const ex = existingMap.get(key);
      if (ex) {
        if (ex.isActive) {
          skipped++;
        } else {
          batch.update(adminDb.collection(COLLECTION).doc(ex.id), {
            isActive: true,
            lastModifiedBy: assignedBy,
            lastModifiedByName: assignedByName,
            lastModifiedAt: now,
          });
          reactivated++;
        }
      } else {
        const ref = adminDb.collection(COLLECTION).doc();
        batch.set(ref, {
          schuleId,
          sourceThemeId: t.sourceThemeId,
          sourceType: t.sourceType,
          assignedBy,
          assignedByName,
          assignedAt: now,
          isActive: true,
        });
        created++;
      }
    }

    await batch.commit();
  }

  return { created, reactivated, skipped };
}

/**
 * Aktualisiert Overrides / Schul-Ergänzungen eines Assignments
 */
export async function updateAssignment(
  id: string,
  updates: {
    zeitraumOverride?: Zeitraum | null;
    stufeOverride?: Stufe[] | null;
    themaOverride?: string | null;
    beschreibungOverride?: string | null;
    lehrmittelOverride?: string | null;
    bildLehrmittelOverride?: string | null;
    anzahlLektionenOverride?: number | null;
    fileRougeOverride?: string | null;
    unterlagenOverride?: string | null;
    empfohleneIntegrationsfaecherOverride?: Fachbereich[] | null;
    schulMaterialien?: string[];
    schulNotizen?: string;
    schulUnterlagen?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
  modifiedBy: string,
  modifiedByName: string
): Promise<void> {
  const adminDb = getAdminDb();

  // Firestore akzeptiert undefined nicht; null bedeutet "Feld entfernen".
  const updateData: Record<string, any> = {
    lastModifiedBy: modifiedBy,
    lastModifiedByName: modifiedByName,
    lastModifiedAt: new Date(),
  };

  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue; // nicht setzen
    if (v === null) {
      updateData[k] = admin.firestore.FieldValue.delete();
    } else {
      updateData[k] = v;
    }
  }

  await adminDb.collection(COLLECTION).doc(id).update(updateData);
}

/**
 * Deaktiviert ein Assignment (Soft-Delete).
 * Lehrpersonen sehen es danach nicht mehr, aber Overrides bleiben erhalten
 * für den Fall einer Reaktivierung.
 */
export async function deactivateAssignment(
  id: string,
  modifiedBy: string,
  modifiedByName: string
): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION).doc(id).update({
    isActive: false,
    lastModifiedBy: modifiedBy,
    lastModifiedByName: modifiedByName,
    lastModifiedAt: new Date(),
  });
}

/**
 * Hart löschen (nur bei administrativem Cleanup)
 */
export async function deleteAssignment(id: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION).doc(id).delete();
}

/**
 * Liefert die IDs aller Schulen, die im Modus `curated` sind.
 * Wird genutzt, um neu freigegebene Custom Themes automatisch in die
 * kuratierten Schul-Jahrespläne aufzunehmen.
 */
export async function getCuratedSchuleIds(): Promise<string[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection("system_schulen")
      .where("jahresplanMode", "==", "curated")
      .get();
    return snapshot.docs.map((d) => d.id);
  } catch (error) {
    console.error("Error fetching curated school IDs:", error);
    return [];
  }
}

/**
 * Weist ein einzelnes Thema allen Schulen zu, die im Modus `curated` sind
 * (Upsert; reaktiviert deaktivierte Assignments). Idempotent.
 *
 * Bereits aktive Assignments bleiben unverändert (Overrides bleiben erhalten).
 */
export async function autoAssignThemeToCuratedSchools(input: {
  sourceThemeId: string;
  sourceType: SchoolJahresplanSourceType;
  assignedBy: string;
  assignedByName: string;
}): Promise<{ schools: number; created: number; reactivated: number; skipped: number }> {
  const schuleIds = await getCuratedSchuleIds();
  let created = 0;
  let reactivated = 0;
  let skipped = 0;

  for (const schuleId of schuleIds) {
    const existing = await findAssignment(
      schuleId,
      input.sourceThemeId,
      input.sourceType
    );
    if (existing) {
      if (existing.isActive) {
        skipped++;
      } else {
        const adminDb = getAdminDb();
        await adminDb.collection(COLLECTION).doc(existing.id).update({
          isActive: true,
          lastModifiedBy: input.assignedBy,
          lastModifiedByName: input.assignedByName,
          lastModifiedAt: new Date(),
        });
        reactivated++;
      }
    } else {
      const adminDb = getAdminDb();
      await adminDb.collection(COLLECTION).add({
        schuleId,
        sourceThemeId: input.sourceThemeId,
        sourceType: input.sourceType,
        assignedBy: input.assignedBy,
        assignedByName: input.assignedByName,
        assignedAt: new Date(),
        isActive: true,
      });
      created++;
    }
  }

  return { schools: schuleIds.length, created, reactivated, skipped };
}
