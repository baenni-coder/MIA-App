import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getTeacherProfile,
  canManageSchoolJahresplan,
} from "@/lib/firestore/permissions";
import {
  getSchoolLektionOverrideById,
  updateSchoolLektionOverride,
  deleteSchoolLektionOverride,
} from "@/lib/firestore/school-lektionen";

async function authorize(
  request: NextRequest,
  id: string
): Promise<
  | { ok: true; userId: string; teacherName: string }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const token = authHeader.substring(7);
  let userId: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }

  const override = await getSchoolLektionOverrideById(id);
  if (!override) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  const canManage = await canManageSchoolJahresplan(userId, override.schuleId);
  if (!canManage) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const teacher = await getTeacherProfile(userId);
  return { ok: true, userId, teacherName: teacher?.name || "Unbekannt" };
}

/**
 * PUT /api/school-lektionen/[id]
 * Aktualisiert ein Lektions-Override. null-Werte entfernen das Feld.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    await updateSchoolLektionOverride(
      id,
      {
        useOriginal: body.useOriginal,
        isHidden: body.isHidden,
        lektion: body.lektion,
        eindeutigeBezeichnung: body.eindeutigeBezeichnung,
        aufgaben: body.aufgaben,
        vorwissen: body.vorwissen,
        material: body.material,
        websiteTools: body.websiteTools,
        einstieg: body.einstieg,
        hauptteil: body.hauptteil,
        abschluss: body.abschluss,
        stolpersteine: body.stolpersteine,
        sortOrder: body.sortOrder,
      },
      auth.userId,
      auth.teacherName
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/school-lektionen/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update school lektion override" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/school-lektionen/[id]
 * Löscht ein Override und stellt damit das Original für die Schule wieder her.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    await deleteSchoolLektionOverride(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/school-lektionen/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete school lektion override" },
      { status: 500 }
    );
  }
}
