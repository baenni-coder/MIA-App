import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createJahresplanEinheit,
  getJahresplanEinheiten,
  getTeamEinheiten,
  getSharedEinheiten,
} from "@/lib/firestore/jahresplanung";
import { getPlanungsTeamById } from "@/lib/firestore/planungsteams";
import { SPEZIALWOCHE_FACHBEREICH } from "@/lib/data/lp21-data";
import { JahresplanFilter } from "@/types";

/**
 * GET /api/jahresplanung
 * Lädt alle Jahresplan-Einheiten eines Lehrers oder eines Teams
 *
 * Query Parameters:
 * - schuljahr: Schuljahr filter (z.B. "2025/2026")
 * - quartal: Quartal filter (1-4)
 * - fachbereichId: Fachbereich filter
 * - status: Status filter
 * - teamId: Team-ID (wenn gesetzt, werden Team-Einheiten geladen)
 * - includeShared: "true" um geteilte Planungen einzuschließen
 */
export async function GET(request: NextRequest) {
  try {
    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Lehrer-Daten laden für Schul-ID (für geteilte Planungen)
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    const teacher = teacherDoc.exists ? teacherDoc.data() : null;

    // Query Parameter parsen
    const { searchParams } = new URL(request.url);
    const schuljahr = searchParams.get("schuljahr") || undefined;
    const quartal = searchParams.get("quartal")
      ? parseInt(searchParams.get("quartal")!)
      : undefined;
    const fachbereichId = searchParams.get("fachbereichId") || undefined;
    const status = searchParams.get("status") as JahresplanFilter["status"] | undefined;
    const teamId = searchParams.get("teamId") || undefined;
    const includeShared = searchParams.get("includeShared") === "true";

    const filter: JahresplanFilter = {
      schuljahr: schuljahr || "",
      quartal,
      fachbereichId,
      status,
    };

    // Team-Einheiten oder eigene Einheiten laden
    if (teamId) {
      // Team-Mitgliedschaft prüfen
      const team = await getPlanungsTeamById(teamId);
      if (!team) {
        return NextResponse.json({ error: "Team nicht gefunden" }, { status: 404 });
      }
      const isMember = team.members.some((m) => m.userId === userId);
      if (!isMember) {
        return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
      }

      // Nur dem Team zugeordnete Einheiten (teamId) laden – die private
      // Planung der Mitglieder bleibt privat
      const einheiten = await getTeamEinheiten(teamId, filter);
      return NextResponse.json({ einheiten, sharedEinheiten: [] });
    }

    // Eigene Einheiten laden (ohne Team-Einheiten)
    const einheiten = await getJahresplanEinheiten(userId, filter);

    // Optionale geteilte Einheiten laden
    let sharedEinheiten: typeof einheiten = [];
    if (includeShared && teacher?.schuleId && schuljahr) {
      sharedEinheiten = await getSharedEinheiten(
        teacher.schuleId,
        schuljahr,
        userId
      );
    }

    return NextResponse.json({
      einheiten,
      sharedEinheiten,
    });
  } catch (error) {
    console.error("Error fetching jahresplanung:", error);
    return NextResponse.json(
      { error: "Failed to fetch jahresplanung" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jahresplanung
 * Erstellt eine neue Jahresplan-Einheit
 */
export async function POST(request: NextRequest) {
  try {
    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();

    // Validierung: Spezialwochen (Projektwoche, Skilager …) brauchen keinen Fachbereich
    const istSpezialwoche = body.istSpezialwoche === true;
    if (!body.schuljahr || !body.titel || (!body.fachbereichId && !istSpezialwoche)) {
      return NextResponse.json(
        { error: "Schuljahr, Fachbereich und Titel sind erforderlich" },
        { status: 400 }
      );
    }

    if (body.zeitraumStart === undefined || body.zeitraumEnde === undefined) {
      return NextResponse.json(
        { error: "Zeitraum (Start und Ende) ist erforderlich" },
        { status: 400 }
      );
    }

    // SchuleId des Lehrers laden
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    const teacher = teacherDoc.exists ? teacherDoc.data() : null;

    // Wenn teamId angegeben, Team-Mitgliedschaft prüfen
    if (body.teamId) {
      const team = await getPlanungsTeamById(body.teamId);
      if (!team) {
        return NextResponse.json({ error: "Team nicht gefunden" }, { status: 404 });
      }
      const isMember = team.members.some((m) => m.userId === userId);
      if (!isMember) {
        return NextResponse.json({ error: "Keine Berechtigung für dieses Team" }, { status: 403 });
      }
    }

    const id = await createJahresplanEinheit({
      teacherId: userId,
      schuljahr: body.schuljahr,
      fachbereichId: body.fachbereichId || SPEZIALWOCHE_FACHBEREICH.id,
      fachbereichName:
        body.fachbereichName ||
        (istSpezialwoche ? SPEZIALWOCHE_FACHBEREICH.name : undefined),
      fachbereichFarbe:
        body.fachbereichFarbe ||
        (istSpezialwoche ? SPEZIALWOCHE_FACHBEREICH.farbe : undefined),
      istSpezialwoche,
      titel: body.titel,
      lernziele: body.lernziele,
      kompetenzenIds: body.kompetenzenIds,
      kompetenzenNamen: body.kompetenzenNamen,
      zeitraumStart: body.zeitraumStart,
      zeitraumEnde: body.zeitraumEnde,
      status: body.status,
      beurteilungstyp: body.beurteilungstyp,
      beurteilungsNotiz: body.beurteilungsNotiz,
      beurteilungen: body.beurteilungen,
      materialien: body.materialien,
      istPufferwoche: body.istPufferwoche,
      farbe: body.farbe,
      schuleId: teacher?.schuleId,
      teamId: body.teamId,
      linkedMiaThemeId: body.linkedMiaThemeId,
      linkedMiaThemeName: body.linkedMiaThemeName,
      linkedFileIds: body.linkedFileIds,
      linkedFileNames: body.linkedFileNames,
      lehrmittel: body.lehrmittel,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error creating jahresplan einheit:", error);
    return NextResponse.json(
      { error: "Failed to create jahresplan einheit" },
      { status: 500 }
    );
  }
}
