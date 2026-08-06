import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getJahresplanEinheitById } from "@/lib/firestore/jahresplanung";
import { getPlanungsTeamById } from "@/lib/firestore/planungsteams";
import {
  createEinheitLektionsplanung,
  getEinheitLektionsplanungenByEinheit,
} from "@/lib/firestore/einheit-lektionsplanungen";
import type { JahresplanEinheit } from "@/types";

/**
 * Prüft, ob der User die Einheit bearbeiten darf (Owner, sharedWith, Team).
 */
async function canEditEinheit(
  einheit: JahresplanEinheit,
  userId: string
): Promise<boolean> {
  if (einheit.teacherId === userId) return true;
  if (einheit.sharedWith?.includes(userId)) return true;
  if (einheit.teamId) {
    const team = await getPlanungsTeamById(einheit.teamId);
    if (team?.members.some((m) => m.userId === userId)) return true;
  }
  return false;
}

/**
 * GET /api/jahresplanung/[id]/lektionsplanungen
 * Lädt alle Lektionsplanungen einer Einheit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: einheitId } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const einheit = await getJahresplanEinheitById(einheitId);
    if (!einheit) {
      return NextResponse.json(
        { error: "Einheit nicht gefunden" },
        { status: 404 }
      );
    }

    // Lesen: Owner/Team/sharedWith oder geteilte Einheit
    const canRead =
      (await canEditEinheit(einheit, userId)) || einheit.isShared;
    if (!canRead) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const lektionsplanungen = await getEinheitLektionsplanungenByEinheit(
      einheitId
    );

    return NextResponse.json({ lektionsplanungen }, { status: 200 });
  } catch (error) {
    console.error(
      "Error in GET /api/jahresplanung/[id]/lektionsplanungen:",
      error
    );
    if ((error as { code?: string }).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch lektionsplanungen" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jahresplanung/[id]/lektionsplanungen
 * Erstellt eine neue Lektionsplanung innerhalb der Einheit
 *
 * Body: { name: string, beschreibung?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: einheitId } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const einheit = await getJahresplanEinheitById(einheitId);
    if (!einheit) {
      return NextResponse.json(
        { error: "Einheit nicht gefunden" },
        { status: 404 }
      );
    }

    if (!(await canEditEinheit(einheit, userId))) {
      return NextResponse.json(
        { error: "Keine Berechtigung zum Bearbeiten" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = (body.name as string | undefined)?.trim();
    const beschreibung = (body.beschreibung as string | undefined)?.trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // order = Anzahl bestehender Planungen (ans Ende anhängen)
    const bestehende = await getEinheitLektionsplanungenByEinheit(einheitId);

    // SchuleId des Users für Sichtbarkeit
    const teacherDoc = await getAdminDb()
      .collection("teachers")
      .doc(userId)
      .get();
    const schuleId = teacherDoc.exists
      ? teacherDoc.data()?.schuleId
      : einheit.schuleId;

    const planungId = await createEinheitLektionsplanung({
      einheitId,
      teacherId: userId,
      schuleId,
      name,
      beschreibung: beschreibung || undefined,
      order: bestehende.length,
    });

    return NextResponse.json({ success: true, id: planungId }, { status: 201 });
  } catch (error) {
    console.error(
      "Error in POST /api/jahresplanung/[id]/lektionsplanungen:",
      error
    );
    if ((error as { code?: string }).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create lektionsplanung" },
      { status: 500 }
    );
  }
}
