import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createJahresplanEinheit,
  getJahresplanEinheiten,
  getSharedEinheiten,
} from "@/lib/firestore/jahresplanung";
import { JahresplanFilter } from "@/types";

/**
 * GET /api/jahresplanung
 * Lädt alle Jahresplan-Einheiten eines Lehrers
 *
 * Query Parameters:
 * - schuljahr: Schuljahr filter (z.B. "2025/2026")
 * - quartal: Quartal filter (1-4)
 * - fachbereichId: Fachbereich filter
 * - status: Status filter
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
    const includeShared = searchParams.get("includeShared") === "true";

    const filter: JahresplanFilter = {
      schuljahr: schuljahr || "",
      quartal,
      fachbereichId,
      status,
    };

    // Eigene Einheiten laden
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

    // Validierung
    if (!body.schuljahr || !body.fachbereichId || !body.titel) {
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

    const id = await createJahresplanEinheit({
      teacherId: userId,
      schuljahr: body.schuljahr,
      fachbereichId: body.fachbereichId,
      fachbereichName: body.fachbereichName,
      fachbereichFarbe: body.fachbereichFarbe,
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
      linkedMiaThemeId: body.linkedMiaThemeId,
      linkedMiaThemeName: body.linkedMiaThemeName,
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
