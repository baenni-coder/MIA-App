import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getAssignmentsBySchule,
  upsertAssignment,
  bulkUpsertAssignments,
} from "@/lib/firestore/school-jahresplan";
import {
  getTeacherProfile,
  canManageSchoolJahresplan,
} from "@/lib/firestore/permissions";
import { SchoolJahresplanSourceType } from "@/types";

/**
 * GET /api/school-jahresplan?schuleId=...&includeInactive=true
 *
 * Lädt alle Zuordnungen einer Schule. Ohne schuleId wird die Schule
 * des eingeloggten Users genommen (für PICTS-Admins). Super-Admins
 * müssen schuleId explizit angeben.
 *
 * Lesen ist für alle Authentifizierten erlaubt, damit Lehrpersonen
 * den kuratierten Jahresplan sehen können. Sensitive Metadaten
 * (assignedBy etc.) bleiben unkritisch.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await getAdminAuth().verifyIdToken(token);
    const userId = decoded.uid;

    const searchParams = request.nextUrl.searchParams;
    let schuleId = searchParams.get("schuleId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Default: Schule des eingeloggten Users
    if (!schuleId) {
      const teacher = await getTeacherProfile(userId);
      if (!teacher?.schuleId) {
        return NextResponse.json(
          { error: "schuleId required" },
          { status: 400 }
        );
      }
      schuleId = teacher.schuleId;
    }

    // includeInactive darf nur ein Admin sehen
    if (includeInactive) {
      const canManage = await canManageSchoolJahresplan(userId, schuleId);
      if (!canManage) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const assignments = await getAssignmentsBySchule(schuleId, {
      includeInactive,
    });

    return NextResponse.json({ assignments, schuleId });
  } catch (error) {
    console.error("Error in GET /api/school-jahresplan:", error);
    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school-jahresplan
 *
 * Einzel- oder Bulk-Zuordnung von Themen zum schulinternen Jahresplan.
 *
 * Body (einzeln):
 *   { schuleId, sourceThemeId, sourceType }
 *
 * Body (bulk):
 *   { schuleId, themes: [{ sourceThemeId, sourceType }, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await getAdminAuth().verifyIdToken(token);
    const userId = decoded.uid;

    const teacher = await getTeacherProfile(userId);
    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const schuleId: string | undefined = body.schuleId;
    if (!schuleId) {
      return NextResponse.json({ error: "schuleId required" }, { status: 400 });
    }

    const canManage = await canManageSchoolJahresplan(userId, schuleId);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Bulk-Mode
    if (Array.isArray(body.themes)) {
      const themes = body.themes as Array<{
        sourceThemeId: string;
        sourceType: SchoolJahresplanSourceType;
      }>;
      // Validierung
      for (const t of themes) {
        if (
          !t.sourceThemeId ||
          (t.sourceType !== "system" && t.sourceType !== "custom")
        ) {
          return NextResponse.json(
            { error: "Invalid theme entry in bulk payload" },
            { status: 400 }
          );
        }
      }
      const result = await bulkUpsertAssignments(
        schuleId,
        themes,
        userId,
        teacher.name
      );
      return NextResponse.json({ success: true, ...result });
    }

    // Einzel-Mode
    const sourceThemeId: string = body.sourceThemeId;
    const sourceType: SchoolJahresplanSourceType = body.sourceType;
    if (!sourceThemeId || (sourceType !== "system" && sourceType !== "custom")) {
      return NextResponse.json(
        { error: "sourceThemeId and valid sourceType required" },
        { status: 400 }
      );
    }

    const id = await upsertAssignment({
      schuleId,
      sourceThemeId,
      sourceType,
      assignedBy: userId,
      assignedByName: teacher.name,
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/school-jahresplan:", error);
    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
