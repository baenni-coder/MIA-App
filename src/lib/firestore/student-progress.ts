import { getAdminDb } from "@/lib/firebase/admin";
import {
  StudentProgress,
  ProgressHistoryEntry,
  ClassThemeProgress,
  StudentBadge,
  Badge,
  BadgeRarity,
} from "@/types";
import { notifyStudentBadgeEarned } from "./notifications";

const PROGRESS_COLLECTION = "student_progress";
const HISTORY_COLLECTION = "progress_history";
const CLASS_THEMES_COLLECTION = "class_theme_progress";
const STUDENT_BADGES_COLLECTION = "student_badges";
const BADGES_COLLECTION = "badges";

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
  return new Date(timestamp as string | number);
};

// ============================================
// Student Progress Functions
// ============================================

/**
 * Holt oder erstellt den Fortschritt eines Schülers
 */
export async function getOrCreateStudentProgress(
  studentId: string,
  classId: string
): Promise<StudentProgress> {
  const adminDb = getAdminDb();
  const docRef = adminDb.collection(PROGRESS_COLLECTION).doc(studentId);
  const doc = await docRef.get();

  if (doc.exists) {
    const data = doc.data()!;
    return {
      id: doc.id,
      studentId: data.studentId,
      classId: data.classId,
      ratings: data.ratings || {},
      comments: data.comments || {},
      pendingReviews: data.pendingReviews || {},
      lastUpdated: timestampToDate(data.lastUpdated),
    };
  }

  // Neuen Progress erstellen
  const newProgress: Omit<StudentProgress, "id"> = {
    studentId,
    classId,
    ratings: {},
    comments: {},
    pendingReviews: {},
    lastUpdated: new Date(),
  };

  await docRef.set(newProgress);

  return {
    id: studentId,
    ...newProgress,
  };
}

/**
 * Holt den Fortschritt eines Schülers
 */
export async function getStudentProgress(
  studentId: string
): Promise<StudentProgress | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection(PROGRESS_COLLECTION).doc(studentId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    studentId: data.studentId,
    classId: data.classId,
    ratings: data.ratings || {},
    comments: data.comments || {},
    pendingReviews: data.pendingReviews || {},
    lastUpdated: timestampToDate(data.lastUpdated),
  };
}

/**
 * Aktualisiert die Bewertung einer Kompetenz
 */
export async function updateCompetencyRating(
  studentId: string,
  classId: string,
  competencyId: string,
  rating: number,
  changedBy: "student" | string,
  changedByName?: string
): Promise<void> {
  const adminDb = getAdminDb();
  const progressRef = adminDb.collection(PROGRESS_COLLECTION).doc(studentId);

  // Hole aktuellen Progress
  const progress = await getOrCreateStudentProgress(studentId, classId);
  const oldRating = progress.ratings[competencyId] || 0;

  // Update Ratings
  const newRatings = {
    ...progress.ratings,
    [competencyId]: rating,
  };

  await progressRef.update({
    ratings: newRatings,
    lastUpdated: new Date(),
  });

  // Verlaufseintrag erstellen (nur wenn sich die Bewertung geändert hat)
  if (oldRating !== rating) {
    await createProgressHistoryEntry({
      studentId,
      competencyId,
      oldRating,
      newRating: rating,
      changedBy,
      changedByName,
    });
  }
}

/**
 * Aktualisiert einen Lehrer-Kommentar
 */
export async function updateCompetencyComment(
  studentId: string,
  classId: string,
  competencyId: string,
  comment: string
): Promise<void> {
  const adminDb = getAdminDb();
  const progressRef = adminDb.collection(PROGRESS_COLLECTION).doc(studentId);

  // Hole aktuellen Progress
  const progress = await getOrCreateStudentProgress(studentId, classId);

  // Update Comments
  const newComments = {
    ...progress.comments,
    [competencyId]: comment,
  };

  await progressRef.update({
    comments: newComments,
    lastUpdated: new Date(),
  });
}

