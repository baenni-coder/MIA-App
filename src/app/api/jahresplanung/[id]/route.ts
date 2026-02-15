import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getJahresplanEinheitById,
  updateJahresplanEinheit,
  deleteJahresplanEinheit,
} from "@/lib/firestore/jahresplanung";
import { getPlanungsTeamById } from "@/lib/firestore/planungsteams";

/**
 * GET /api/jahresplanung/[id]
 * Lädt eine einzelne Jahresplan-Einheit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const einheit = await getJahresplanEinheitById(id);

    if (!einheit) {
      return NextResponse.json(
        { error: "Einheit nicht gefunden" },
        { status: 404 }
      );
    }

    // Berechtigung prüfen: Owner, Team-Mitglied, sharedWith oder isShared
    const isOwner = einheit.teacherId === userId;
    const isSharedWithUser = einheit.sharedWith?.includes(userId) || false;

    let isTeamMember = false;
    if (einheit.teamId) {
      const team = await getPlanungsTeamById(einheit.teamId);
      isTeamMember = team?.members.some((m) => m.userId === userId) || false;
    }

    if (!isOwner && !einheit.isShared && !isSharedWithUser && !isTeamMember) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    return NextResponse.json({ einheit });
  } catch (error) {
    console.error("Error fetching jahresplan einheit:", error);
    return NextResponse.json(
      { error: "Failed to fetch jahresplan einheit" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/jahresplanung/[id]
 * Aktualisiert eine Jahresplan-Einheit
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Bestehende Einheit prüfen
    const einheit = await getJahresplanEinheitById(id);

    if (!einheit) {
      return NextResponse.json(
        { error: "Einheit nicht gefunden" },
        { status: 404 }
      );
    }

    const isOwner = einheit.teacherId === userId;
    const isSharedWithUser = einheit.sharedWith?.includes(userId) || false;

    let isTeamMember = false;
    if (einheit.teamId) {
      const team = await getPlanungsTeamById(einheit.teamId);
      isTeamMember = team?.members.some((m) => m.userId === userId) || false;
    }

    // Owner, Team-Mitglied oder sharedWith-User dürfen bearbeiten
    if (!isOwner && !isSharedWithUser && !isTeamMember) {
      return NextResponse.json(
        { error: "Keine Berechtigung zum Bearbeiten" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Nur erlaubte Felder aktualisieren
    const updateData: Record<string, unknown> = {};

    if (body.titel !== undefined) updateData.titel = body.titel;
    if (body.lernziele !== undefined) updateData.lernziele = body.lernziele;
    if (body.fachbereichId !== undefined) updateData.fachbereichId = body.fachbereichId;
    if (body.fachbereichName !== undefined) updateData.fachbereichName = body.fachbereichName;
    if (body.fachbereichFarbe !== undefined) updateData.fachbereichFarbe = body.fachbereichFarbe;
    if (body.kompetenzenIds !== undefined) updateData.kompetenzenIds = body.kompetenzenIds;
    if (body.kompetenzenNamen !== undefined) updateData.kompetenzenNamen = body.kompetenzenNamen;
    if (body.zeitraumStart !== undefined) updateData.zeitraumStart = body.zeitraumStart;
    if (body.zeitraumEnde !== undefined) updateData.zeitraumEnde = body.zeitraumEnde;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notizen !== undefined) updateData.notizen = body.notizen;
    if (body.beurteilungstyp !== undefined) updateData.beurteilungstyp = body.beurteilungstyp;
    if (body.beurteilungsNotiz !== undefined) updateData.beurteilungsNotiz = body.beurteilungsNotiz;
    if (body.beurteilungen !== undefined) updateData.beurteilungen = body.beurteilungen;
    if (body.materialien !== undefined) updateData.materialien = body.materialien;
    if (body.istPufferwoche !== undefined) updateData.istPufferwoche = body.istPufferwoche;
    if (body.farbe !== undefined) updateData.farbe = body.farbe;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.linkedMiaThemeId !== undefined) updateData.linkedMiaThemeId = body.linkedMiaThemeId;
    if (body.linkedMiaThemeName !== undefined) updateData.linkedMiaThemeName = body.linkedMiaThemeName;
    if (body.linkedFileIds !== undefined) updateData.linkedFileIds = body.linkedFileIds;
    if (body.linkedFileNames !== undefined) updateData.linkedFileNames = body.linkedFileNames;

    // Sharing-Felder nur vom Owner änderbar
    if (isOwner) {
      if (body.isShared !== undefined) updateData.isShared = body.isShared;
      if (body.sharedWith !== undefined) updateData.sharedWith = body.sharedWith;
    }

    await updateJahresplanEinheit(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating jahresplan einheit:", error);
    return NextResponse.json(
      { error: "Failed to update jahresplan einheit" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jahresplanung/[id]
 * Löscht eine Jahresplan-Einheit
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Bestehende Einheit prüfen
    const einheit = await getJahresplanEinheitById(id);

    if (!einheit) {
      return NextResponse.json(
        { error: "Einheit nicht gefunden" },
        { status: 404 }
      );
    }

    // Owner oder Team-Mitglied darf löschen
    const canDelete = einheit.teacherId === userId;
    let isTeamMemberForDelete = false;
    if (!canDelete && einheit.teamId) {
      const team = await getPlanungsTeamById(einheit.teamId);
      isTeamMemberForDelete = team?.members.some((m) => m.userId === userId) || false;
    }

    if (!canDelete && !isTeamMemberForDelete) {
      return NextResponse.json(
        { error: "Keine Berechtigung zum Löschen" },
        { status: 403 }
      );
    }

    await deleteJahresplanEinheit(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting jahresplan einheit:", error);
    return NextResponse.json(
      { error: "Failed to delete jahresplan einheit" },
      { status: 500 }
    );
  }
}
