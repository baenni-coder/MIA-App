import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isSuperAdmin } from "@/lib/firestore/permissions";
import {
  getSchoolChangeRequest,
  approveSchoolChangeRequest,
  rejectSchoolChangeRequest,
} from "@/lib/firestore/school-change-requests";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/school-change-requests/[id]
 * Holt eine einzelne Schulwechsel-Anfrage
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: requestId } = await params;

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

    const changeRequest = await getSchoolChangeRequest(requestId);
    if (!changeRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: changeRequest }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/admin/school-change-requests/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch school change request" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/school-change-requests/[id]
 * Genehmigt oder lehnt eine Schulwechsel-Anfrage ab
 *
 * Body:
 * - action: "approve" | "reject"
 * - reviewNotes: Optional - Begründung bei Ablehnung
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: requestId } = await params;

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

    // Hole Admin-Namen
    const adminDb = getAdminDb();
    const adminDoc = await adminDb.collection("teachers").doc(userId).get();
    const adminName = adminDoc.exists
      ? adminDoc.data()?.name || "Super Admin"
      : "Super Admin";

    // Parse Request Body
    const body = await request.json();
    const { action, reviewNotes } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Hole die Anfrage für die Notification
    const changeRequest = await getSchoolChangeRequest(requestId);
    if (!changeRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      await approveSchoolChangeRequest(requestId, userId, adminName);
      return NextResponse.json(
        {
          success: true,
          message: `Schulwechsel für ${changeRequest.teacherName} wurde genehmigt`,
        },
        { status: 200 }
      );
    } else {
      if (!reviewNotes) {
        return NextResponse.json(
          { error: "Review notes are required when rejecting" },
          { status: 400 }
        );
      }
      await rejectSchoolChangeRequest(requestId, userId, adminName, reviewNotes);
      return NextResponse.json(
        {
          success: true,
          message: `Schulwechsel für ${changeRequest.teacherName} wurde abgelehnt`,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error in PUT /api/admin/school-change-requests/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: (error as Error).message || "Failed to process request" },
      { status: 500 }
    );
  }
}
