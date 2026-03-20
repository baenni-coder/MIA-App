import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getNotificationsByRecipient,
  getUnreadCount,
} from "@/lib/firestore/notifications";

/**
 * GET /api/notifications
 * Lädt Notifications für den aktuellen User
 *
 * Query Parameters:
 * - unreadOnly?: "true" | "false" (default: false)
 * - limit?: number (default: 50)
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

    // Query-Parameter
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Lade Notifications
    const notifications = await getNotificationsByRecipient(userId, {
      unreadOnly,
      limit,
    });

    // Lade auch unread count
    const unreadCount = await getUnreadCount(userId);

    return NextResponse.json(
      {
        notifications,
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/notifications:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