// ============================================
// Progress History Functions
// ============================================

/**
 * Erstellt einen Verlaufseintrag
 */
async function createProgressHistoryEntry(data: {
  studentId: string;
  competencyId: string;
  competencyName?: string;
  oldRating: number;
  newRating: number;
  changedBy: "student" | string;
  changedByName?: string;
}): Promise<string> {
  const adminDb = getAdminDb();

  // Build entry without undefined values - Firestore doesn't accept undefined
  const entry: Omit<ProgressHistoryEntry, "id"> = {
    studentId: data.studentId,
    competencyId: data.competencyId,
    oldRating: data.oldRating,
    newRating: data.newRating,
    changedBy: data.changedBy,
    timestamp: new Date(),
  };

  // Only add optional fields if they have values
  if (data.competencyName) {
    entry.competencyName = data.competencyName;
  }
  if (data.changedByName) {
    entry.changedByName = data.changedByName;
  }

  const docRef = await adminDb.collection(HISTORY_COLLECTION).add(entry);
  return docRef.id;
}

/**
 * Holt den Bewertungsverlauf eines Schülers
 */
export async function getProgressHistory(
  studentId: string,
  limit: number = 50
): Promise<ProgressHistoryEntry[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(HISTORY_COLLECTION)
    .where("studentId", "==", studentId)
    .limit(limit)
    .get();

  const entries = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      studentId: data.studentId,
      competencyId: data.competencyId,
      competencyName: data.competencyName,
      oldRating: data.oldRating,
      newRating: data.newRating,
      changedBy: data.changedBy,
      changedByName: data.changedByName,
      timestamp: timestampToDate(data.timestamp),
    } as ProgressHistoryEntry;
  });

  // Sort by timestamp descending (newest first) in memory
  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ============================================
// Class Theme Progress Functions
// ============================================

/**
 * Markiert ein Thema als von einer Klasse bearbeitet
 */
export async function markThemeAsCompleted(data: {
  classId: string;
  className: string;
  themeId: string;
  themeName: string;
  themeDescription?: string;
  competencyIds: string[];
  competencyNames?: string[];
  zeitraum?: string;
  markedCompletedBy: string;
  markedCompletedByName: string;
}): Promise<string> {
  const adminDb = getAdminDb();

  // Prüfen ob bereits markiert
  const existing = await adminDb
    .collection(CLASS_THEMES_COLLECTION)
    .where("classId", "==", data.classId)
    .where("themeId", "==", data.themeId)
    .get();

  if (!existing.empty) {
    throw new Error("Thema wurde bereits als bearbeitet markiert");
  }

  // Filter out undefined values - Firestore doesn't accept undefined
  const themeProgress: Omit<ClassThemeProgress, "id"> = {
    classId: data.classId,
    className: data.className,
    themeId: data.themeId,
    themeName: data.themeName,
    competencyIds: data.competencyIds,
    markedCompletedBy: data.markedCompletedBy,
    markedCompletedByName: data.markedCompletedByName,
    markedCompletedAt: new Date(),
    createdAt: new Date(),
  };

  // Only add optional fields if they have values
  if (data.themeDescription) {
    themeProgress.themeDescription = data.themeDescription;
  }
  if (data.competencyNames && data.competencyNames.length > 0) {
    themeProgress.competencyNames = data.competencyNames;
  }
  if (data.zeitraum) {
    themeProgress.zeitraum = data.zeitraum as ClassThemeProgress["zeitraum"];
  }

  const docRef = await adminDb.collection(CLASS_THEMES_COLLECTION).add(themeProgress);
  return docRef.id;
}

/**
 * Entfernt die Markierung eines Themas
 */
export async function unmarkThemeAsCompleted(
  classId: string,
  themeId: string
): Promise<void> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(CLASS_THEMES_COLLECTION)
    .where("classId", "==", classId)
    .where("themeId", "==", themeId)
    .get();

  if (snapshot.empty) {
    throw new Error("Thema ist nicht als bearbeitet markiert");
  }

  // Lösche den Eintrag
  await snapshot.docs[0].ref.delete();
}

