import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getTeacherProfile,
  canManageSchoolJahresplan,
} from "@/lib/firestore/permissions";
import { bulkUpsertAssignments } from "@/lib/firestore/school-jahresplan";
import { getThemes } from "@/lib/data-sources/themes-adapter";
import { getCustomThemes } from "@/lib/firestore/custom-themes";

/**
 * POST /api/school-jahresplan/initial-populate
 * Body: { schuleId }
 *
 * Ordnet alle aktuell verfügbaren Pool-Themen (System-Themen + approved Custom Themes)
 * der angegebenen Schule zu. Bereits vorhandene aktive Zuordnungen bleiben unangetastet,
 * inaktive werden reaktiviert. Dient als Ein-Klick-Bootstrapping beim Wechsel auf
 * den curated Modus.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Lade Pool in beide Richtungen parallel
    const [systemThemes, approvedCustomThemes] = await Promise.all([
      getThemes(),
      getCustomThemes({ isSystemWide: true }),
    ]);

    const themesPayload: Array<{
      sourceThemeId: string;
      sourceType: "system" | "custom";
    }> = [];

    for (const st of systemThemes) {
      if (!st.id) continue;
      themesPayload.push({ sourceThemeId: st.id, sourceType: "system" });
    }
    for (const ct of approvedCustomThemes) {
      if (!ct.id) continue;
      themesPayload.push({ sourceThemeId: ct.id, sourceType: "custom" });
    }

    const result = await bulkUpsertAssignments(
      schuleId,
      themesPayload,
      userId,
      teacher.name
    );

    return NextResponse.json({
      success: true,
      total: themesPayload.length,
      ...result,
    });
  } catch (error) {
    console.error("Error in POST /api/school-jahresplan/initial-populate:", error);
    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to populate assignments" },
      { status: 500 }
    );
  }
}
