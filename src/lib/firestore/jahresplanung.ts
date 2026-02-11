import { getAdminDb } from "@/lib/firebase/admin";
import {
  JahresplanEinheit,
  JahresplanStatus,
  BeurteilungsTyp,
  SchulferienCustom,
  JahresplanFilter,
} from "@/types";

const JAHRESPLANUNG_COLLECTION = "jahresplanung";
const SCHULFERIEN_COLLECTION = "schulferien_custom";

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

/**
 * Berechnet das Quartal aus einer Kalenderwoche
 * Q1: KW 33-39 (Sommer bis Herbst)
 * Q2: KW 42-51 (Herbst bis Weihnachten)
 * Q3: KW 2-14 (Winter bis Frühling)
 * Q4: KW 17-27 (Frühling bis Sommer)
 */
export function berechneQuartal(kalenderwoche: number): number {
  if (kalenderwoche >= 33 && kalenderwoche <= 41) return 1;
  if (kalenderwoche >= 42 && kalenderwoche <= 52) return 2;
  if (kalenderwoche >= 1 && kalenderwoche <= 14) return 3;
  if (kalenderwoche >= 15 && kalenderwoche <= 32) return 4;
  return 1; // Fallback
}

/**
 * Konvertiert Firestore-Dokument zu JahresplanEinheit
 */