/**
 * Holt alle bearbeiteten Themen einer Klasse
 */
export async function getCompletedThemesForClass(
  classId: string
): Promise<ClassThemeProgress[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(CLASS_THEMES_COLLECTION)
    .where("classId", "==", classId)
    .get();

  const themes = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      classId: data.classId,
      className: data.className,
      themeId: data.themeId,
      themeName: data.themeName,
      themeDescription: data.themeDescription,
      competencyIds: data.competencyIds || [],
      competencyNames: data.competencyNames,
      zeitraum: data.zeitraum,
      markedCompletedBy: data.markedCompletedBy,
      markedCompletedByName: data.markedCompletedByName,
      markedCompletedAt: timestampToDate(data.markedCompletedAt),
      createdAt: timestampToDate(data.createdAt),
    } as ClassThemeProgress;
  });

  // Sort by markedCompletedAt descending in memory
  return themes.sort(
    (a, b) => b.markedCompletedAt.getTime() - a.markedCompletedAt.getTime()
  );
}

/**
 * Prüft ob ein Thema für eine Klasse als bearbeitet markiert ist
 */
export async function isThemeCompletedForClass(
  classId: string,
  themeId: string
): Promise<boolean> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(CLASS_THEMES_COLLECTION)
    .where("classId", "==", classId)
    .where("themeId", "==", themeId)
    .get();

  return !snapshot.empty;
}

// ============================================
// Badge Functions
// ============================================

/**
 * Holt alle System-Badges
 */
export async function getSystemBadges(): Promise<Badge[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(BADGES_COLLECTION)
    .where("isSystem", "==", true)
    .get();

  const badges = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      emoji: data.emoji,
      description: data.description,
      rarity: data.rarity as BadgeRarity,
      color: data.color,
      criteria: data.criteria,
      isSystem: data.isSystem,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: timestampToDate(data.createdAt),
      order: data.order || 0,
    } as Badge;
  });

  // Sort by order in memory
  return badges.sort((a, b) => a.order - b.order);
}

/**
 * Holt die Badges eines Schülers
 */
export async function getStudentBadges(studentId: string): Promise<StudentBadge[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection(STUDENT_BADGES_COLLECTION)
    .where("studentId", "==", studentId)
    .get();

  const badges = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      studentId: data.studentId,
      studentName: data.studentName,
      badgeId: data.badgeId,
      badgeName: data.badgeName,
      badgeEmoji: data.badgeEmoji,
      badgeRarity: data.badgeRarity as BadgeRarity,
      awardedAt: timestampToDate(data.awardedAt),
      awardedBy: data.awardedBy,
      awardedByName: data.awardedByName,
      reason: data.reason,
      notified: data.notified || false,
    } as StudentBadge;
  });

  // Sort by awardedAt descending in memory
  return badges.sort((a, b) => b.awardedAt.getTime() - a.awardedAt.getTime());
}

/**
 * Vergibt ein Badge an einen Schüler
 */
export async function awardBadge(data: {
  studentId: string;
  studentName?: string;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  badgeRarity: BadgeRarity;
  awardedBy: "system" | string;
  awardedByName?: string;
  reason?: string;
}): Promise<string> {
  const adminDb = getAdminDb();

  // Prüfen ob der Schüler das Badge bereits hat
  const existing = await adminDb
    .collection(STUDENT_BADGES_COLLECTION)
    .where("studentId", "==", data.studentId)
    .where("badgeId", "==", data.badgeId)
    .get();

  if (!existing.empty) {
    throw new Error("Schüler hat dieses Badge bereits");
  }

  const studentBadge: Omit<StudentBadge, "id"> = {
    studentId: data.studentId,
    studentName: data.studentName,
    badgeId: data.badgeId,
    badgeName: data.badgeName,
    badgeEmoji: data.badgeEmoji,
    badgeRarity: data.badgeRarity,
    awardedAt: new Date(),
    awardedBy: data.awardedBy,
    awardedByName: data.awardedByName,
    reason: data.reason,
    notified: false,
  };

  const docRef = await adminDb.collection(STUDENT_BADGES_COLLECTION).add(studentBadge);
  return docRef.id;
}

