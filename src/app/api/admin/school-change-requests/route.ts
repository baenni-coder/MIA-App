import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isSuperAdmin } from "@/lib/firestore/permissions";
import {
  getAllSchoolChangeRequests,
  countPendingSchoolChangeRequests,
} from "@/lib/firestore/school-change-requests";
import { SchoolChangeStatus } from "@/types";

/**
 * GET /api/admin/school-change-requests
 * Holt alle Schulwechsel-Anfragen (nur für Super-Admins)
 *
 * Query Parameters:
 * - status: Optional - Filter nach Status ("pending", "approved", "rejected")
 * - countOnly: Optional - Nur Anzahl zurückgeben (für Badge)
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

    // Prüfe Super-Admin Berechtigung
    const isAdmin = await isSuperAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as SchoolChangeStatus | null;
    const countOnly = searchParams.get("countOnly") === "true";

    // Nur Anzahl zurückgeben (für Badge)
    if (countOnly) {
      const count = await countPendingSchoolChangeRequests();
      return NextResponse.json({ count }, { status: 200 });
    }

    // Alle Anfragen holen (optional gefiltert)
    const requests = await getAllSchoolChangeRequests(status || undefined);

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/admin/school-change-requests:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch school change requests" },
      { status: 500 }
    );
  }
}