function docToEinheit(
  doc: FirebaseFirestore.DocumentSnapshot
): JahresplanEinheit {
  const data = doc.data()!;
  return {
    id: doc.id,
    teacherId: data.teacherId,
    schuljahr: data.schuljahr,
    fachbereichId: data.fachbereichId,
    fachbereichName: data.fachbereichName,
    fachbereichFarbe: data.fachbereichFarbe,
    titel: data.titel,
    lernziele: data.lernziele || "",
    kompetenzenIds: data.kompetenzenIds || [],
    kompetenzenNamen: data.kompetenzenNamen,
    zeitraumStart: data.zeitraumStart,
    zeitraumEnde: data.zeitraumEnde,
    quartal: data.quartal,
    status: data.status as JahresplanStatus,
    notizen: data.notizen || "",
    beurteilungstyp: data.beurteilungstyp as BeurteilungsTyp,
    beurteilungsNotiz: data.beurteilungsNotiz || "",
    materialien: data.materialien || [],
    istPufferwoche: data.istPufferwoche || false,
    farbe: data.farbe || "#6b7280",
    sortOrder: data.sortOrder || 0,
    isShared: data.isShared || false,
    linkedMiaThemeId: data.linkedMiaThemeId || undefined,
    linkedMiaThemeName: data.linkedMiaThemeName || undefined,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

// ============================================
// Jahresplan-Einheiten CRUD
// ============================================

/**
 * Erstellt eine neue Jahresplan-Einheit
 */
export async function createJahresplanEinheit(data: {
  teacherId: string;
  schuljahr: string;
  fachbereichId: string;
  fachbereichName?: string;
  fachbereichFarbe?: string;
  titel: string;
  lernziele?: string;
  kompetenzenIds?: string[];
  kompetenzenNamen?: string[];
  zeitraumStart: number;
  zeitraumEnde: number;
  status?: JahresplanStatus;
  beurteilungstyp?: BeurteilungsTyp;
  beurteilungsNotiz?: string;
  materialien?: string[];
  istPufferwoche?: boolean;
  farbe?: string;
  linkedMiaThemeId?: string | null;
  linkedMiaThemeName?: string | null;
}): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    // Quartal automatisch berechnen
    const quartal = berechneQuartal(data.zeitraumStart);

    const einheitData = {
      teacherId: data.teacherId,
      schuljahr: data.schuljahr,
      fachbereichId: data.fachbereichId,
      fachbereichName: data.fachbereichName,
      fachbereichFarbe: data.fachbereichFarbe,
      titel: data.titel,
      lernziele: data.lernziele || "",
      kompetenzenIds: data.kompetenzenIds || [],
      kompetenzenNamen: data.kompetenzenNamen || [],
      zeitraumStart: data.zeitraumStart,
      zeitraumEnde: data.zeitraumEnde,
      quartal,
      status: data.status || "geplant",
      notizen: "",
      beurteilungstyp: data.beurteilungstyp || "keine",
      beurteilungsNotiz: data.beurteilungsNotiz || "",
      materialien: data.materialien || [],
      istPufferwoche: data.istPufferwoche || false,
      farbe: data.farbe || data.fachbereichFarbe || "#6b7280",
      sortOrder: 0,
      isShared: false,
      ...(data.linkedMiaThemeId ? { linkedMiaThemeId: data.linkedMiaThemeId } : {}),
      ...(data.linkedMiaThemeName ? { linkedMiaThemeName: data.linkedMiaThemeName } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb
      .collection(JAHRESPLANUNG_COLLECTION)
      .add(einheitData);

    return docRef.id;
  } catch (error) {
    console.error("Error creating jahresplan einheit:", error);
    throw new Error("Failed to create jahresplan einheit");
  }
}

/**
 * Lädt eine Einheit nach ID
 */
export async function getJahresplanEinheitById(
  id: string
): Promise<JahresplanEinheit | null> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection(JAHRESPLANUNG_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return docToEinheit(doc);
  } catch (error) {
    console.error("Error getting jahresplan einheit:", error);
    throw new Error("Failed to get jahresplan einheit");
  }
}

/**
 * Lädt alle Einheiten eines Lehrers
 */
export async function getJahresplanEinheiten(
  teacherId: string,
  filter?: JahresplanFilter
): Promise<JahresplanEinheit[]> {
  try {
    const adminDb = getAdminDb();
    let query: FirebaseFirestore.Query = adminDb
      .collection(JAHRESPLANUNG_COLLECTION)
      .where("teacherId", "==", teacherId);

    if (filter?.schuljahr) {
      query = query.where("schuljahr", "==", filter.schuljahr);
    }

    if (filter?.quartal) {
      query = query.where("quartal", "==", filter.quartal);
    }

    if (filter?.fachbereichId) {
      query = query.where("fachbereichId", "==", filter.fachbereichId);
    }

    if (filter?.status) {
      query = query.where("status", "==", filter.status);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => docToEinheit(doc));
  } catch (error) {
    console.error("Error getting jahresplan einheiten:", error);
    throw new Error("Failed to get jahresplan einheiten");
  }
}

/**
 * Lädt Einheiten für eine bestimmte Kalenderwoche
 */
export async function getEinheitenFuerWoche(
  teacherId: string,
  schuljahr: string,
  kalenderwoche: number
): Promise<JahresplanEinheit[]> {
  try {
    const adminDb = getAdminDb();

    // Alle Einheiten des Schuljahrs laden und filtern
    // (Firestore unterstützt keine Range-Queries über mehrere Felder)
    const snapshot = await adminDb
      .collection(JAHRESPLANUNG_COLLECTION)
      .where("teacherId", "==", teacherId)
      .where("schuljahr", "==", schuljahr)
      .get();

    return snapshot.docs
      .map((doc) => docToEinheit(doc))
      .filter(
        (einheit) =>
          einheit.zeitraumStart <= kalenderwoche &&
          einheit.zeitraumEnde >= kalenderwoche
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    console.error("Error getting einheiten for week:", error);
    throw new Error("Failed to get einheiten for week");
  }
}

/**
 * Lädt geteilte Einheiten von Kolleg:innen derselben Schule
 */
export async function getSharedEinheiten(
  schuleId: string,
  schuljahr: string,
  excludeTeacherId?: string
): Promise<JahresplanEinheit[]> {
  try {
    const adminDb = getAdminDb();

    // Hinweis: Dies erfordert einen zusammengesetzten Index
    const snapshot = await adminDb
      .collection(JAHRESPLANUNG_COLLECTION)
      .where("isShared", "==", true)
      .where("schuljahr", "==", schuljahr)
      .get();

    let einheiten = snapshot.docs.map((doc) => docToEinheit(doc));

    if (excludeTeacherId) {
      einheiten = einheiten.filter((e) => e.teacherId !== excludeTeacherId);
    }

    return einheiten;
  } catch (error) {
    console.error("Error getting shared einheiten:", error);
    throw new Error("Failed to get shared einheiten");
  }
}

/**
 * Aktualisiert eine Einheit
 */
export async function updateJahresplanEinheit(
  id: string,
  data: Partial<JahresplanEinheit>
): Promise<void> {
  try {
    const adminDb = getAdminDb();

    // Wenn zeitraumStart geändert wird, Quartal neu berechnen
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.zeitraumStart !== undefined) {
      updateData.quartal = berechneQuartal(data.zeitraumStart);
    }

    // id sollte nicht gespeichert werden
    delete updateData.id;

    await adminDb.collection(JAHRESPLANUNG_COLLECTION).doc(id).update(updateData);
  } catch (error) {
    console.error("Error updating jahresplan einheit:", error);
    throw new Error("Failed to update jahresplan einheit");
  }
}

/**
 * Löscht eine Einheit
 */
export async function deleteJahresplanEinheit(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection(JAHRESPLANUNG_COLLECTION).doc(id).delete();
  } catch (error) {
    console.error("Error deleting jahresplan einheit:", error);
    throw new Error("Failed to delete jahresplan einheit");
  }
}