/**
 * Prüft und vergibt automatische Badges basierend auf dem Fortschritt
 */
export async function checkAndAwardAutoBadges(
  studentId: string,
  studentName: string,
  progress: StudentProgress
): Promise<StudentBadge[]> {
  const adminDb = getAdminDb();
  const awardedBadges: StudentBadge[] = [];

  // Hole alle System-Badges
  const badges = await getSystemBadges();

  // Hole bereits vergebene Badges
  const existingBadges = await getStudentBadges(studentId);
  const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

  // Berechne Statistiken
  const ratingValues = Object.values(progress.ratings);
  const totalRated = ratingValues.length;
  const fiveStarCount = ratingValues.filter((r) => r === 5).length;
  const fourPlusCount = ratingValues.filter((r) => r >= 4).length;
  const threePlusCount = ratingValues.filter((r) => r >= 3).length;

  for (const badge of badges) {
    // Skip wenn bereits vergeben
    if (existingBadgeIds.has(badge.id)) continue;

    let shouldAward = false;

    switch (badge.criteria.type) {
      case "competency_count":
        shouldAward = totalRated >= (badge.criteria.threshold || 0);
        break;
      case "star_count":
        if (badge.criteria.minStars === 5) {
          shouldAward = fiveStarCount >= (badge.criteria.threshold || 0);
        } else if (badge.criteria.minStars === 4) {
          shouldAward = fourPlusCount >= (badge.criteria.threshold || 0);
        } else if (badge.criteria.minStars === 3) {
          shouldAward = threePlusCount >= (badge.criteria.threshold || 0);
        }
        break;
      case "perfect_rating":
        shouldAward = fiveStarCount >= (badge.criteria.threshold || 0);
        break;
      // Weitere Criteria-Typen können hier hinzugefügt werden
    }

    if (shouldAward) {
      try {
        const badgeId = await awardBadge({
          studentId,
          studentName,
          badgeId: badge.id,
          badgeName: badge.name,
          badgeEmoji: badge.emoji,
          badgeRarity: badge.rarity,
          awardedBy: "system",
          reason: badge.criteria.description,
        });

        // Hole das neu erstellte Badge
        const newBadgeDoc = await adminDb
          .collection(STUDENT_BADGES_COLLECTION)
          .doc(badgeId)
          .get();

        if (newBadgeDoc.exists) {
          const data = newBadgeDoc.data()!;
          awardedBadges.push({
            id: newBadgeDoc.id,
            studentId: data.studentId,
            studentName: data.studentName,
            badgeId: data.badgeId,
            badgeName: data.badgeName,
            badgeEmoji: data.badgeEmoji,
            badgeRarity: data.badgeRarity,
            awardedAt: timestampToDate(data.awardedAt),
            awardedBy: data.awardedBy,
            awardedByName: data.awardedByName,
            reason: data.reason,
            notified: data.notified,
          });

          // Schüler über neues Badge benachrichtigen
          await notifyStudentBadgeEarned({
            studentId,
            badgeName: badge.name,
            badgeEmoji: badge.emoji,
          });
        }
      } catch (error) {
        // Badge wurde möglicherweise bereits vergeben (Race Condition)
        console.error("Error awarding badge:", error);
      }
    }
  }

  return awardedBadges;
}

/**
 * Initialisiert die Standard-System-Badges
 * Wird einmalig beim Setup ausgeführt
 */
