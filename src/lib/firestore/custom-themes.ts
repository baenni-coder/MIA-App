import { getAdminDb } from "@/lib/firebase/admin";
import { CustomTheme, ThemeStatus, Stufe, Zeitraum } from "@/types";
import { getKompetenzenByIds } from "@/lib/airtable/kompetenzen";
import * as admin from "firebase-admin";

const CUSTOM_THEMES_COLLECTION = "custom_themes";

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
 * Erstellt ein neues Custom Theme
 */
export async function createCustomTheme(
  data: {
    thema: string;
    beschreibung: string;
    lehrmittel?: string;
    bildLehrmittel?: string;
    anzahlLektionen: number;
    schuljahr: Stufe[];
    zeitraum: Zeitraum;
    kompetenzenIds: string[];
    fileRouge?: string;
    unterlagen?: string;
    createdBy: string;
    createdByName: string;
    schuleId: string;
    status?: ThemeStatus;
  }
): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    const themeData = {
      ...data,
      status: data.status || "draft",
      isSystemWide: false,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb
      .collection(CUSTOM_THEMES_COLLECTION)
      .add(themeData);

    return docRef.id;
  } catch (error) {
    console.error("Error creating custom theme:", error);
    throw new Error("Failed to create custom theme");
  }
}

/**
 * Lädt ein Custom Theme nach ID
 */
export async function getCustomThemeById(
  id: string,
  resolveKompetenzen = false
): Promise<CustomTheme | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb
      .collection(CUSTOM_THEMES_COLLECTION)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    let theme: CustomTheme = {
      id: doc.id,
      thema: data.thema,
      beschreibung: data.beschreibung,
      lehrmittel: data.lehrmittel,
      bildLehrmittel: data.bildLehrmittel,
      anzahlLektionen: data.anzahlLektionen,
      schuljahr: data.schuljahr,
      zeitraum: data.zeitraum,
      kompetenzenIds: data.kompetenzenIds || [],
      fileRouge: data.fileRouge,
      unterlagen: data.unterlagen,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      schuleId: data.schuleId,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
      status: data.status,
      reviewedBy: data.reviewedBy,
      reviewedByName: data.reviewedByName,
      reviewedAt: data.reviewedAt ? timestampToDate(data.reviewedAt) : undefined,
      reviewNotes: data.reviewNotes,
      airtableId: data.airtableId,
      isSystemWide: data.isSystemWide || false,
    };

    // Optional: Kompetenzen auflösen
    if (resolveKompetenzen && theme.kompetenzenIds.length > 0) {
      const kompetenzenMap = await getKompetenzenByIds(theme.kompetenzenIds);
      theme.kompetenzen = theme.kompetenzenIds
        .map((id) => kompetenzenMap.get(id))
        .filter((k) => k !== undefined);
    }

    return theme;
  } catch (error) {
    console.error("Error fetching custom theme:", error);
    return null;
  }
}

/**
 * Lädt alle Custom Themes mit optionalen Filtern
 */
export async function getCustomThemes(filters?: {
  createdBy?: string;
  schuleId?: string;
  status?: ThemeStatus | ThemeStatus[];
  isSystemWide?: boolean;
}): Promise<CustomTheme[]> {
  try {
    const adminDb = getAdminDb();
    let query: admin.firestore.Query | admin.firestore.CollectionReference =
      adminDb.collection(CUSTOM_THEMES_COLLECTION);

    // Filter anwenden
    if (filters?.createdBy) {
      query = query.where("createdBy", "==", filters.createdBy);
    }
    if (filters?.schuleId) {
      query = query.where("schuleId", "==", filters.schuleId);
    }
    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      query = query.where("status", "in", statuses);
    }
    if (filters?.isSystemWide !== undefined) {
      query = query.where("isSystemWide", "==", filters.isSystemWide);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        thema: data.thema,
        beschreibung: data.beschreibung,
        lehrmittel: data.lehrmittel,
        bildLehrmittel: data.bildLehrmittel,
        anzahlLektionen: data.anzahlLektionen,
        schuljahr: data.schuljahr,
        zeitraum: data.zeitraum,
        kompetenzenIds: data.kompetenzenIds || [],
        fileRouge: data.fileRouge,
        unterlagen: data.unterlagen,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        schuleId: data.schuleId,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        status: data.status,
        reviewedBy: data.reviewedBy,
        reviewedByName: data.reviewedByName,
        reviewedAt: data.reviewedAt
          ? timestampToDate(data.reviewedAt)
          : undefined,
        reviewNotes: data.reviewNotes,
        airtableId: data.airtableId,
        isSystemWide: data.isSystemWide || false,
      };
    });
  } catch (error) {
    console.error("Error fetching custom themes:", error);
    return [];
  }
}

