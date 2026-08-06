import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getJahresplanEinheitById } from "@/lib/firestore/jahresplanung";
import { getPlanungsTeamById } from "@/lib/firestore/planungsteams";
import {
  getEinheitLektionsplanungById,
  updateEinheitLektionsplanung,
  deleteEinheitLektionsplanung,
} from "@/lib/firestore/einheit-lektionsplanungen";
import type { JahresplanEinheit } from "@/types";

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
 * Gemeinsame Auth + Konsistenzprüfung.
 * Stellt sicher, dass die Planung zur Einheit gehört und der User editieren darf.
 */
async function authorize(
  request: NextRequest,
  einheitId: string,
  planungId: string
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const token = authHeader.substring(7);
  const decodedToken = await getAdminAuth().verifyIdToken(token);
  const userId = decodedToken.uid;

  const einheit = await getJahresplanEinheitById(einheitId);
  if (!einheit) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Einheit nicht gefunden" },
        { status: 404 }
      ),
    };
  }

  const planung = await getEinheitLektionsplanungById(planungId);
  if (!planung || planung.einheitId !== einheitId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Lektionsplanung nicht gefunden" },
        { status: 404 }
      ),
    };
  }

  if (!(await canEditEinheit(einheit, userId))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId };
}

/**
 * PUT /api/jahresplanung/[id]/lektionsplanungen/[planungId]
 * Aktualisiert eine Lektionsplanung (Name, Beschreibung, Reihenfolge)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; planungId: string }> }
) {
  try {
    const { id: einheitId, planungId } = await params;
    const auth = await authorize(request, einheitId, planungId);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const updates: { name?: string; beschreibung?: string; order?: number } = {};

    if (body.name !== undefined) {
      const name = (body.name as string).trim();
      if (!name) {
        return NextResponse.json(
          { error: "name darf nicht leer sein" },
          { status: 400 }
        );
      }
      updates.name = name;
    }
    if (body.beschreibung !== undefined) {
      updates.beschreibung = (body.beschreibung as string).trim();
    }
    if (body.order !== undefined) {
      updates.order = Number(body.order);
    }

    await updateEinheitLektionsplanung(planungId, updates);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Error in PUT /api/jahresplanung/[id]/lektionsplanungen/[planungId]:",
      error
    );
    if ((error as { code?: string }).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update lektionsplanung" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jahresplanung/[id]/lektionsplanungen/[planungId]
 * Löscht eine Lektionsplanung inkl. aller zugehörigen Lektionen
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; planungId: string }> }
) {
  try {
    const { id: einheitId, planungId } = await params;
    const auth = await authorize(request, einheitId, planungId);
    if (!auth.ok) return auth.response;

    await deleteEinheitLektionsplanung(planungId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Error in DELETE /api/jahresplanung/[id]/lektionsplanungen/[planungId]:",
      error
    );
    if ((error as { code?: string }).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete lektionsplanung" },
      { status: 500 }
    );
  }
}
