import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getTeacherProfile,
  canManageSchoolJahresplan,
} from "@/lib/firestore/permissions";
import { JahresplanMode } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/schools/[id]/jahresplan-mode
 * Liest den aktuellen Modus der Schule (open | curated).
 * Default: "open" (Abwärtskompatibilität).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: schoolId } = await params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    await getAdminAuth().verifyIdToken(token);

    const adminDb = getAdminDb();
    const doc = await adminDb.collection("system_schulen").doc(schoolId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    const data = doc.data() || {};
    const mode: JahresplanMode =
      data.jahresplanMode === "curated" ? "curated" : "open";
    return NextResponse.json({ schuleId: schoolId, mode });
  } catch (error) {
    console.error("Error in GET jahresplan-mode:", error);
    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch mode" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/schools/[id]/jahresplan-mode
 * Body: { mode: "open" | "curated" }
 * Nur PICTS-Admin der Schule oder Super-Admin.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: schoolId } = await params;

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

    const canManage = await canManageSchoolJahresplan(userId, schoolId);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const mode: unknown = body.mode;
    if (mode !== "open" && mode !== "curated") {
      return NextResponse.json(
        { error: "mode must be 'open' or 'curated'" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const schoolRef = adminDb.collection("system_schulen").doc(schoolId);
    const snap = await schoolRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    await schoolRef.update({
      jahresplanMode: mode,
      updatedAt: new Date(),
      jahresplanModeChangedBy: userId,
      jahresplanModeChangedByName: teacher.name,
      jahresplanModeChangedAt: new Date(),
    });

    return NextResponse.json({ success: true, mode });
  } catch (error) {
    console.error("Error in PUT jahresplan-mode:", error);
    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update mode" },
      { status: 500 }
    );
  }
}
