import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getTeacherProfile,
  canManageSchoolJahresplan,
} from "@/lib/firestore/permissions";
import {
  getSchoolLektionOverrides,
  createSchoolLektionOverride,
} from "@/lib/firestore/school-lektionen";
import { SchoolJahresplanSourceType } from "@/types";

function isValidSourceType(v: unknown): v is SchoolJahresplanSourceType {
  return v === "system" || v === "custom";
}

/**
 * GET /api/school-lektionen?schuleId=...&sourceType=...&sourceThemeId=...
 * Lädt alle Lektions-Overrides einer Schule für ein Pool-Thema.
 * Lesbar für jeden authentifizierten User (Lehrpersonen sehen die Anpassungen
 * ihrer Schule; die Zuordnung erfolgt über die Query-Parameter).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    try {
      await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schuleId = searchParams.get("schuleId");
    const sourceType = searchParams.get("sourceType");
    const sourceThemeId = searchParams.get("sourceThemeId");

    if (!schuleId || !sourceThemeId || !isValidSourceType(sourceType)) {
      return NextResponse.json(
        { error: "schuleId, sourceType (system|custom) und sourceThemeId erforderlich" },
        { status: 400 }
      );
    }

    const overrides = await getSchoolLektionOverrides(
      schuleId,
      sourceType,
      sourceThemeId
    );
    return NextResponse.json({ overrides });
  } catch (error) {
    console.error("Error in GET /api/school-lektionen:", error);
    return NextResponse.json(
      { error: "Failed to load school lektion overrides" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school-lektionen
 * Erstellt ein neues Lektions-Override (Anpassung einer Original-Lektion
 * oder komplett neue schuleigene Lektion). Nur Super-Admin / PICTS-Admin
 * der Schule.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    let userId: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { schuleId, sourceType, sourceThemeId } = body;

    if (!schuleId || !sourceThemeId || !isValidSourceType(sourceType)) {
      return NextResponse.json(
        { error: "schuleId, sourceType (system|custom) und sourceThemeId erforderlich" },
        { status: 400 }
      );
    }
    if (!body.lektion || typeof body.lektion !== "string") {
      return NextResponse.json(
        { error: "lektion (Anzeigename) erforderlich" },
        { status: 400 }
      );
    }

    const canManage = await canManageSchoolJahresplan(userId, schuleId);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const teacher = await getTeacherProfile(userId);

    const id = await createSchoolLektionOverride({
      schuleId,
      sourceType,
      sourceThemeId,
      originalLektionId: body.originalLektionId,
      originalLektionKey: body.originalLektionKey,
      useOriginal: body.useOriginal,
      isHidden: body.isHidden,
      lektion: body.lektion,
      eindeutigeBezeichnung: body.eindeutigeBezeichnung,
      aufgaben: body.aufgaben,
      vorwissen: body.vorwissen,
      material: Array.isArray(body.material) ? body.material : undefined,
      websiteTools: Array.isArray(body.websiteTools) ? body.websiteTools : undefined,
      einstieg: body.einstieg,
      hauptteil: body.hauptteil,
      abschluss: body.abschluss,
      stolpersteine: body.stolpersteine,
      sortOrder: body.sortOrder,
      createdBy: userId,
      createdByName: teacher?.name || "Unbekannt",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/school-lektionen:", error);
    return NextResponse.json(
      { error: "Failed to create school lektion override" },
      { status: 500 }
    );
  }
}
