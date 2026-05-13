import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { UserRole } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type AuthorizedCaller = {
  callerId: string;
  callerRole: UserRole;
  callerSchuleId: string;
};

/**
 * Validiert das Bearer-Token und stellt sicher, dass der Aufrufer Super-Admin
 * oder PICTS-Admin ist.
 */
async function authorizeAdmin(
  request: NextRequest
): Promise<AuthorizedCaller | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized - Missing token" },
      { status: 401 }
    );
  }
  const token = authHeader.substring(7);
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const callerId = decoded.uid;

  const adminDb = getAdminDb();
  const callerDoc = await adminDb.collection("teachers").doc(callerId).get();
  if (!callerDoc.exists) {
    return NextResponse.json(
      { error: "Teacher profile not found" },
      { status: 404 }
    );
  }
  const callerData = callerDoc.data()!;
  const callerRole: UserRole = callerData.role || "teacher";

  if (callerRole !== "super_admin" && callerRole !== "picts_admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  return {
    callerId,
    callerRole,
    callerSchuleId: callerData.schuleId || "",
  };
}

/**
 * PUT /api/admin/users/[id]
 * Aktualisiert die Rolle eines Benutzers.
 * - Super-Admin: kann jede Rolle setzen (auch super_admin)
 * - PICTS-Admin: nur Benutzer der eigenen Schule, nur Rollen
 *   `teacher` oder `picts_admin`. Bestehende Super-Admins darf er nicht
 *   verändern.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: targetUserId } = await params;
    const body = await request.json();
    const { role } = body as { role: UserRole };

    const validRoles: UserRole[] = ["teacher", "picts_admin", "super_admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const targetUserDoc = await adminDb
      .collection("teachers")
      .doc(targetUserId)
      .get();
    if (!targetUserDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const targetUser = targetUserDoc.data()!;
    const targetRole: UserRole = targetUser.role || "teacher";
    const targetSchuleId = targetUser.schuleId || "";

    // Selbst-Demotion durch Super-Admin verhindern
    if (targetUserId === auth.callerId && role !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot demote yourself" },
        { status: 400 }
      );
    }

    // Einschränkungen für PICTS-Admin
    if (auth.callerRole === "picts_admin") {
      if (targetSchuleId !== auth.callerSchuleId) {
        return NextResponse.json(
          { error: "Forbidden – Benutzer gehört nicht zu Ihrer Schule" },
          { status: 403 }
        );
      }
      if (targetRole === "super_admin") {
        return NextResponse.json(
          { error: "Forbidden – Super-Admins können Sie nicht bearbeiten" },
          { status: 403 }
        );
      }
      if (role === "super_admin") {
        return NextResponse.json(
          { error: "Forbidden – Super-Admin-Rolle kann nur durch Super-Admin vergeben werden" },
          { status: 403 }
        );
      }
    }

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
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Löscht einen Benutzer (Firestore-Profil + Firebase Auth Account).
 * - Super-Admin: jeden Benutzer (ausser sich selbst)
 * - PICTS-Admin: nur Benutzer der eigenen Schule, keine Super-Admins
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: targetUserId } = await params;

    if (targetUserId === auth.callerId) {
      return NextResponse.json(
        { error: "You cannot delete yourself" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const targetUserDoc = await adminDb
      .collection("teachers")
      .doc(targetUserId)
      .get();
    if (!targetUserDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const targetUser = targetUserDoc.data()!;
    const targetRole: UserRole = targetUser.role || "teacher";
    const targetSchuleId = targetUser.schuleId || "";

    // Einschränkungen für PICTS-Admin
    if (auth.callerRole === "picts_admin") {
      if (targetSchuleId !== auth.callerSchuleId) {
        return NextResponse.json(
          { error: "Forbidden – Benutzer gehört nicht zu Ihrer Schule" },
          { status: 403 }
        );
      }
      if (targetRole === "super_admin") {
        return NextResponse.json(
          { error: "Forbidden – Super-Admins können nicht gelöscht werden" },
          { status: 403 }
        );
      }
    }

    // Firestore-Profil löschen
    await adminDb.collection("teachers").doc(targetUserId).delete();

    // Firebase Auth Account löschen (falls noch vorhanden)
    try {
      await getAdminAuth().deleteUser(targetUserId);
    } catch (err: any) {
      if (err?.code !== "auth/user-not-found") {
        console.error("Error deleting auth user:", err);
        // Firestore wurde schon gelöscht – Auth-Fehler nur loggen,
        // nicht die ganze Operation fehlschlagen lassen.
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Benutzer ${targetUser.name || targetUser.email} wurde gelöscht`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/[id]
 * Holt Benutzer-Details.
 * - Super-Admin: jeden
 * - PICTS-Admin: nur Benutzer der eigenen Schule
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: targetUserId } = await params;

    const adminDb = getAdminDb();
    const targetUserDoc = await adminDb
      .collection("teachers")
      .doc(targetUserId)
      .get();
    if (!targetUserDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const targetUser = targetUserDoc.data()!;

    if (
      auth.callerRole === "picts_admin" &&
      targetUser.schuleId !== auth.callerSchuleId
    ) {
      return NextResponse.json(
        { error: "Forbidden – Benutzer gehört nicht zu Ihrer Schule" },
        { status: 403 }
      );
    }

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
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
