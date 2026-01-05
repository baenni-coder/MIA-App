import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getPendingRequestForTeacher,
  cancelSchoolChangeRequest,
} from "@/lib/firestore/school-change-requests";

/**
 * GET /api/school-change-request
 * Holt die offene Schulwechsel-Anfrage des aktuellen Users (falls vorhanden)
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

    const pendingRequest = await getPendingRequestForTeacher(userId);

    return NextResponse.json(
      { request: pendingRequest },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/school-change-request:", error);

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
 * DELETE /api/school-change-request
 * Storniert die eigene offene Schulwechsel-Anfrage
 *
 * Query Parameter:
 * - requestId: ID der Anfrage
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 }
      );
    }

    await cancelSchoolChangeRequest(requestId, userId);

    return NextResponse.json(
      { success: true, message: "Schulwechsel-Anfrage wurde storniert" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/school-change-request:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: (error as Error).message || "Failed to cancel request" },
      { status: 500 }
    );
  }
}
