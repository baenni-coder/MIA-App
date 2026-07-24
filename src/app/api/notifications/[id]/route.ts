import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { markNotificationAsRead } from "@/lib/firestore/notifications";

/**
 * PUT /api/notifications/[id]
 * Markiert eine Notification als gelesen
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const notificationId = id;

    // Markiere als gelesen (nur wenn die Notification dem User gehört)
    await markNotificationAsRead(notificationId, userId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/notifications/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Notification not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
