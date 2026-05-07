import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getAssignmentById,
  updateAssignment,
  deactivateAssignment,
} from "@/lib/firestore/school-jahresplan";
import {
  getTeacherProfile,
  canManageSchoolJahresplan,
} from "@/lib/firestore/permissions";
import { Stufe, Zeitraum, Fachbereich, FACHBEREICHE } from "@/types";

const ALLOWED_FACHBEREICHE = new Set<Fachbereich>(
  FACHBEREICHE.map((f) => f.value)
);

const ALLOWED_ZEITRAUM: Zeitraum[] = [
  "Sommerferien-Herbstferien",
  "Herbstferien-Weihnachtsferien",
  "Weihnachtsferien-Winterferien",
  "Winterferien-Frühlingsferien",
  "Frühlingsferien-Sommerferien",
  "Zusatz",
];

const ALLOWED_STUFEN: Stufe[] = [
  "KiGa",
  "1. Klasse",
  "2. Klasse",
  "3. Klasse",
  "4. Klasse",
  "5. Klasse",
  "6. Klasse",
  "7. Klasse",
  "8. Klasse",
  "9. Klasse",
];

async function authorize(
  request: NextRequest,
  id: string
): Promise<
  | { ok: true; userId: string; teacherName: string; schuleId: string }
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
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }
  const userId = decoded.uid;

  const assignment = await getAssignmentById(id);
  if (!assignment) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  const canManage = await canManageSchoolJahresplan(userId, assignment.schuleId);
  if (!canManage) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const teacher = await getTeacherProfile(userId);
  return {
    ok: true,
    userId,
    teacherName: teacher?.name || "Unbekannt",
    schuleId: assignment.schuleId,
  };
}

/**
 * PUT /api/school-jahresplan/[id]
 * Aktualisiert Overrides und schulspezifische Ergänzungen.
 * Null-Werte entfernen das jeweilige Feld (Reset auf Original).
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

    // Validierung: Zeitraum und Stufen müssen zum Enum passen
    if (
      body.zeitraumOverride != null &&
      !ALLOWED_ZEITRAUM.includes(body.zeitraumOverride)
    ) {
      return NextResponse.json(
        { error: "Invalid zeitraumOverride" },
        { status: 400 }
      );
    }
    if (body.stufeOverride != null) {
      if (!Array.isArray(body.stufeOverride)) {
        return NextResponse.json(
          { error: "stufeOverride must be an array" },
          { status: 400 }
        );
      }
      for (const s of body.stufeOverride) {
        if (!ALLOWED_STUFEN.includes(s)) {
          return NextResponse.json(
            { error: `Invalid stufe: ${s}` },
            { status: 400 }
          );
        }
      }
    }
    if (
      body.anzahlLektionenOverride != null &&
      (typeof body.anzahlLektionenOverride !== "number" ||
        body.anzahlLektionenOverride < 0)
    ) {
      return NextResponse.json(
        { error: "anzahlLektionenOverride must be a positive number" },
        { status: 400 }
      );
    }
    if (body.empfohleneIntegrationsfaecherOverride != null) {
      if (!Array.isArray(body.empfohleneIntegrationsfaecherOverride)) {
        return NextResponse.json(
          { error: "empfohleneIntegrationsfaecherOverride must be an array" },
          { status: 400 }
        );
      }
      for (const f of body.empfohleneIntegrationsfaecherOverride) {
        if (!ALLOWED_FACHBEREICHE.has(f)) {
          return NextResponse.json(
            { error: `Invalid Fachbereich: ${f}` },
            { status: 400 }
          );
        }
      }
    }

    await updateAssignment(
      id,
      {
        zeitraumOverride: body.zeitraumOverride,
        stufeOverride: body.stufeOverride,
        themaOverride: body.themaOverride,
        beschreibungOverride: body.beschreibungOverride,
        lehrmittelOverride: body.lehrmittelOverride,
        bildLehrmittelOverride: body.bildLehrmittelOverride,
        anzahlLektionenOverride: body.anzahlLektionenOverride,
        fileRougeOverride: body.fileRougeOverride,
        unterlagenOverride: body.unterlagenOverride,
        empfohleneIntegrationsfaecherOverride:
          body.empfohleneIntegrationsfaecherOverride,
        schulMaterialien: body.schulMaterialien,
        schulNotizen: body.schulNotizen,
        schulUnterlagen: body.schulUnterlagen,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
      auth.userId,
      auth.teacherName
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/school-jahresplan/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/school-jahresplan/[id]
 * Soft-Delete: setzt isActive=false (Overrides bleiben erhalten).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    await deactivateAssignment(id, auth.userId, auth.teacherName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/school-jahresplan/[id]:", error);
    return NextResponse.json(
      { error: "Failed to remove assignment" },
      { status: 500 }
    );
  }
}
