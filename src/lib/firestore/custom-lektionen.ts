import { getAdminDb } from "@/lib/firebase/admin";
import { CustomLektion, WebsiteTool } from "@/types";

const CUSTOM_LEKTIONEN_COLLECTION = "custom_lektionen";

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
 * Erstellt eine neue Custom Lektion
 */
export async function createCustomLektion(
  data: {
    themeId: string;
    lektion: string;
    eindeutigeBezeichnung: string;
    aufgaben?: string;
    vorwissen?: string;
    material?: string[];
    websiteTools?: WebsiteTool[];
    einstieg?: string;
    hauptteil?: string;
    abschluss?: string;
    stolpersteine?: string;
    kiZusammenfassung?: string;
    createdBy: string;
    order: number;
  }
): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    const lektionData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb
      .collection(CUSTOM_LEKTIONEN_COLLECTION)
      .add(lektionData);

    return docRef.id;
  } catch (error) {
    console.error("Error creating custom lektion:", error);
    throw new Error("Failed to create custom lektion");
  }
}

/**
 * Lädt eine Custom Lektion nach ID
 */
export async function getCustomLektionById(
  id: string
): Promise<CustomLektion | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb
      .collection(CUSTOM_LEKTIONEN_COLLECTION)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      id: doc.id,
      themeId: data.themeId,
      lektion: data.lektion,
      eindeutigeBezeichnung: data.eindeutigeBezeichnung,
      aufgaben: data.aufgaben,
      vorwissen: data.vorwissen,
      material: data.material,
      websiteTools: data.websiteTools,
      einstieg: data.einstieg,
      hauptteil: data.hauptteil,
      abschluss: data.abschluss,
      stolpersteine: data.stolpersteine,
      kiZusammenfassung: data.kiZusammenfassung,
      createdBy: data.createdBy,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
      order: data.order,
    };
  } catch (error) {
    console.error("Error fetching custom lektion:", error);
    return null;
  }
}

/**
 * Lädt alle Lektionen eines Custom Themes
 */
export async function getCustomLektionenByThemeId(
  themeId: string
): Promise<CustomLektion[]> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(CUSTOM_LEKTIONEN_COLLECTION)
      .where("themeId", "==", themeId)
      .orderBy("order", "asc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        themeId: data.themeId,
        lektion: data.lektion,
        eindeutigeBezeichnung: data.eindeutigeBezeichnung,
        aufgaben: data.aufgaben,
        vorwissen: data.vorwissen,
        material: data.material,
        websiteTools: data.websiteTools,
        einstieg: data.einstieg,
        hauptteil: data.hauptteil,
        abschluss: data.abschluss,
        stolpersteine: data.stolpersteine,
        kiZusammenfassung: data.kiZusammenfassung,
        createdBy: data.createdBy,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        order: data.order,
      };
    });
  } catch (error) {
    console.error("Error fetching custom lektionen by theme:", error);
    return [];
  }
}

/**
 * Aktualisiert eine Custom Lektion
 */
export async function updateCustomLektion(
  id: string,
  updates: Partial<
    Omit<CustomLektion, "id" | "createdAt" | "createdBy" | "themeId">
  >
): Promise<void> {
  try {
    const adminDb = getAdminDb();

    await adminDb
      .collection(CUSTOM_LEKTIONEN_COLLECTION)
      .doc(id)
      .update({
        ...updates,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error("Error updating custom lektion:", error);
    throw new Error("Failed to update custom lektion");
  }
}

/**
 * Löscht eine Custom Lektion
 */
export async function deleteCustomLektion(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection(CUSTOM_LEKTIONEN_COLLECTION).doc(id).delete();
  } catch (error) {
    console.error("Error deleting custom lektion:", error);
    throw new Error("Failed to delete custom lektion");
  }
}

/**
 * Löscht alle Lektionen eines Custom Themes
 */
export async function deleteCustomLektionenByThemeId(
  themeId: string
): Promise<void> {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection(CUSTOM_LEKTIONEN_COLLECTION)
      .where("themeId", "==", themeId)
      .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error deleting custom lektionen by theme:", error);
    throw new Error("Failed to delete custom lektionen");
  }
}

/**
 * Erstellt mehrere Custom Lektionen auf einmal
 */
export async function createMultipleCustomLektionen(
  lektionen: Array<{
    themeId: string;
    lektion: string;
    eindeutigeBezeichnung: string;
    aufgaben?: string;
    vorwissen?: string;
    material?: string[];
    websiteTools?: WebsiteTool[];
    einstieg?: string;
    hauptteil?: string;
    abschluss?: string;
    stolpersteine?: string;
    kiZusammenfassung?: string;
    createdBy: string;
    order: number;
  }>
): Promise<string[]> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    const batch = adminDb.batch();
    const ids: string[] = [];

    lektionen.forEach((lektion) => {
      const docRef = adminDb.collection(CUSTOM_LEKTIONEN_COLLECTION).doc();
      ids.push(docRef.id);

      batch.set(docRef, {
        ...lektion,
        createdAt: now,
        updatedAt: now,
      });
    });

    await batch.commit();
    return ids;
  } catch (error) {
    console.error("Error creating multiple custom lektionen:", error);
    throw new Error("Failed to create multiple custom lektionen");
  }
}
