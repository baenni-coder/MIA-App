import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createPlanungsTeam,
  getPlanungsTeamsForUser,
} from "@/lib/firestore/planungsteams";

/**
 * GET /api/planungsteams
 * Lädt alle Teams eines Users (optional gefiltert nach Schuljahr)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const schuljahr = searchParams.get("schuljahr") || undefined;

    const teams = await getPlanungsTeamsForUser(userId, schuljahr);

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching planungsteams:", error);
    return NextResponse.json(
      { error: "Failed to fetch planungsteams" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planungsteams
 * Erstellt ein neues Team
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();

    if (!body.name || !body.schuljahr) {
      return NextResponse.json(
        { error: "Name und Schuljahr sind erforderlich" },
        { status: 400 }
      );
    }

    // Lehrer-Daten laden für SchuleId und Name
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    const teacher = teacherDoc.exists ? teacherDoc.data() : null;

    if (!teacher?.schuleId) {
      return NextResponse.json(
        { error: "Keine Schule zugewiesen" },
        { status: 400 }
      );
    }

    const id = await createPlanungsTeam({
      name: body.name,
      schuleId: teacher.schuleId,
      schuljahr: body.schuljahr,
      createdBy: userId,
      createdByName: teacher.name || teacher.email || "Unbekannt",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error creating planungsteam:", error);
    return NextResponse.json(
      { error: "Failed to create planungsteam" },
      { status: 500 }
    );
  }
}
