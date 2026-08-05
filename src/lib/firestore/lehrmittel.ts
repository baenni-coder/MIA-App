import { getAdminDb } from "@/lib/firebase/admin";
import { Lehrmittel } from "@/types";

const LEHRMITTEL_COLLECTION = "lehrmittel";

/**
 * Konvertiert Firestore Timestamp zu Date
 */
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

function docToLehrmittel(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
): Lehrmittel {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    bildUrl: data.bildUrl || undefined,
    beschreibung: data.beschreibung || undefined,
    isSystemWide: data.isSystemWide || false,
    schuleId: data.schuleId || "",
    createdBy: data.createdBy,
    createdByName: data.createdByName || "",
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    approvedBy: data.approvedBy || undefined,
    approvedByName: data.approvedByName || undefined,
    approvedAt: data.approvedAt ? timestampToDate(data.approvedAt) : undefined,
  };
}

/**
 * Lädt alle sichtbaren Lehrmittel: systemweite + (falls schoolId gesetzt) die
 * schulweiten der eigenen Schule. Alphabetisch sortiert.
 */
export async function getAllLehrmittel(
  schoolId?: string
): Promise<Lehrmittel[]> {
  const adminDb = getAdminDb();

  const systemSnapshot = await adminDb
    .collection(LEHRMITTEL_COLLECTION)
    .where("isSystemWide", "==", true)
    .get();

  const systemLehrmittel = systemSnapshot.docs.map(docToLehrmittel);

  let schoolLehrmittel: Lehrmittel[] = [];
  if (schoolId) {
    const schoolSnapshot = await adminDb
      .collection(LEHRMITTEL_COLLECTION)
      .where("isSystemWide", "==", false)
      .where("schuleId", "==", schoolId)
      .get();
    schoolLehrmittel = schoolSnapshot.docs.map(docToLehrmittel);
  }

  // Dedupe (falls ein Doc theoretisch beide Queries träfe) + Sortierung
  const byId = new Map<string, Lehrmittel>();
  [...systemLehrmittel, ...schoolLehrmittel].forEach((l) => byId.set(l.id, l));

  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Lädt ein einzelnes Lehrmittel nach ID.
 */
export async function getLehrmittelById(
  id: string
): Promise<Lehrmittel | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection(LEHRMITTEL_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToLehrmittel(doc);
}

/**
 * Erstellt ein neues Lehrmittel (immer schulweit, isSystemWide=false).
 */
export async function createLehrmittel(data: {
  name: string;
  bildUrl?: string;
  beschreibung?: string;
  schuleId: string;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const adminDb = getAdminDb();
  const now = new Date();

  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );

  const docRef = await adminDb.collection(LEHRMITTEL_COLLECTION).add({
    ...cleaned,
    isSystemWide: false,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * Aktualisiert ein Lehrmittel. Der API-Layer stellt sicher, dass nur erlaubte
 * Felder übergeben werden (isSystemWide/Audit nur durch Admins).
 */
export async function updateLehrmittel(
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb
    .collection(LEHRMITTEL_COLLECTION)
    .doc(id)
    .update({ ...updates, updatedAt: new Date() });
}

/**
 * Löscht ein Lehrmittel.
 */
export async function deleteLehrmittel(id: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(LEHRMITTEL_COLLECTION).doc(id).delete();
}
