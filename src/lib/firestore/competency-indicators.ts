/**
 * Firestore CRUD-Funktionen für Kompetenz-Indikatoren
 *
 * Indikatoren sind kindgerechte Beschreibungen für jede Stern-Stufe,
 * die den Schülern helfen, ihre Fähigkeiten einzuschätzen.
 */

import { getAdminDb } from "@/lib/firebase/admin";
import { CompetencyIndicator } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION = "competency_indicators";

/**
 * Konvertiert Firestore Timestamp zu Date
 */
function timestampToDate(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  return new Date();
}

/**
 * Erstellt einen neuen Indikator für eine Kompetenz
 */
export async function createCompetencyIndicator(data: {
  competencyId: string;
  competencyName: string;
  indicators: {
    star1: string;
    star2: string;
    star3: string;
    star4: string;
    star5: string;
  };
  schoolId?: string;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const adminDb = getAdminDb();

  // Prüfen ob bereits ein Indikator für diese Kompetenz existiert (für diese Schule oder systemweit)
  const existingQuery = adminDb
    .collection(COLLECTION)
    .where("competencyId", "==", data.competencyId);

  const existing = await existingQuery.get();

  // Filter for matching schoolId or systemWide indicators
  const matchingIndicator = existing.docs.find((doc) => {
    const docData = doc.data();
    if (data.schoolId) {
      // Wenn schulspezifisch, nur schulspezifische prüfen
      return docData.schoolId === data.schoolId;
    } else {
      // Wenn systemweit, nur systemweite prüfen
      return docData.isSystemWide === true;
    }
  });

  if (matchingIndicator) {
    throw new Error("Es existiert bereits ein Indikator für diese Kompetenz");
  }

  const now = new Date();
  const indicatorData: Omit<CompetencyIndicator, "id"> = {
    competencyId: data.competencyId,
    competencyName: data.competencyName,
    indicators: data.indicators,
    isSystemWide: !data.schoolId,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    createdAt: now,
    updatedAt: now,
  };

  // Only add schoolId if provided
  if (data.schoolId) {
    indicatorData.schoolId = data.schoolId;
  }

  const docRef = await adminDb.collection(COLLECTION).add(indicatorData);
  return docRef.id;
}

/**
 * Holt einen Indikator nach ID
 */
export async function getCompetencyIndicator(
  id: string
): Promise<CompetencyIndicator | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection(COLLECTION).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    competencyId: data.competencyId,
    competencyName: data.competencyName,
    indicators: data.indicators,
    isSystemWide: data.isSystemWide,
    schoolId: data.schoolId,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    approvedBy: data.approvedBy,
    approvedByName: data.approvedByName,
    approvedAt: data.approvedAt ? timestampToDate(data.approvedAt) : undefined,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

/**
 * Holt den Indikator für eine bestimmte Kompetenz
 * Priorisiert: 1. Schulspezifischer, 2. Systemweiter
 */
export async function getIndicatorForCompetency(
  competencyId: string,
  schoolId?: string
): Promise<CompetencyIndicator | null> {
  const adminDb = getAdminDb();

  // Erst schulspezifischen Indikator suchen
  if (schoolId) {
    const schoolSpecific = await adminDb
      .collection(COLLECTION)
      .where("competencyId", "==", competencyId)
      .where("schoolId", "==", schoolId)
      .limit(1)
      .get();

    if (!schoolSpecific.empty) {
      const doc = schoolSpecific.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        competencyId: data.competencyId,
        competencyName: data.competencyName,
        indicators: data.indicators,
        isSystemWide: data.isSystemWide,
        schoolId: data.schoolId,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        approvedBy: data.approvedBy,
        approvedByName: data.approvedByName,
        approvedAt: data.approvedAt ? timestampToDate(data.approvedAt) : undefined,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      };
    }
  }

  // Dann systemweiten Indikator suchen
  const systemWide = await adminDb
    .collection(COLLECTION)
    .where("competencyId", "==", competencyId)
    .where("isSystemWide", "==", true)
    .limit(1)
    .get();

  if (!systemWide.empty) {
    const doc = systemWide.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      competencyId: data.competencyId,
      competencyName: data.competencyName,
      indicators: data.indicators,
      isSystemWide: data.isSystemWide,
      schoolId: data.schoolId,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      approvedBy: data.approvedBy,
      approvedByName: data.approvedByName,
      approvedAt: data.approvedAt ? timestampToDate(data.approvedAt) : undefined,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  }

  return null;
}

/**
 * Holt alle Indikatoren für einen Lehrer (eigene + systemweite)
 */
