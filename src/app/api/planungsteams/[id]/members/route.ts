import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getPlanungsTeamById,
  updateTeamMembers,
} from "@/lib/firestore/planungsteams";
import type { TeamMember } from "@/types";

/**
 * PUT /api/planungsteams/[id]/members
 * Aktualisiert die Mitglieder eines Teams (nur Owner)
 *
 * Body: { members: TeamMember[] }
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

    // Nur Owner darf Mitglieder verwalten
    const isOwner = team.members.some(
      (m) => m.userId === userId && m.role === "owner"
    );
    if (!isOwner) {
      return NextResponse.json(
        { error: "Nur der Ersteller kann Mitglieder verwalten" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!Array.isArray(body.members)) {
      return NextResponse.json(
        { error: "members muss ein Array sein" },
        { status: 400 }
      );
    }

    // Owner muss immer enthalten sein
    const members: TeamMember[] = body.members;
    const hasOwner = members.some(
      (m) => m.userId === userId && m.role === "owner"
    );
    if (!hasOwner) {
      return NextResponse.json(
        { error: "Der Ersteller kann sich nicht selbst entfernen" },
        { status: 400 }
      );
    }

    // Validieren: Alle User müssen zur gleichen Schule gehören
    const adminDb = getAdminDb();
    for (const member of members) {
      if (member.userId === userId) continue; // Owner schon validiert
      const teacherDoc = await adminDb
        .collection("teachers")
        .doc(member.userId)
        .get();
      if (!teacherDoc.exists) {
        return NextResponse.json(
          { error: `User ${member.name} nicht gefunden` },
          { status: 400 }
        );
      }
      const teacherData = teacherDoc.data();
      if (teacherData?.schuleId !== team.schuleId) {
        return NextResponse.json(
          { error: `${member.name} gehört nicht zur gleichen Schule` },
          { status: 400 }
        );
      }
    }

    await updateTeamMembers(id, members);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating team members:", error);
    return NextResponse.json(
      { error: "Failed to update team members" },
      { status: 500 }
    );
  }
}
