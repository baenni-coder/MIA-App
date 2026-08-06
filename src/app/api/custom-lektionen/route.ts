import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createCustomLektion,
  createMultipleCustomLektionen,
  getCustomLektionenByThemeId,
  getCustomLektionenBySystemThemeName,
  getCustomLektionenByLektionsplanungId,
} from "@/lib/firestore/custom-lektionen";
import { getCustomThemeById } from "@/lib/firestore/custom-themes";
import { canReadCustomTheme } from "@/lib/firestore/permissions";
import { getJahresplanEinheitById } from "@/lib/firestore/jahresplanung";
import { getEinheitLektionsplanungById } from "@/lib/firestore/einheit-lektionsplanungen";
import { getPlanungsTeamById } from "@/lib/firestore/planungsteams";
import { JahresplanEinheit, WebsiteTool } from "@/types";

/**
 * Prüft, ob der User die Einheit bearbeiten darf (Owner, sharedWith, Team).
 */
async function canEditEinheit(
  einheit: JahresplanEinheit,
  userId: string
): Promise<boolean> {
  if (einheit.teacherId === userId) return true;
  if (einheit.sharedWith?.includes(userId)) return true;
  if (einheit.teamId) {
    const team = await getPlanungsTeamById(einheit.teamId);
    if (team?.members.some((m) => m.userId === userId)) return true;
  }
  return false;
}

/**
 * GET /api/custom-lektionen
 * Lädt Custom Lektionen eines Themes (Custom Theme oder Systemthema)
 *
 * Query Parameters:
 * - themeId: string (für Custom Themes)
 * - systemThemeName: string (für Systemthemen)
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
    const systemThemeName = searchParams.get("systemThemeName");
    const lektionsplanungId = searchParams.get("lektionsplanungId");

    if (!themeId && !systemThemeName && !lektionsplanungId) {
      return NextResponse.json(
        { error: "themeId, systemThemeName or lektionsplanungId is required" },
        { status: 400 }
      );
    }

    let lektionen;

    if (lektionsplanungId) {
      // Jahresplan-Einheit: Lektionen einer Lektionsplanung
      const planung = await getEinheitLektionsplanungById(lektionsplanungId);
      if (!planung) {
        return NextResponse.json(
          { error: "Lektionsplanung not found" },
          { status: 404 }
        );
      }

      const einheit = await getJahresplanEinheitById(planung.einheitId);
      if (!einheit) {
        return NextResponse.json(
          { error: "Einheit not found" },
          { status: 404 }
        );
      }

      const canRead =
        (await canEditEinheit(einheit, userId)) || einheit.isShared;
      if (!canRead) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      lektionen = await getCustomLektionenByLektionsplanungId(lektionsplanungId);
    } else if (systemThemeName) {
      // Systemthema: Lade Custom Lektionen für dieses Thema
      // Hole die SchuleId des Users für Filterung
      const adminDb = getAdminDb();
      const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
      const schuleId = teacherDoc.exists ? teacherDoc.data()?.schuleId : undefined;

      // Lade Lektionen der eigenen Schule
      lektionen = await getCustomLektionenBySystemThemeName(systemThemeName, schuleId);
    } else if (themeId) {
      // Custom Theme: Wie bisher
      const theme = await getCustomThemeById(themeId);
      if (!theme) {
        return NextResponse.json({ error: "Theme not found" }, { status: 404 });
      }

      const canRead = await canReadCustomTheme(userId, theme);
      if (!canRead) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      lektionen = await getCustomLektionenByThemeId(themeId);
    }

    return NextResponse.json({ lektionen: lektionen || [] }, { status: 200 });
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
 * Erstellt eine oder mehrere Custom Lektionen (für Custom Theme oder Systemthema)
 *
 * Body (Single für Custom Theme):
 * - themeId: string (required)
 * - lektion: string (required)
 * - eindeutigeBezeichnung: string (required)
 * - ... andere Felder
 * - order: number (required)
 *
 * Body (Single für Systemthema):
 * - systemThemeId: string (required)
 * - systemThemeName: string (required)
 * - lektion: string (required)
 * - eindeutigeBezeichnung: string (required)
 * - ... andere Felder
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

    // Lade User-Daten für Name und SchuleId
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    const teacherData = teacherDoc.exists ? teacherDoc.data() : null;
    const userName = teacherData?.name || "Unbekannt";
    const schuleId = teacherData?.schuleId;

    // Request Body
    const body = await request.json();

    // Batch-Create oder Single-Create?
    const isBatch = Array.isArray(body.lektionen);

    if (isBatch) {
      // Batch-Create (nur für Custom Themes wie bisher)
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
        createdByName: userName,
        schuleId,
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
        systemThemeId,
        systemThemeName,
        einheitId,
        lektionsplanungId,
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

      // Validierung - themeId ODER systemThemeId/systemThemeName ODER Einheit
      const isEinheit = !!einheitId && !!lektionsplanungId;
      const isSystemTheme = !!systemThemeId && !!systemThemeName;
      const isCustomTheme = !!themeId && !systemThemeId && !einheitId;

      if (!isEinheit && !isSystemTheme && !isCustomTheme) {
        return NextResponse.json(
          {
            error:
              "Either themeId OR (systemThemeId and systemThemeName) OR (einheitId and lektionsplanungId) is required",
          },
          { status: 400 }
        );
      }

      if (!lektion || !eindeutigeBezeichnung || order === undefined) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: lektion, eindeutigeBezeichnung, order",
          },
          { status: 400 }
        );
      }

      if (isEinheit) {
        // Jahresplan-Einheit: Lektion einer Lektionsplanung
        const planung = await getEinheitLektionsplanungById(lektionsplanungId);
        if (!planung || planung.einheitId !== einheitId) {
          return NextResponse.json(
            { error: "Lektionsplanung not found" },
            { status: 404 }
          );
        }

        const einheit = await getJahresplanEinheitById(einheitId);
        if (!einheit) {
          return NextResponse.json(
            { error: "Einheit not found" },
            { status: 404 }
          );
        }

        if (!(await canEditEinheit(einheit, userId))) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const lektionId = await createCustomLektion({
          einheitId,
          lektionsplanungId,
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
          createdByName: userName,
          schuleId,
          order,
        });

        return NextResponse.json(
          { success: true, lektionId },
          { status: 201 }
        );
      } else if (isCustomTheme) {
        // Custom Theme: Berechtigung prüfen
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

        // Lektion erstellen für Custom Theme
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
          createdByName: userName,
          schuleId,
          order,
        });

        return NextResponse.json(
          { success: true, lektionId },
          { status: 201 }
        );
      } else {
        // Systemthema: Jeder authentifizierte User kann Lektionen erstellen
        const lektionId = await createCustomLektion({
          systemThemeId,
          systemThemeName,
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
          createdByName: userName,
          schuleId,
          order,
        });

        return NextResponse.json(
          { success: true, lektionId },
          { status: 201 }
        );
      }
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
