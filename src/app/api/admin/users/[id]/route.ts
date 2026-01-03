import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { UserRole } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/users/[id]
 * Aktualisiert Benutzer-Rolle (nur Super-Admin)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;

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

    // Parse Request Body
    const body = await request.json();
    const { role } = body;

    // Validierung
    const validRoles: UserRole[] = ["teacher", "picts_admin", "super_admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Hole Ziel-Benutzer
    const targetUserDoc = await adminDb.collection("teachers").doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetUser = targetUserDoc.data()!;

    // Verhindere, dass man sich selbst die Rechte entzieht
    if (targetUserId === userId && role !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot demote yourself" },
        { status: 400 }
      );
    }

    // Update Rolle
    await adminDb.collection("teachers").doc(targetUserId).update({
      role,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Rolle für ${targetUser.name || targetUser.email} wurde zu "${role}" geändert`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/admin/users/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/[id]
 * Holt Benutzer-Details (nur Super-Admin)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;

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

    // Hole Ziel-Benutzer
    const targetUserDoc = await adminDb.collection("teachers").doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetUser = targetUserDoc.data()!;

    return NextResponse.json(
      {
        id: targetUserId,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role || "teacher",
        stufe: targetUser.stufe,
        schuleId: targetUser.schuleId,
        createdAt: targetUser.createdAt?.toDate?.() || targetUser.createdAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
