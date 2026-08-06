import { getAdminDb } from "@/lib/firebase/admin";
import {
  JahresplanEinheit,
  JahresplanStatus,
  BeurteilungsTyp,
  Beurteilung,
  SchulferienCustom,
  JahresplanFilter,
  PlanungsTeam,
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
 * Lehrpersonen planen "von Ferien zu Ferien":
 * Q1: KW 33-41 (Sommer bis Herbst)
 * Q2: KW 42-52 + KW 1-sportEndeKW (Herbst bis Sport, inkl. Weihnachten→Sport)
 * Q3: KW sportEndeKW+1 bis 14 (Sport bis Frühling)
 * Q4: KW 15-27 (Frühling bis Sommer)
 *
 * @param sportferienEndeKW - KW in der Sportferien enden (Default: 7)
 */
export function berechneQuartal(kalenderwoche: number, sportferienEndeKW: number = 7): number {
  if (kalenderwoche >= 33 && kalenderwoche <= 41) return 1;
  if (kalenderwoche >= 42 && kalenderwoche <= 52) return 2;
  if (kalenderwoche >= 1 && kalenderwoche <= sportferienEndeKW) return 2;
  if (kalenderwoche >= sportferienEndeKW + 1 && kalenderwoche <= 14) return 3;
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

  // Migration: alte Einzelbeurteilung → Array
  let beurteilungen: Beurteilung[] = [];
  if (Array.isArray(data.beurteilungen) && data.beurteilungen.length > 0) {
    beurteilungen = data.beurteilungen;
  } else if (data.beurteilungstyp && data.beurteilungstyp !== "keine") {
    // Legacy: einzelne Beurteilung in Array konvertieren
    beurteilungen = [{
      typ: data.beurteilungstyp as "formativ" | "summativ",
      kalenderwoche: data.zeitraumEnde, // Default: letzte Woche
      notiz: data.beurteilungsNotiz || "",
    }];
  }

  // Legacy-Felder ableiten aus Array
  const beurteilungstyp: BeurteilungsTyp = beurteilungen.length > 0
    ? beurteilungen[0].typ
    : "keine";
  const beurteilungsNotiz = beurteilungen.length > 0
    ? beurteilungen[0].notiz
    : "";

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
    beurteilungstyp,
    beurteilungsNotiz,
    beurteilungen,
    materialien: data.materialien || [],
    istPufferwoche: data.istPufferwoche || false,
    istSpezialwoche: data.istSpezialwoche || false,
    farbe: data.farbe || "#6b7280",
    sortOrder: data.sortOrder || 0,
    isShared: data.isShared || false,
    sharedWith: data.sharedWith || undefined,
    schuleId: data.schuleId || undefined,
    teamId: data.teamId || undefined,
    linkedMiaThemeId: data.linkedMiaThemeId || undefined,
    linkedMiaThemeName: data.linkedMiaThemeName || undefined,
    publishedThemeId: data.publishedThemeId || undefined,
    publishedThemeName: data.publishedThemeName || undefined,
    publishedThemeStatus: data.publishedThemeStatus || undefined,
    linkedFileIds: data.linkedFileIds || undefined,
    linkedFileNames: data.linkedFileNames || undefined,
    lehrmittel: data.lehrmittel || undefined,
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
  beurteilungen?: Beurteilung[];
  materialien?: string[];
  istPufferwoche?: boolean;
  istSpezialwoche?: boolean;
  farbe?: string;
  schuleId?: string;
  teamId?: string;
  linkedMiaThemeId?: string | null;
  linkedMiaThemeName?: string | null;
  linkedFileIds?: string[];
  linkedFileNames?: string[];
  lehrmittel?: string;
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
      beurteilungen: data.beurteilungen || [],
      materialien: data.materialien || [],
      istPufferwoche: data.istPufferwoche || false,
      istSpezialwoche: data.istSpezialwoche || false,
      farbe: data.farbe || data.fachbereichFarbe || "#6b7280",
      sortOrder: 0,
      isShared: false,
      sharedWith: [],
      ...(data.schuleId ? { schuleId: data.schuleId } : {}),
      ...(data.teamId ? { teamId: data.teamId } : {}),
      ...(data.linkedMiaThemeId ? { linkedMiaThemeId: data.linkedMiaThemeId } : {}),
      ...(data.linkedMiaThemeName ? { linkedMiaThemeName: data.linkedMiaThemeName } : {}),
      ...(data.linkedFileIds && data.linkedFileIds.length > 0 ? { linkedFileIds: data.linkedFileIds } : {}),
      ...(data.linkedFileNames && data.linkedFileNames.length > 0 ? { linkedFileNames: data.linkedFileNames } : {}),
      ...(data.lehrmittel ? { lehrmittel: data.lehrmittel } : {}),
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
 * Lädt alle Einheiten eines Planungsteams
 */
export async function getTeamEinheiten(
  teamId: string,
  filter?: JahresplanFilter
): Promise<JahresplanEinheit[]> {
  try {
    const adminDb = getAdminDb();
    let query: FirebaseFirestore.Query = adminDb
      .collection(JAHRESPLANUNG_COLLECTION)
      .where("teamId", "==", teamId);

    if (filter?.schuljahr) {
      query = query.where("schuljahr", "==", filter.schuljahr);
    }
    if (filter?.quartal) {
      query = query.where("quartal", "==", filter.quartal);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => docToEinheit(doc));
  } catch (error) {
    console.error("Error getting team einheiten:", error);
    throw new Error("Failed to get team einheiten");
  }
}

/**
 * Lädt alle Planungen eines Unterrichtsteams: die Einheiten sämtlicher
 * Team-Mitglieder plus explizit dem Team zugeordnete Einheiten (teamId),
 * z.B. von ehemaligen Mitgliedern. Dedupliziert nach Einheit-ID.
 */
export async function getTeamPlanungen(
  team: PlanungsTeam,
  filter?: JahresplanFilter
): Promise<JahresplanEinheit[]> {
  try {
    const results = await Promise.all([
      getTeamEinheiten(team.id, filter),
      ...team.members.map((m) => getJahresplanEinheiten(m.userId, filter)),
    ]);

    const seen = new Set<string>();
    const einheiten: JahresplanEinheit[] = [];
    for (const list of results) {
      for (const einheit of list) {
        if (!seen.has(einheit.id)) {
          seen.add(einheit.id);
          einheiten.push(einheit);
        }
      }
    }
    return einheiten;
  } catch (error) {
    console.error("Error getting team planungen:", error);
    throw new Error("Failed to get team planungen");
  }
}

/**
 * Lädt geteilte Einheiten von Kolleg:innen derselben Schule
 * Enthält: isShared=true (Lesen) + sharedWith-Array (Schreibzugriff)
 */
export async function getSharedEinheiten(
  schuleId: string,
  schuljahr: string,
  excludeTeacherId?: string
): Promise<JahresplanEinheit[]> {
  try {
    const adminDb = getAdminDb();

    // 1. isShared=true Einheiten (ganze Schule, nur Lesen)
    const sharedSnapshot = await adminDb
      .collection(JAHRESPLANUNG_COLLECTION)
      .where("isShared", "==", true)
      .where("schuljahr", "==", schuljahr)
      .get();

    let einheiten = sharedSnapshot.docs.map((doc) => docToEinheit(doc));

    // 2. Einheiten wo der User in sharedWith steht (Schreibzugriff)
    if (excludeTeacherId) {
      const sharedWithSnapshot = await adminDb
        .collection(JAHRESPLANUNG_COLLECTION)
        .where("sharedWith", "array-contains", excludeTeacherId)
        .where("schuljahr", "==", schuljahr)
        .get();

      const sharedWithEinheiten = sharedWithSnapshot.docs.map((doc) =>
        docToEinheit(doc)
      );

      // Zusammenführen und Duplikate entfernen
      const existingIds = new Set(einheiten.map((e) => e.id));
      for (const e of sharedWithEinheiten) {
        if (!existingIds.has(e.id)) {
          einheiten.push(e);
          existingIds.add(e.id);
        }
      }
    }

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
 * Aktualisiert die Sharing-Einstellungen einer Einheit
 */
export async function updateEinheitSharing(
  id: string,
  sharedWith: string[],
  isShared: boolean
): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection(JAHRESPLANUNG_COLLECTION).doc(id).update({
      sharedWith,
      isShared,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating einheit sharing:", error);
    throw new Error("Failed to update einheit sharing");
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
        beurteilungen: einheit.beurteilungen.map(b => ({ ...b, notiz: "" })),
        materialien: einheit.materialien,
        istPufferwoche: einheit.istPufferwoche,
        istSpezialwoche: einheit.istSpezialwoche || false,
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

    const beurteilungenMap = new Map<number, { formativ: number; summativ: number }>();

    for (const einheit of einheiten) {
      // Neue beurteilungen-Array nutzen
      if (einheit.beurteilungen && einheit.beurteilungen.length > 0) {
        for (const b of einheit.beurteilungen) {
          // Beurteilung kann sich über mehrere Wochen erstrecken
          const bEnde = b.kalenderwocheEnde ?? b.kalenderwoche;
          for (let bkw = b.kalenderwoche; bkw <= bEnde; bkw++) {
            const current = beurteilungenMap.get(bkw) || { formativ: 0, summativ: 0 };
            if (b.typ === "formativ") {
              current.formativ++;
            } else if (b.typ === "summativ") {
              current.summativ++;
            }
            beurteilungenMap.set(bkw, current);
          }
        }
      } else if (einheit.beurteilungstyp !== "keine") {
        // Legacy-Fallback: alle Wochen der Einheit markieren
        for (let kw = einheit.zeitraumStart; kw <= einheit.zeitraumEnde; kw++) {
          const current = beurteilungenMap.get(kw) || { formativ: 0, summativ: 0 };
          if (einheit.beurteilungstyp === "formativ") {
            current.formativ++;
          } else if (einheit.beurteilungstyp === "summativ") {
            current.summativ++;
          }
          beurteilungenMap.set(kw, current);
        }
      }
    }

    return beurteilungenMap;
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