/**
 * Aktualisiert ein Custom Theme
 */
export async function updateCustomTheme(
  id: string,
  updates: Partial<Omit<CustomTheme, "id" | "createdAt" | "createdBy">>
): Promise<void> {
  try {
    const adminDb = getAdminDb();

    await adminDb
      .collection(CUSTOM_THEMES_COLLECTION)
      .doc(id)
      .update({
        ...updates,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error("Error updating custom theme:", error);
    throw new Error("Failed to update custom theme");
  }
}

/**
 * Löscht ein Custom Theme
 */
export async function deleteCustomTheme(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection(CUSTOM_THEMES_COLLECTION).doc(id).delete();
  } catch (error) {
    console.error("Error deleting custom theme:", error);
    throw new Error("Failed to delete custom theme");
  }
}

/**
 * Ändert den Status eines Custom Themes (für Review-Workflow)
 */
export async function updateThemeStatus(
  id: string,
  status: ThemeStatus,
  reviewedBy: string,
  reviewedByName: string,
  reviewNotes?: string
): Promise<void> {
  try {
    const adminDb = getAdminDb();

    const updateData: any = {
      status,
      reviewedBy,
      reviewedByName,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };

    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes;
    }

    // Bei Freigabe: systemweit machen
    if (status === "approved") {
      updateData.isSystemWide = true;
    }

    await adminDb.collection(CUSTOM_THEMES_COLLECTION).doc(id).update(updateData);
  } catch (error) {
    console.error("Error updating theme status:", error);
    throw new Error("Failed to update theme status");
  }
}

/**
 * Lädt Custom Themes nach Stufe (für Jahresplan)
 */
export async function getCustomThemesByStufe(
  stufe: Stufe,
  options?: {
    includeOwnDrafts?: boolean;
    userId?: string;
  }
): Promise<CustomTheme[]> {
  try {
    const adminDb = getAdminDb();

    // Hole systemweite (approved) Themen
    const systemWideQuery = adminDb
      .collection(CUSTOM_THEMES_COLLECTION)
      .where("isSystemWide", "==", true)
      .where("schuljahr", "array-contains", stufe);

    const systemWideSnapshot = await systemWideQuery.get();
    let themes = systemWideSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        reviewedAt: data.reviewedAt
          ? timestampToDate(data.reviewedAt)
          : undefined,
      } as CustomTheme;
    });

    // Optional: Eigene Draft-Themen hinzufügen
    if (options?.includeOwnDrafts && options.userId) {
      const ownDraftsQuery = adminDb
        .collection(CUSTOM_THEMES_COLLECTION)
        .where("createdBy", "==", options.userId)
        .where("schuljahr", "array-contains", stufe)
        .where("isSystemWide", "==", false);

      const ownDraftsSnapshot = await ownDraftsQuery.get();
      const ownDrafts = ownDraftsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: timestampToDate(data.createdAt),
          updatedAt: timestampToDate(data.updatedAt),
          reviewedAt: data.reviewedAt
            ? timestampToDate(data.reviewedAt)
            : undefined,
        } as CustomTheme;
      });

      themes = [...themes, ...ownDrafts];
    }

    return themes;
  } catch (error) {
    console.error("Error fetching custom themes by Stufe:", error);
    return [];
  }
}
