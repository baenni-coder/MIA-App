import { getAdminDb } from "@/lib/firebase/admin";
import type { PlanungsTeam, TeamMember } from "@/types";

const PLANUNGSTEAMS_COLLECTION = "planungsteams";

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

function docToTeam(
  doc: FirebaseFirestore.DocumentSnapshot
): PlanungsTeam {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    schuleId: data.schuleId,
    schuljahr: data.schuljahr,
    members: data.members || [],
    createdBy: data.createdBy,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

/**
 * Erstellt ein neues Planungsteam
 */
export async function createPlanungsTeam(data: {
  name: string;
  schuleId: string;
  schuljahr: string;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const adminDb = getAdminDb();
  const now = new Date();

  const teamData = {
    name: data.name,
    schuleId: data.schuleId,
    schuljahr: data.schuljahr,
    members: [
      {
        userId: data.createdBy,
        name: data.createdByName,
        role: "owner" as const,
      },
    ],
    memberIds: [data.createdBy], // Denormalisiert für array-contains Query
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb
    .collection(PLANUNGSTEAMS_COLLECTION)
    .add(teamData);

  return docRef.id;
}

/**
 * Lädt ein Team nach ID
 */
export async function getPlanungsTeamById(
  id: string
): Promise<PlanungsTeam | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb
    .collection(PLANUNGSTEAMS_COLLECTION)
    .doc(id)
    .get();

  if (!doc.exists) return null;
  return docToTeam(doc);
}

/**
 * Lädt alle Teams eines Users (als Mitglied)
 */
export async function getPlanungsTeamsForUser(
  userId: string,
  schuljahr?: string
): Promise<PlanungsTeam[]> {
  const adminDb = getAdminDb();

  // Firestore kann nicht direkt in einem Array-of-Objects nach einem Feld suchen.
  // Wir laden alle Teams der Schule und filtern clientseitig.
  // Alternative: Denormalisierte memberIds als separates Array-Feld.

  // Effizienterer Ansatz: memberIds-Array als Top-Level-Feld
  let query: FirebaseFirestore.Query = adminDb
    .collection(PLANUNGSTEAMS_COLLECTION)
    .where("memberIds", "array-contains", userId);

  if (schuljahr) {
    query = query.where("schuljahr", "==", schuljahr);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => docToTeam(doc));
}

/**
 * Aktualisiert ein Team (Name)
 */
export async function updatePlanungsTeam(
  id: string,
  data: { name?: string }
): Promise<void> {
  const adminDb = getAdminDb();
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updateData.name = data.name;

  await adminDb
    .collection(PLANUNGSTEAMS_COLLECTION)
    .doc(id)
    .update(updateData);
}

/**
 * Aktualisiert die Mitglieder eines Teams
 * Setzt auch das denormalisierte memberIds-Array
 */
export async function updateTeamMembers(
  id: string,
  members: TeamMember[]
): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb
    .collection(PLANUNGSTEAMS_COLLECTION)
    .doc(id)
    .update({
      members,
      memberIds: members.map((m) => m.userId),
      updatedAt: new Date(),
    });
}

/**
 * Löscht ein Team
 */
export async function deletePlanungsTeam(id: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(PLANUNGSTEAMS_COLLECTION).doc(id).delete();
}
