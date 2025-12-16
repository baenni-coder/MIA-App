import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";

/**
 * GET /api/auth/check-admin
 * Prüft ob der aktuelle User Admin-Rechte hat
 */
export async function GET(request: NextRequest) {
  try {
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

    // Hole Profil
    const profile = await getTeacherProfile(userId);
    if (!profile) {
      return NextResponse.json(
        { isAdmin: false, role: null },
        { status: 200 }
      );
    }

    const isAdmin =
      profile.role === "picts_admin" || profile.role === "super_admin";

    return NextResponse.json(
      {
        isAdmin,
        role: profile.role,
        schuleId: profile.schuleId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking admin status:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}
