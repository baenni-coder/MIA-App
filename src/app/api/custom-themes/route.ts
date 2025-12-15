import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  createCustomTheme,
  getCustomThemes,
  getCustomThemesByStufe,
} from "@/lib/firestore/custom-themes";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import { notifyThemeSubmitted } from "@/lib/firestore/notifications";
import { ThemeStatus, Stufe, Zeitraum } from "@/types";

/**
 * GET /api/custom-themes
 * Lädt Custom Themes mit optionalen Filtern
 *
 * Query Parameters:
 * - userId: Nur Themen dieses Users
 * - schuleId: Nur Themen dieser Schule
 * - status: Filter nach Status (draft, pending_review, approved, rejected)
 * - stufe: Filter nach Klassenstufe
 * - isSystemWide: Nur systemweite (true) oder nicht-systemweite (false)
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
    const filterUserId = searchParams.get("userId");
    const schuleId = searchParams.get("schuleId");
    const statusParam = searchParams.get("status");
    const stufe = searchParams.get("stufe") as Stufe | null;
    const isSystemWideParam = searchParams.get("isSystemWide");

    // Wenn stufe angegeben ist, verwende spezielle Funktion
    if (stufe) {
      const includeOwnDrafts = searchParams.get("includeOwnDrafts") === "true";
      const themes = await getCustomThemesByStufe(stufe, {
        includeOwnDrafts,
        userId,
      });
      return NextResponse.json({ themes }, { status: 200 });
    }

    // Baue Filter
    const filters: any = {};
    if (filterUserId) filters.createdBy = filterUserId;
    if (schuleId) filters.schuleId = schuleId;
    if (statusParam) {
      // Unterstützt mehrere Stati: ?status=draft,pending_review
      const statuses = statusParam.split(",") as ThemeStatus[];
      filters.status = statuses.length === 1 ? statuses[0] : statuses;
    }
    if (isSystemWideParam !== null) {
      filters.isSystemWide = isSystemWideParam === "true";
    }

    const themes = await getCustomThemes(filters);

    return NextResponse.json({ themes }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/custom-themes:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch custom themes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/custom-themes
 * Erstellt ein neues Custom Theme
 *
 * Body:
 * - thema: string (required)
 * - beschreibung: string (required)
 * - lehrmittel?: string
 * - bildLehrmittel?: string (Firebase Storage URL)
 * - anzahlLektionen: number (required)
 * - schuljahr: Stufe[] (required)
 * - zeitraum: Zeitraum (required)
 * - kompetenzenIds: string[] (Airtable Record IDs)
 * - fileRouge?: string
 * - unterlagen?: string
 * - status?: ThemeStatus (default: "draft")
 * - submitForReview?: boolean (wenn true, status = "pending_review")
 */
export async function POST(request: NextRequest) {
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

    // Hole Teacher-Profil
    const teacher = await getTeacherProfile(userId);
    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    // Request Body
    const body = await request.json();
    const {
      thema,
      beschreibung,
      lehrmittel,
      bildLehrmittel,
      anzahlLektionen,
      schuljahr,
      zeitraum,
      kompetenzenIds,
      fileRouge,
      unterlagen,
      submitForReview,
    } = body;

    // Validierung
    if (!thema || !beschreibung || !anzahlLektionen || !schuljahr || !zeitraum) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: thema, beschreibung, anzahlLektionen, schuljahr, zeitraum",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(schuljahr) || schuljahr.length === 0) {
      return NextResponse.json(
        { error: "schuljahr must be a non-empty array" },
        { status: 400 }
      );
    }

    // Status bestimmen
    const status: ThemeStatus = submitForReview ? "pending_review" : "draft";

    // Theme erstellen
    const themeId = await createCustomTheme({
      thema,
      beschreibung,
      lehrmittel,
      bildLehrmittel,
      anzahlLektionen,
      schuljahr,
      zeitraum,
      kompetenzenIds: kompetenzenIds || [],
      fileRouge,
      unterlagen,
      createdBy: userId,
      createdByName: teacher.name,
      schuleId: teacher.schuleId,
      status,
    });

    // Bei Submission: Benachrichtige PICTS-Admins
    if (submitForReview) {
      try {
        await notifyThemeSubmitted(
          themeId,
          thema,
          userId,
          teacher.name,
          teacher.email,
          teacher.schuleId
        );
      } catch (notifyError) {
        console.error("Error sending notifications:", notifyError);
        // Fehler beim Benachrichtigen soll Theme-Erstellung nicht blockieren
      }
    }

    return NextResponse.json(
      { success: true, themeId, status },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/custom-themes:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to create custom theme" },
      { status: 500 }
    );
  }
}
