import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getCustomThemeById,
  updateThemeStatus,
} from "@/lib/firestore/custom-themes";
import { canReviewCustomTheme } from "@/lib/firestore/permissions";
import {
  notifyThemeApproved,
  notifyThemeRejected,
} from "@/lib/firestore/notifications";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { ThemeStatus } from "@/types";

/**
 * PUT /api/custom-themes/[id]/review
 * Reviewt ein Custom Theme (Approve/Reject)
 *
 * Body:
 * - action: "approve" | "reject" (required)
 * - reviewNotes?: string (required für reject)
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
    const themeId = id;

    // Theme laden
    const theme = await getCustomThemeById(themeId);
    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    // Berechtigung prüfen (muss PICTS-Admin der Schule sein)
    const canReview = await canReviewCustomTheme(userId, theme.schuleId);
    if (!canReview) {
      return NextResponse.json(
        {
          error:
            "Forbidden - Only PICTS admins of this school can review themes",
        },
        { status: 403 }
      );
    }

    // Request Body
    const body = await request.json();
    const { action, reviewNotes } = body;

    // Validierung
    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (action === "reject" && !reviewNotes) {
      return NextResponse.json(
        { error: "reviewNotes is required for rejection" },
        { status: 400 }
      );
    }

    // Admin-Profil laden
    const admin = await getTeacherProfile(userId);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin profile not found" },
        { status: 404 }
      );
    }

    // Status bestimmen
    const newStatus: ThemeStatus =
      action === "approve" ? "approved" : "rejected";

    // Theme-Status aktualisieren
    await updateThemeStatus(
      themeId,
      newStatus,
      userId,
      admin.name,
      reviewNotes
    );

    // Benachrichtigungen senden
    if (action === "approve") {
      await notifyThemeApproved(
        themeId,
        theme.thema,
        theme.createdBy,
        admin.name,
        theme.schuleId
      );
    } else {
      await notifyThemeRejected(
        themeId,
        theme.thema,
        theme.createdBy,
        admin.name,
        reviewNotes,
        theme.schuleId
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: newStatus,
        message:
          action === "approve"
            ? "Theme approved successfully"
            : "Theme rejected successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/custom-themes/[id]/review:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to review theme" },
      { status: 500 }
    );
  }
}
