import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getCustomThemeById,
  updateCustomTheme,
  deleteCustomTheme,
} from "@/lib/firestore/custom-themes";
import {
  canReadCustomTheme,
  canEditCustomTheme,
  canDeleteCustomTheme,
} from "@/lib/firestore/permissions";
import { notifyThemeSubmitted } from "@/lib/firestore/notifications";
import { getTeacherProfile } from "@/lib/firestore/permissions";

/**
 * GET /api/custom-themes/[id]
 * Lädt ein einzelnes Custom Theme
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const themeId = params.id;

    // Theme laden (mit aufgelösten Kompetenzen)
    const resolveKompetenzen =
      request.nextUrl.searchParams.get("resolveKompetenzen") === "true";
    const theme = await getCustomThemeById(themeId, resolveKompetenzen);

    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    // Berechtigung prüfen
    const canRead = await canReadCustomTheme(userId, theme);
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ theme }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/custom-themes/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch custom theme" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/custom-themes/[id]
 * Aktualisiert ein Custom Theme
 *
 * Body: Alle Felder von CustomTheme (außer id, createdAt, createdBy)
 * - submitForReview?: boolean (ändert Status zu "pending_review")
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const themeId = params.id;

    // Theme laden
    const theme = await getCustomThemeById(themeId);
    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    // Berechtigung prüfen
    const canEdit = await canEditCustomTheme(userId, theme);
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Request Body
    const body = await request.json();
    const { submitForReview, ...updates } = body;

    // Wenn submitForReview = true, ändere Status
    if (submitForReview && theme.createdBy === userId) {
      updates.status = "pending_review";
    }

    // Aktualisiere Theme
    await updateCustomTheme(themeId, updates);

    // Bei Submission: Benachrichtige PICTS-Admins
    if (submitForReview && theme.createdBy === userId) {
      try {
        const teacher = await getTeacherProfile(userId);
        if (teacher) {
          await notifyThemeSubmitted(
            themeId,
            updates.thema || theme.thema,
            userId,
            teacher.name,
            teacher.email,
            teacher.schuleId
          );
        }
      } catch (notifyError) {
        console.error("Error sending notifications:", notifyError);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/custom-themes/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update custom theme" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/custom-themes/[id]
 * Löscht ein Custom Theme
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const themeId = params.id;

    // Theme laden
    const theme = await getCustomThemeById(themeId);
    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    // Berechtigung prüfen
    const canDelete = await canDeleteCustomTheme(userId, theme);
    if (!canDelete) {
      return NextResponse.json(
        {
          error:
            "Forbidden - Only draft themes can be deleted by their creator",
        },
        { status: 403 }
      );
    }

    // Lösche Theme (Lektionen werden in einem späteren Schritt gelöscht)
    await deleteCustomTheme(themeId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/custom-themes/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete custom theme" },
      { status: 500 }
    );
  }
}