/**
 * Aktualisiert den Status einer Einheit
 */
export async function updateEinheitStatus(
  id: string,
  status: JahresplanStatus,
  notizen?: string
): Promise<void> {
  try {
    const adminDb = getAdminDb();
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (notizen !== undefined) {
      updateData.notizen = notizen;
    }

    await adminDb.collection(JAHRESPLANUNG_COLLECTION).doc(id).update(updateData);
  } catch (error) {
    console.error("Error updating einheit status:", error);
    throw new Error("Failed to update einheit status");
  }
}

/**
 * Kopiert alle Einheiten eines Schuljahrs in ein neues Schuljahr
 */
export async function kopiereJahresplan(
  teacherId: string,
  vonSchuljahr: string,
  nachSchuljahr: string
): Promise<number> {
  try {
    const adminDb = getAdminDb();

    // Alle Einheiten des Quell-Schuljahrs laden
    const einheiten = await getJahresplanEinheiten(teacherId, {
      schuljahr: vonSchuljahr,
    });

    if (einheiten.length === 0) {
      return 0;
    }

    const batch = adminDb.batch();
    const now = new Date();

    for (const einheit of einheiten) {
      const newDocRef = adminDb.collection(JAHRESPLANUNG_COLLECTION).doc();

      batch.set(newDocRef, {
        teacherId: einheit.teacherId,
        schuljahr: nachSchuljahr,
        fachbereichId: einheit.fachbereichId,
        fachbereichName: einheit.fachbereichName,
        fachbereichFarbe: einheit.fachbereichFarbe,
        titel: einheit.titel,
        lernziele: einheit.lernziele,
        kompetenzenIds: einheit.kompetenzenIds,
        kompetenzenNamen: einheit.kompetenzenNamen,
        zeitraumStart: einheit.zeitraumStart,
        zeitraumEnde: einheit.zeitraumEnde,
        quartal: einheit.quartal,
        status: "geplant", // Reset to planned
        notizen: "", // Reset notes
        beurteilungstyp: einheit.beurteilungstyp,
        beurteilungsNotiz: "",
        materialien: einheit.materialien,
        istPufferwoche: einheit.istPufferwoche,
        farbe: einheit.farbe,
        sortOrder: einheit.sortOrder,
        isShared: false, // Reset sharing
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
    return einheiten.length;
  } catch (error) {
    console.error("Error copying jahresplan:", error);
    throw new Error("Failed to copy jahresplan");
  }
}

// ============================================
// Schulferien Custom CRUD
// ============================================

/**
 * Erstellt benutzerdefinierte Ferien
 */
export async function createSchulferienCustom(data: {
  teacherId: string;
  schuleId?: string;
  schuljahr: string;
  ferienName: string;
  start: string;
  ende: string;
}): Promise<string> {
  try {
    const adminDb = getAdminDb();
    const now = new Date();

    const ferienData = {
      ...data,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb
      .collection(SCHULFERIEN_COLLECTION)
      .add(ferienData);

    return docRef.id;
  } catch (error) {
    console.error("Error creating schulferien custom:", error);
    throw new Error("Failed to create schulferien custom");
  }
}

/**
 * Lädt benutzerdefinierte Ferien eines Lehrers
 */
export async function getSchulferienCustom(
  teacherId: string,
  schuljahr?: string
): Promise<SchulferienCustom[]> {
  try {
    const adminDb = getAdminDb();
    let query: FirebaseFirestore.Query = adminDb
      .collection(SCHULFERIEN_COLLECTION)
      .where("teacherId", "==", teacherId);

    if (schuljahr) {
      query = query.where("schuljahr", "==", schuljahr);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        teacherId: data.teacherId,
        schuleId: data.schuleId,
        schuljahr: data.schuljahr,
        ferienName: data.ferienName,
        start: data.start,
        ende: data.ende,
        isCustom: data.isCustom,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      };
    });
  } catch (error) {
    console.error("Error getting schulferien custom:", error);
    throw new Error("Failed to get schulferien custom");
  }
}

/**
 * Aktualisiert benutzerdefinierte Ferien
 */
export async function updateSchulferienCustom(
  id: string,
  data: Partial<SchulferienCustom>
): Promise<void> {
  try {
    const adminDb = getAdminDb();

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    delete updateData.id;

    await adminDb.collection(SCHULFERIEN_COLLECTION).doc(id).update(updateData);
  } catch (error) {
    console.error("Error updating schulferien custom:", error);
    throw new Error("Failed to update schulferien custom");
  }
}

/**
 * Löscht benutzerdefinierte Ferien
 */
export async function deleteSchulferienCustom(id: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection(SCHULFERIEN_COLLECTION).doc(id).delete();
  } catch (error) {
    console.error("Error deleting schulferien custom:", error);
    throw new Error("Failed to delete schulferien custom");
  }
}

// ============================================
// Statistik-Funktionen
// ============================================

/**
 * Zählt Beurteilungen pro Woche
 */
export async function getBeurteilungenProWoche(
  teacherId: string,
  schuljahr: string
): Promise<Map<number, { formativ: number; summativ: number }>> {
  try {
    const einheiten = await getJahresplanEinheiten(teacherId, { schuljahr });

    const beurteilungen = new Map<number, { formativ: number; summativ: number }>();

    for (const einheit of einheiten) {
      if (einheit.beurteilungstyp === "keine") continue;

      for (let kw = einheit.zeitraumStart; kw <= einheit.zeitraumEnde; kw++) {
        const current = beurteilungen.get(kw) || { formativ: 0, summativ: 0 };

        if (einheit.beurteilungstyp === "formativ") {
          current.formativ++;
        } else if (einheit.beurteilungstyp === "summativ") {
          current.summativ++;
        }

        beurteilungen.set(kw, current);
      }
    }

    return beurteilungen;
  } catch (error) {
    console.error("Error getting beurteilungen pro woche:", error);
    throw new Error("Failed to get beurteilungen pro woche");
  }
}

/**
 * Berechnet die Fachbereichs-Verteilung
 */
export async function getFachbereichVerteilung(
  teacherId: string,
  schuljahr: string
): Promise<Array<{ fachbereichId: string; fachbereichName: string; farbe: string; count: number; prozent: number }>> {
  try {
    const einheiten = await getJahresplanEinheiten(teacherId, { schuljahr });

    const verteilung = new Map<string, { name: string; farbe: string; count: number }>();

    for (const einheit of einheiten) {
      const current = verteilung.get(einheit.fachbereichId) || {
        name: einheit.fachbereichName || einheit.fachbereichId,
        farbe: einheit.fachbereichFarbe || "#6b7280",
        count: 0,
      };
      current.count++;
      verteilung.set(einheit.fachbereichId, current);
    }

    const total = einheiten.length;

    return Array.from(verteilung.entries()).map(([id, data]) => ({
      fachbereichId: id,
      fachbereichName: data.name,
      farbe: data.farbe,
      count: data.count,
      prozent: total > 0 ? Math.round((data.count / total) * 100) : 0,
    }));
  } catch (error) {
    console.error("Error getting fachbereich verteilung:", error);
    throw new Error("Failed to get fachbereich verteilung");
  }
}
