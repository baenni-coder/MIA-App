import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getCustomThemeById,
  updateCustomTheme,
  deleteCustomTheme,
} from "@/lib/firestore/custom-themes";
import {
  deleteCustomLektionenByThemeId,
  createMultipleCustomLektionen,
} from "@/lib/firestore/custom-lektionen";
import {
  canReadCustomTheme,
  canEditCustomTheme,
  canDeleteCustomTheme,
} from "@/lib/firestore/permissions";
import { notifyThemeSubmitted } from "@/lib/firestore/notifications";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { WebsiteTool } from "@/types";

// Interface für Lektionen aus dem Request Body
interface LektionInput {
  lektion: string;
  eindeutigeBezeichnung: string;
  aufgaben?: string;
  vorwissen?: string;
  material?: string[];
  websiteTools?: WebsiteTool[];
  einstieg?: string;
  hauptteil?: string;
  abschluss?: string;
  stolpersteine?: string;
  kiZusammenfassung?: string;
  order: number;
}

/**
 * GET /api/custom-themes/[id]
 * Lädt ein einzelnes Custom Theme
 */
export async function GET(
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

    // Berechtigung prüfen
    const canEdit = await canEditCustomTheme(userId, theme);
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Request Body
    const body = await request.json();
    const { submitForReview, lektionen, ...updates } = body as {
      submitForReview?: boolean;
      lektionen?: LektionInput[];
      [key: string]: any;
    };

    // Wenn submitForReview = true, ändere Status
    if (submitForReview && theme.createdBy === userId) {
      updates.status = "pending_review";
    }

    // Berechne tatsächliche Anzahl Lektionen
    if (lektionen && lektionen.length > 0) {
      updates.anzahlLektionen = lektionen.length;
    }

    // Aktualisiere Theme
    await updateCustomTheme(themeId, updates);

    // Lektionen aktualisieren (wenn vorhanden)
    // Strategie: Alle alten Lektionen löschen und neue erstellen
    if (lektionen !== undefined) {
      try {
        // Lösche alle vorhandenen Lektionen für dieses Theme
        await deleteCustomLektionenByThemeId(themeId);

        // Erstelle neue Lektionen
        if (lektionen.length > 0) {
          const lektionenToCreate = lektionen.map((lektion) => ({
            themeId,
            lektion: lektion.lektion,
            eindeutigeBezeichnung: lektion.eindeutigeBezeichnung,
            aufgaben: lektion.aufgaben,
            vorwissen: lektion.vorwissen,
            material: lektion.material || [],
            websiteTools: lektion.websiteTools || [],
            einstieg: lektion.einstieg,
            hauptteil: lektion.hauptteil,
            abschluss: lektion.abschluss,
            stolpersteine: lektion.stolpersteine,
            kiZusammenfassung: lektion.kiZusammenfassung,
            createdBy: userId,
            order: lektion.order,
          }));

          await createMultipleCustomLektionen(lektionenToCreate);
          console.log(`Updated ${lektionen.length} lektionen for theme ${themeId}`);
        }
      } catch (lektionenError) {
        console.error("Error updating lektionen:", lektionenError);
        // Fehler beim Aktualisieren der Lektionen soll Theme-Update nicht blockieren
      }
    }

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