export async function getIndicatorsForTeacher(
  schoolId: string
): Promise<CompetencyIndicator[]> {
  const adminDb = getAdminDb();

  // Systemweite Indikatoren
  const systemWideSnapshot = await adminDb
    .collection(COLLECTION)
    .where("isSystemWide", "==", true)
    .get();

  // Schulspezifische Indikatoren
  const schoolSnapshot = await adminDb
    .collection(COLLECTION)
    .where("schoolId", "==", schoolId)
    .get();

  const indicators: CompetencyIndicator[] = [];

  const processDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
    const data = doc.data()!;
    return {
      id: doc.id,
      competencyId: data.competencyId,
      competencyName: data.competencyName,
      indicators: data.indicators,
      isSystemWide: data.isSystemWide,
      schoolId: data.schoolId,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      approvedBy: data.approvedBy,
      approvedByName: data.approvedByName,
      approvedAt: data.approvedAt ? timestampToDate(data.approvedAt) : undefined,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  };

  systemWideSnapshot.docs.forEach((doc) => {
    indicators.push(processDoc(doc));
  });

  schoolSnapshot.docs.forEach((doc) => {
    indicators.push(processDoc(doc));
  });

  return indicators;
}

/**
 * Holt alle Indikatoren die von einem bestimmten Lehrer erstellt wurden
 */
export async function getIndicatorsByCreator(
  createdBy: string
): Promise<CompetencyIndicator[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("createdBy", "==", createdBy)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      competencyId: data.competencyId,
      competencyName: data.competencyName,
      indicators: data.indicators,
      isSystemWide: data.isSystemWide,
      schoolId: data.schoolId,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      approvedBy: data.approvedBy,
      approvedByName: data.approvedByName,
      approvedAt: data.approvedAt ? timestampToDate(data.approvedAt) : undefined,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  });
}

/**
 * Aktualisiert einen Indikator
 */
export async function updateCompetencyIndicator(
  id: string,
  data: {
    indicators?: {
      star1: string;
      star2: string;
      star3: string;
      star4: string;
      star5: string;
    };
    competencyName?: string;
  }
): Promise<void> {
  const adminDb = getAdminDb();
  const docRef = adminDb.collection(COLLECTION).doc(id);

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.indicators) {
    updateData.indicators = data.indicators;
  }
  if (data.competencyName) {
    updateData.competencyName = data.competencyName;
  }

  await docRef.update(updateData);
}

/**
 * Löscht einen Indikator
 */
export async function deleteCompetencyIndicator(id: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION).doc(id).delete();
}

/**
 * Macht einen Indikator systemweit verfügbar (nur PICTS-Admin)
 */
export async function approveIndicatorSystemWide(
  id: string,
  approvedBy: string,
  approvedByName: string
): Promise<void> {
  const adminDb = getAdminDb();
  const docRef = adminDb.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Indikator nicht gefunden");
  }

  const data = doc.data()!;
  if (data.isSystemWide) {
    throw new Error("Indikator ist bereits systemweit");
  }

  await docRef.update({
    isSystemWide: true,
    schoolId: null, // Entferne Schulbindung
    approvedBy,
    approvedByName,
    approvedAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Holt alle Indikatoren die zur Freigabe ausstehen (nur schulspezifische)
 */
export async function getPendingIndicatorsForApproval(): Promise<CompetencyIndicator[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("isSystemWide", "==", false)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      competencyId: data.competencyId,
      competencyName: data.competencyName,
      indicators: data.indicators,
      isSystemWide: data.isSystemWide,
      schoolId: data.schoolId,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      approvedBy: data.approvedBy,
      approvedByName: data.approvedByName,
      approvedAt: data.approvedAt ? timestampToDate(data.approvedAt) : undefined,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  });
}

/**
 * Holt Indikatoren für mehrere Kompetenzen auf einmal (Batch)
 */
export async function getIndicatorsForCompetencies(
  competencyIds: string[],
  schoolId?: string
): Promise<Map<string, CompetencyIndicator>> {
  if (competencyIds.length === 0) {
    return new Map();
  }

  const adminDb = getAdminDb();
  const result = new Map<string, CompetencyIndicator>();

  // Hole alle passenden Indikatoren
  // Firestore erlaubt max 30 IDs in "in" Query
  const chunks: string[][] = [];
  for (let i = 0; i < competencyIds.length; i += 30) {
    chunks.push(competencyIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("competencyId", "in", chunk)
      .get();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const indicator: CompetencyIndicator = {
        id: doc.id,
        competencyId: data.competencyId,
        competencyName: data.competencyName,
        indicators: data.indicators,
        isSystemWide: data.isSystemWide,
        schoolId: data.schoolId,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        approvedBy: data.approvedBy,
        approvedByName: data.approvedByName,
        approvedAt: data.approvedAt ? timestampToDate(data.approvedAt) : undefined,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      };

      // Priorisiere schulspezifische über systemweite
      const existing = result.get(data.competencyId);
      if (!existing) {
        result.set(data.competencyId, indicator);
      } else if (schoolId && data.schoolId === schoolId) {
        // Schulspezifischer hat Vorrang
        result.set(data.competencyId, indicator);
      } else if (!existing.schoolId && data.isSystemWide) {
        // Nur ersetzen wenn aktueller nicht schulspezifisch ist
        result.set(data.competencyId, indicator);
      }
    });
  }

  return result;
}
