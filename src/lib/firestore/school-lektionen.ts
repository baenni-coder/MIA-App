import { getAdminDb } from "@/lib/firebase/admin";
import {
  SchoolLektionOverride,
  SchoolJahresplanSourceType,
  WebsiteTool,
} from "@/types";

const COLLECTION = "school_lektion_overrides";

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

const mapDoc = (doc: FirebaseFirestore.DocumentSnapshot): SchoolLektionOverride => {
  const data = doc.data() || {};
  return {
    id: doc.id,
    schuleId: data.schuleId,
    sourceType: data.sourceType,
    sourceThemeId: data.sourceThemeId,
    originalLektionId: data.originalLektionId,
    originalLektionKey: data.originalLektionKey,
    useOriginal: data.useOriginal !== false, // default true
    isHidden: data.isHidden === true,
    lektion: data.lektion || "",
    eindeutigeBezeichnung: data.eindeutigeBezeichnung,
    aufgaben: data.aufgaben,
    vorwissen: data.vorwissen,
    material: data.material,
    websiteTools: data.websiteTools,
    einstieg: data.einstieg,
    hauptteil: data.hauptteil,
    abschluss: data.abschluss,
    stolpersteine: data.stolpersteine,
    sortOrder: data.sortOrder,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    lastModifiedBy: data.lastModifiedBy,
    lastModifiedByName: data.lastModifiedByName,
  };
};

/**
 * Entfernt undefined-Werte (Firestore akzeptiert kein undefined)
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/**
 * Lädt alle Lektions-Overrides einer Schule für ein bestimmtes Pool-Thema.
 * Nur Gleichheitsfilter → kein Composite Index nötig; Sortierung in-memory.
 */
export async function getSchoolLektionOverrides(
  schuleId: string,
  sourceType: SchoolJahresplanSourceType,
  sourceThemeId: string
): Promise<SchoolLektionOverride[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("schuleId", "==", schuleId)
      .where("sourceType", "==", sourceType)
      .where("sourceThemeId", "==", sourceThemeId)
      .get();

    return snapshot.docs
      .map(mapDoc)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } catch (error) {
    console.error("Error fetching school lektion overrides:", error);
    return [];
  }
}

/**
 * Einzelnes Override laden
 */
export async function getSchoolLektionOverrideById(
  id: string
): Promise<SchoolLektionOverride | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return mapDoc(doc);
  } catch (error) {
    console.error("Error fetching school lektion override by ID:", error);
    return null;
  }
}

/**
 * Erstellt ein neues Lektions-Override
 */
export async function createSchoolLektionOverride(input: {
  schuleId: string;
  sourceType: SchoolJahresplanSourceType;
  sourceThemeId: string;
  originalLektionId?: string;
  originalLektionKey?: string;
  useOriginal?: boolean;
  isHidden?: boolean;
  lektion: string;
  eindeutigeBezeichnung?: string;
  aufgaben?: string;
  vorwissen?: string;
  material?: string[];
  websiteTools?: WebsiteTool[];
  einstieg?: string;
  hauptteil?: string;
  abschluss?: string;
  stolpersteine?: string;
  sortOrder?: number;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const adminDb = getAdminDb();
  const now = new Date();
  const docRef = await adminDb.collection(COLLECTION).add(
    stripUndefined({
      ...input,
      useOriginal: input.useOriginal !== false,
      isHidden: input.isHidden === true,
      createdAt: now,
      updatedAt: now,
    })
  );
  return docRef.id;
}

/**
 * Aktualisiert ein Lektions-Override. null entfernt das jeweilige Feld.
 */
export async function updateSchoolLektionOverride(
  id: string,
  updates: {
    useOriginal?: boolean;
    isHidden?: boolean;
    lektion?: string;
    eindeutigeBezeichnung?: string | null;
    aufgaben?: string | null;
    vorwissen?: string | null;
    material?: string[] | null;
    websiteTools?: WebsiteTool[] | null;
    einstieg?: string | null;
    hauptteil?: string | null;
    abschluss?: string | null;
    stolpersteine?: string | null;
    sortOrder?: number;
  },
  modifiedBy: string,
  modifiedByName: string
): Promise<void> {
  const adminDb = getAdminDb();
  const admin = await import("firebase-admin");

  const updateData: Record<string, any> = {
    lastModifiedBy: modifiedBy,
    lastModifiedByName: modifiedByName,
    updatedAt: new Date(),
  };

  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    updateData[k] = v === null ? admin.firestore.FieldValue.delete() : v;
  }

  await adminDb.collection(COLLECTION).doc(id).update(updateData);
}

/**
 * Löscht ein Lektions-Override (setzt die Schule wieder auf das Original zurück)
 */
export async function deleteSchoolLektionOverride(id: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION).doc(id).delete();
}