export async function initializeSystemBadges(): Promise<void> {
  const adminDb = getAdminDb();

  // Prüfe ob bereits Badges existieren
  const existing = await adminDb
    .collection(BADGES_COLLECTION)
    .where("isSystem", "==", true)
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log("System badges already initialized");
    return;
  }

  const systemBadges: Omit<Badge, "id">[] = [
    // Common Badges
    {
      name: "Erster Schritt",
      emoji: "🌱",
      description: "Du hast deine erste Kompetenz bewertet!",
      rarity: "common",
      color: "#22c55e",
      criteria: {
        type: "competency_count",
        threshold: 1,
        description: "Erste Kompetenz bewertet",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 1,
    },
    {
      name: "Lernender",
      emoji: "📚",
      description: "Du hast 5 Kompetenzen bewertet!",
      rarity: "common",
      color: "#22c55e",
      criteria: {
        type: "competency_count",
        threshold: 5,
        description: "5 Kompetenzen bewertet",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 2,
    },
    {
      name: "Fleissig",
      emoji: "🐝",
      description: "Du hast 10 Kompetenzen bewertet!",
      rarity: "common",
      color: "#22c55e",
      criteria: {
        type: "competency_count",
        threshold: 10,
        description: "10 Kompetenzen bewertet",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 3,
    },
    {
      name: "Motiviert",
      emoji: "🔥",
      description: "Du hast 20 Kompetenzen bewertet!",
      rarity: "common",
      color: "#22c55e",
      criteria: {
        type: "competency_count",
        threshold: 20,
        description: "20 Kompetenzen bewertet",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 4,
    },

    // Rare Badges
    {
      name: "Halbzeit",
      emoji: "🎯",
      description: "Du hast die Hälfte aller Kompetenzen bewertet!",
      rarity: "rare",
      color: "#3b82f6",
      criteria: {
        type: "competency_count",
        threshold: 44,
        description: "Hälfte der Kompetenzen bewertet",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 5,
    },
    {
      name: "Könner",
      emoji: "💪",
      description: "Du hast 5 Kompetenzen mit 4+ Sternen!",
      rarity: "rare",
      color: "#3b82f6",
      criteria: {
        type: "star_count",
        threshold: 5,
        minStars: 4,
        description: "5 Kompetenzen mit 4+ Sternen",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 6,
    },
    {
      name: "Selbstbewusst",
      emoji: "😎",
      description: "Du hast 10 Kompetenzen mit 4+ Sternen!",
      rarity: "rare",
      color: "#3b82f6",
      criteria: {
        type: "star_count",
        threshold: 10,
        minStars: 4,
        description: "10 Kompetenzen mit 4+ Sternen",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 7,
    },
    {
      name: "Ehrlich",
      emoji: "🪞",
      description: "Du hast alle deine Kompetenzen realistisch eingeschätzt!",
      rarity: "rare",
      color: "#3b82f6",
      criteria: {
        type: "manual",
        description: "Realistische Selbsteinschätzung (vom Lehrer vergeben)",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 8,
    },

    // Epic Badges
    {
      name: "Fast am Ziel",
      emoji: "🚀",
      description: "Du hast 75% aller Kompetenzen bewertet!",
      rarity: "epic",
      color: "#a855f7",
      criteria: {
        type: "competency_count",
        threshold: 65,
        description: "75% der Kompetenzen bewertet",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 9,
    },
    {
      name: "Experte",
      emoji: "🎓",
      description: "Du hast 20 Kompetenzen mit 4+ Sternen!",
      rarity: "epic",
      color: "#a855f7",
      criteria: {
        type: "star_count",
        threshold: 20,
        minStars: 4,
        description: "20 Kompetenzen mit 4+ Sternen",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 10,
    },
    {
      name: "Perfektionist",
      emoji: "✨",
      description: "Du hast 5 Kompetenzen mit 5 Sternen!",
      rarity: "epic",
      color: "#a855f7",
      criteria: {
        type: "perfect_rating",
        threshold: 5,
        description: "5 Kompetenzen mit 5 Sternen",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 11,
    },
    {
      name: "Superstar",
      emoji: "⭐",
      description: "Du hast 10 Kompetenzen mit 5 Sternen!",
      rarity: "epic",
      color: "#a855f7",
      criteria: {
        type: "perfect_rating",
        threshold: 10,
        description: "10 Kompetenzen mit 5 Sternen",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 12,
    },

    // Legendary Badges
    {
      name: "Vollständig",
      emoji: "🏆",
      description: "Du hast alle Kompetenzen bewertet!",
      rarity: "legendary",
      color: "#f59e0b",
      criteria: {
        type: "competency_count",
        threshold: 87,
        description: "Alle Kompetenzen bewertet",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 13,
    },
    {
      name: "Meister",
      emoji: "👑",
      description: "Du hast 50 Kompetenzen mit 4+ Sternen!",
      rarity: "legendary",
      color: "#f59e0b",
      criteria: {
        type: "star_count",
        threshold: 50,
        minStars: 4,
        description: "50 Kompetenzen mit 4+ Sternen",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 14,
    },
    {
      name: "Legende",
      emoji: "🌟",
      description: "Du hast 25 Kompetenzen mit 5 Sternen!",
      rarity: "legendary",
      color: "#f59e0b",
      criteria: {
        type: "perfect_rating",
        threshold: 25,
        description: "25 Kompetenzen mit 5 Sternen",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 15,
    },
    {
      name: "MIA-Champion",
      emoji: "🎖️",
      description: "Aussergewöhnliche Leistung im MIA-Bereich!",
      rarity: "legendary",
      color: "#f59e0b",
      criteria: {
        type: "manual",
        description: "Vom Lehrer für besondere Leistung vergeben",
      },
      isSystem: true,
      createdAt: new Date(),
      order: 16,
    },
  ];

  // Batch-Write alle Badges
  const batch = adminDb.batch();
  for (const badge of systemBadges) {
    const docRef = adminDb.collection(BADGES_COLLECTION).doc();
    batch.set(docRef, badge);
  }

  await batch.commit();
  console.log(`Initialized ${systemBadges.length} system badges`);
}

/**
 * Holt alle Badges (System + Custom)
 */
export async function getAllBadges(schoolId?: string): Promise<Badge[]> {
  const adminDb = getAdminDb();

  // System-Badges holen
  const systemSnapshot = await adminDb
    .collection(BADGES_COLLECTION)
    .where("isSystem", "==", true)
    .get();

  const systemBadges = systemSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      emoji: data.emoji,
      description: data.description,
      rarity: data.rarity as BadgeRarity,
      color: data.color,
      criteria: data.criteria,
      isSystem: data.isSystem,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: timestampToDate(data.createdAt),
      order: data.order || 0,
    } as Badge;
  });

  // Custom-Badges für die Schule holen (falls schoolId angegeben)
  let customBadges: Badge[] = [];
  if (schoolId) {
    const customSnapshot = await adminDb
      .collection(BADGES_COLLECTION)
      .where("isSystem", "==", false)
      .where("schoolId", "==", schoolId)
      .get();

    customBadges = customSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        emoji: data.emoji,
        description: data.description,
        rarity: data.rarity as BadgeRarity,
        color: data.color,
        criteria: data.criteria,
        isSystem: data.isSystem,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        schoolId: data.schoolId,
        createdAt: timestampToDate(data.createdAt),
        order: data.order || 100,
      } as Badge;
    });
  }

  // Kombinieren und sortieren
  const allBadges = [...systemBadges, ...customBadges];
  return allBadges.sort((a, b) => a.order - b.order);
}

/**
 * Erstellt ein Custom-Badge
 */
export async function createCustomBadge(data: {
  name: string;
  emoji: string;
  description: string;
  rarity: BadgeRarity;
  createdBy: string;
  createdByName: string;
  schoolId: string;
}): Promise<string> {
  const adminDb = getAdminDb();

  const badge: Omit<Badge, "id"> = {
    name: data.name,
    emoji: data.emoji,
    description: data.description,
    rarity: data.rarity,
    color:
      data.rarity === "common"
        ? "#22c55e"
        : data.rarity === "rare"
        ? "#3b82f6"
        : data.rarity === "epic"
        ? "#a855f7"
        : "#f59e0b",
    criteria: {
      type: "manual",
      description: "Manuell vom Lehrer vergeben",
    },
    isSystem: false,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    schoolId: data.schoolId,
    createdAt: new Date(),
    order: 100, // Custom badges kommen nach System-Badges
  };

  const docRef = await adminDb.collection(BADGES_COLLECTION).add(badge);
  return docRef.id;
}

/**
 * Löscht ein Custom-Badge
 */
export async function deleteCustomBadge(badgeId: string): Promise<void> {
  const adminDb = getAdminDb();

  // Prüfen ob es ein System-Badge ist
  const badgeDoc = await adminDb.collection(BADGES_COLLECTION).doc(badgeId).get();
  if (!badgeDoc.exists) {
    throw new Error("Badge nicht gefunden");
  }

  const badgeData = badgeDoc.data()!;
  if (badgeData.isSystem) {
    throw new Error("System-Badges können nicht gelöscht werden");
  }

  // Badge löschen
  await adminDb.collection(BADGES_COLLECTION).doc(badgeId).delete();
}

/**
 * Holt alle vergebenen Badges für Schüler einer Klasse
 */
export async function getStudentBadgesForClass(
  classId: string
): Promise<{ studentId: string; badges: StudentBadge[] }[]> {
  const adminDb = getAdminDb();

  // Erst alle Schüler der Klasse holen
  const studentsSnapshot = await adminDb
    .collection("students")
    .where("classId", "==", classId)
    .get();

  const studentIds = studentsSnapshot.docs.map((doc) => doc.id);

  if (studentIds.length === 0) {
    return [];
  }

  // Dann alle Badges für diese Schüler holen
  // Firestore erlaubt max 10 IDs in "in" Query, also aufteilen
  const results: { studentId: string; badges: StudentBadge[] }[] = [];

  for (const studentId of studentIds) {
    const badges = await getStudentBadges(studentId);
    results.push({ studentId, badges });
  }

  return results;
}

/**
 * Entfernt ein Badge von einem Schüler
 */
export async function revokeBadge(studentBadgeId: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(STUDENT_BADGES_COLLECTION).doc(studentBadgeId).delete();
}

/**
 * Holt Fortschrittsstatistiken für eine Klasse
 */
export async function getClassProgressStats(
  classId: string
): Promise<{
  studentCount: number;
  averageRatedCompetencies: number;
  averageRating: number;
  completedThemesCount: number;
}> {
  const adminDb = getAdminDb();

  // Hole alle Schüler-Progress für die Klasse
  const progressSnapshot = await adminDb
    .collection(PROGRESS_COLLECTION)
    .where("classId", "==", classId)
    .get();

  let totalRatedCompetencies = 0;
  let totalRating = 0;
  let totalRatings = 0;

  progressSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const ratings = data.ratings || {};
    const ratingValues = Object.values(ratings) as number[];
    totalRatedCompetencies += ratingValues.length;
    totalRating += ratingValues.reduce((sum, r) => sum + r, 0);
    totalRatings += ratingValues.length;
  });

  const studentCount = progressSnapshot.docs.length;

  // Hole bearbeitete Themen
  const themesSnapshot = await adminDb
    .collection(CLASS_THEMES_COLLECTION)
    .where("classId", "==", classId)
    .get();

  return {
    studentCount,
    averageRatedCompetencies:
      studentCount > 0 ? Math.round(totalRatedCompetencies / studentCount) : 0,
    averageRating: totalRatings > 0 ? Math.round((totalRating / totalRatings) * 10) / 10 : 0,
    completedThemesCount: themesSnapshot.docs.length,
  };
}
