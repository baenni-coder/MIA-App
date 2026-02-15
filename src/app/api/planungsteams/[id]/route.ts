import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getPlanungsTeamById,
  updatePlanungsTeam,
  deletePlanungsTeam,
} from "@/lib/firestore/planungsteams";

/**
 * GET /api/planungsteams/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const team = await getPlanungsTeamById(id);
    if (!team) {
      return NextResponse.json(
        { error: "Team nicht gefunden" },
        { status: 404 }
      );
    }

    // Nur Mitglieder dürfen das Team sehen
    const isMember = team.members.some((m) => m.userId === userId);
    if (!isMember) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error fetching planungsteam:", error);
    return NextResponse.json(
      { error: "Failed to fetch planungsteam" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/planungsteams/[id]
 * Aktualisiert Team-Name (nur Owner)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const team = await getPlanungsTeamById(id);
    if (!team) {
      return NextResponse.json(
        { error: "Team nicht gefunden" },
        { status: 404 }
      );
    }

    const isOwner = team.members.some(
      (m) => m.userId === userId && m.role === "owner"
    );
    if (!isOwner) {
      return NextResponse.json(
        { error: "Nur der Ersteller kann das Team bearbeiten" },
        { status: 403 }
      );
    }

    const body = await request.json();
    await updatePlanungsTeam(id, { name: body.name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating planungsteam:", error);
    return NextResponse.json(
      { error: "Failed to update planungsteam" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/planungsteams/[id]
 * Löscht ein Team (nur Owner)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const team = await getPlanungsTeamById(id);
    if (!team) {
      return NextResponse.json(
        { error: "Team nicht gefunden" },
        { status: 404 }
      );
    }

    const isOwner = team.members.some(
      (m) => m.userId === userId && m.role === "owner"
    );
    if (!isOwner) {
      return NextResponse.json(
        { error: "Nur der Ersteller kann das Team löschen" },
        { status: 403 }
      );
    }

    await deletePlanungsTeam(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting planungsteam:", error);
    return NextResponse.json(
      { error: "Failed to delete planungsteam" },
      { status: 500 }
    );
  }
}
