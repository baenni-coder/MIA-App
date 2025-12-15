import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  createCustomLektion,
  createMultipleCustomLektionen,
  getCustomLektionenByThemeId,
} from "@/lib/firestore/custom-lektionen";
import { getCustomThemeById } from "@/lib/firestore/custom-themes";
import { canReadCustomTheme } from "@/lib/firestore/permissions";
import { WebsiteTool } from "@/types";

/**
 * GET /api/custom-lektionen
 * Lädt Custom Lektionen eines Themes
 *
 * Query Parameters:
 * - themeId: string (required)
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
    const themeId = searchParams.get("themeId");

    if (!themeId) {
      return NextResponse.json(
        { error: "themeId is required" },
        { status: 400 }
      );
    }

    // Theme laden und Berechtigung prüfen
    const theme = await getCustomThemeById(themeId);
    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    const canRead = await canReadCustomTheme(userId, theme);
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Lektionen laden
    const lektionen = await getCustomLektionenByThemeId(themeId);

    return NextResponse.json({ lektionen }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/custom-lektionen:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch custom lektionen" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/custom-lektionen
 * Erstellt eine oder mehrere Custom Lektionen
 *
 * Body (Single):
 * - themeId: string (required)
 * - lektion: string (required)
 * - eindeutigeBezeichnung: string (required)
 * - aufgaben?: string
 * - vorwissen?: string
 * - material?: string[]
 * - websiteTools?: WebsiteTool[]
 * - einstieg?: string
 * - hauptteil?: string
 * - abschluss?: string
 * - stolpersteine?: string
 * - kiZusammenfassung?: string
 * - order: number (required)
 *
 * Body (Multiple):
 * - lektionen: Array<Lektion> (required)
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

    // Request Body
    const body = await request.json();

    // Batch-Create oder Single-Create?
    const isBatch = Array.isArray(body.lektionen);

    if (isBatch) {
      // Batch-Create
      const lektionen = body.lektionen;

      if (lektionen.length === 0) {
        return NextResponse.json(
          { error: "lektionen array is empty" },
          { status: 400 }
        );
      }

      // Validiere alle Lektionen
      const themeId = lektionen[0].themeId;
      const theme = await getCustomThemeById(themeId);

      if (!theme) {
        return NextResponse.json(
          { error: "Theme not found" },
          { status: 404 }
        );
      }

      // Nur Ersteller kann Lektionen hinzufügen
      if (theme.createdBy !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Erstelle alle Lektionen
      const lektionenData = lektionen.map((lektion: any) => ({
        ...lektion,
        createdBy: userId,
      }));

      const ids = await createMultipleCustomLektionen(lektionenData);

      return NextResponse.json(
        { success: true, lektionIds: ids },
        { status: 201 }
      );
    } else {
      // Single-Create
      const {
        themeId,
        lektion,
        eindeutigeBezeichnung,
        aufgaben,
        vorwissen,
        material,
        websiteTools,
        einstieg,
        hauptteil,
        abschluss,
        stolpersteine,
        kiZusammenfassung,
        order,
      } = body;

      // Validierung
      if (!themeId || !lektion || !eindeutigeBezeichnung || order === undefined) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: themeId, lektion, eindeutigeBezeichnung, order",
          },
          { status: 400 }
        );
      }

      // Theme laden und Berechtigung prüfen
      const theme = await getCustomThemeById(themeId);
      if (!theme) {
        return NextResponse.json(
          { error: "Theme not found" },
          { status: 404 }
        );
      }

      // Nur Ersteller kann Lektionen hinzufügen
      if (theme.createdBy !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Lektion erstellen
      const lektionId = await createCustomLektion({
        themeId,
        lektion,
        eindeutigeBezeichnung,
        aufgaben,
        vorwissen,
        material,
        websiteTools,
        einstieg,
        hauptteil,
        abschluss,
        stolpersteine,
        kiZusammenfassung,
        createdBy: userId,
        order,
      });

      return NextResponse.json(
        { success: true, lektionId },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/custom-lektionen:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to create custom lektion" },
      { status: 500 }
    );
  }
}
