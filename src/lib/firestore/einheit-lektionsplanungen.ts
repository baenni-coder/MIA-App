import { getAdminDb } from "@/lib/firebase/admin";
import { EinheitLektionsplanung } from "@/types";
import { deleteCustomLektionenByLektionsplanungId } from "@/lib/firestore/custom-lektionen";

const LEKTIONSPLANUNGEN_COLLECTION = "jahresplan_lektionsplanungen";

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
  return new Date(timestamp as string);
};

function docToLektionsplanung(
  doc: FirebaseFirestore.DocumentSnapshot
): EinheitLektionsplanung {
  const data = doc.data()!;
  return {
    id: doc.id,
    einheitId: data.einheitId,
    teacherId: data.teacherId,
    schuleId: data.schuleId || undefined,
    name: data.name,
    beschreibung: data.beschreibung || undefined,
    order: data.order || 0,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

/**
 * Erstellt eine neue Lektionsplanung innerhalb einer Einheit
 */
export async function createEinheitLektionsplanung(data: {
  einheitId: string;
  teacherId: string;
  schuleId?: string;
  name: string;
  beschreibung?: string;
  order: number;
}): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    const docData = {
      einheitId: data.einheitId,
      teacherId: data.teacherId,
      ...(data.schuleId ? { schuleId: data.schuleId } : {}),
      name: data.name,
      ...(data.beschreibung ? { beschreibung: data.beschreibung } : {}),
      order: data.order,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb
      .collection(LEKTIONSPLANUNGEN_COLLECTION)
      .add(docData);

    return docRef.id;
  } catch (error) {
    console.error("Error creating einheit lektionsplanung:", error);
    throw new Error("Failed to create einheit lektionsplanung");
  }
}

/**
 * Lädt alle Lektionsplanungen einer Einheit (sortiert nach order)
 */
export async function getEinheitLektionsplanungenByEinheit(
  einheitId: string
): Promise<EinheitLektionsplanung[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(LEKTIONSPLANUNGEN_COLLECTION)
      .where("einheitId", "==", einheitId)
      .get();

    return snapshot.docs
      .map((doc) => docToLektionsplanung(doc))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error("Error fetching einheit lektionsplanungen:", error);
    return [];
  }
}

/**
 * Lädt eine Lektionsplanung nach ID
 */
export async function getEinheitLektionsplanungById(
  id: string
): Promise<EinheitLektionsplanung | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb
      .collection(LEKTIONSPLANUNGEN_COLLECTION)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    return docToLektionsplanung(doc);
  } catch (error) {
    console.error("Error fetching einheit lektionsplanung:", error);
    return null;
  }
}

/**
 * Aktualisiert eine Lektionsplanung
 */
export async function updateEinheitLektionsplanung(
  id: string,
  updates: Partial<
    Pick<EinheitLektionsplanung, "name" | "beschreibung" | "order">
  >
): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb
      .collection(LEKTIONSPLANUNGEN_COLLECTION)
      .doc(id)
      .update({
        ...updates,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error("Error updating einheit lektionsplanung:", error);
    throw new Error("Failed to update einheit lektionsplanung");
  }
}

/**
 * Löscht eine Lektionsplanung inkl. aller zugehörigen Lektionen (Cascade)
 */
export async function deleteEinheitLektionsplanung(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    // Zuerst die zugehörigen Lektionen löschen
    await deleteCustomLektionenByLektionsplanungId(id);
    // Dann die Planung selbst
    await adminDb.collection(LEKTIONSPLANUNGEN_COLLECTION).doc(id).delete();
  } catch (error) {
    console.error("Error deleting einheit lektionsplanung:", error);
    throw new Error("Failed to delete einheit lektionsplanung");
  }
}

/**
 * Löscht alle Lektionsplanungen einer Einheit inkl. ihrer Lektionen
 * (Cascade beim Löschen der Einheit)
 */
export async function deleteEinheitLektionsplanungenByEinheit(
  einheitId: string
): Promise<void> {
  try {
    const planungen = await getEinheitLektionsplanungenByEinheit(einheitId);
    for (const planung of planungen) {
      await deleteEinheitLektionsplanung(planung.id);
    }
  } catch (error) {
    console.error(
      "Error deleting einheit lektionsplanungen by einheit:",
      error
    );
    throw new Error("Failed to delete einheit lektionsplanungen by einheit");
  }
}
