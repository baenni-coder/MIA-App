import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { canManageSchoolJahresplan } from "@/lib/firestore/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/schools/[id]
 * Aktualisiert eine Schule.
 * - Super-Admin: jede Schule
 * - PICTS-Admin: nur die eigene Schule
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: schoolId } = await params;

    // Authentifizierung prüfen
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    // Super-Admin oder PICTS-Admin dieser Schule
    const canManage = await canManageSchoolJahresplan(userId, schoolId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden – nicht berechtigt für diese Schule" },
        { status: 403 }
      );
    }

    // Parse Request Body
    const body = await request.json();
    const { name, ort, pictsBuchen } = body;

    // Prüfe ob Schule existiert
    const schoolDoc = await adminDb.collection("system_schulen").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Update Schule
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updates.name = name;
    if (ort !== undefined) updates.ort = ort;
    if (pictsBuchen !== undefined) updates.pictsBuchen = pictsBuchen;

    await adminDb.collection("system_schulen").doc(schoolId).update(updates);

    return NextResponse.json(
      {
        success: true,
        message: "Schule erfolgreich aktualisiert",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/admin/schools/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update school" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/schools/[id]
 * Löscht eine Schule (nur Super-Admin, nur wenn keine User zugeordnet)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: schoolId } = await params;

    // Authentifizierung prüfen
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Prüfe Super-Admin-Status
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const currentUser = teacherDoc.data()!;
    if (currentUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    // Prüfe ob noch User zur Schule gehören
    const usersSnapshot = await adminDb
      .collection("teachers")
      .where("schuleId", "==", schoolId)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return NextResponse.json(
        { error: "Schule kann nicht gelöscht werden, da noch Benutzer zugeordnet sind" },
        { status: 400 }
      );
    }

    // Lösche Schule
    await adminDb.collection("system_schulen").doc(schoolId).delete();

    return NextResponse.json(
      {
        success: true,
        message: "Schule erfolgreich gelöscht",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/admin/schools/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete school" },
      { status: 500 }
    );
  }
}
