import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getBeurteilungenProWoche,
  getFachbereichVerteilung,
  getJahresplanEinheiten,
} from "@/lib/firestore/jahresplanung";

/**
 * GET /api/jahresplanung/statistik
 * Lädt Statistiken für ein Schuljahr
 *
 * Query Parameters:
 * - schuljahr: Schuljahr (erforderlich)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Query Parameter parsen
    const { searchParams } = new URL(request.url);
    const schuljahr = searchParams.get("schuljahr");

    if (!schuljahr) {
      return NextResponse.json(
        { error: "Schuljahr ist erforderlich" },
        { status: 400 }
      );
    }

    // Alle Statistiken parallel laden
    const [beurteilungenMap, fachbereichVerteilung, einheiten] =
      await Promise.all([
        getBeurteilungenProWoche(userId, schuljahr),
        getFachbereichVerteilung(userId, schuljahr),
        getJahresplanEinheiten(userId, { schuljahr }),
      ]);

    // Map zu Array konvertieren
    const beurteilungenProWoche: Array<{
      kw: number;
      formativ: number;
      summativ: number;
    }> = [];
    beurteilungenMap.forEach((counts, kw) => {
      beurteilungenProWoche.push({
        kw,
        formativ: counts.formativ,
        summativ: counts.summativ,
      });
    });
    beurteilungenProWoche.sort((a, b) => a.kw - b.kw);

    // Wochen mit zu vielen Beurteilungen identifizieren
    const wochenMitWarnung = beurteilungenProWoche
      .filter((w) => w.summativ >= 2)
      .map((w) => w.kw);

    // Status-Übersicht
    const statusUebersicht = {
      geplant: einheiten.filter((e) => e.status === "geplant").length,
      durchgefuehrt: einheiten.filter((e) => e.status === "durchgefuehrt")
        .length,
      reflektiert: einheiten.filter((e) => e.status === "reflektiert").length,
    };

    // Quartal-Übersicht
    const quartalUebersicht = [1, 2, 3, 4].map((q) => ({
      quartal: q,
      count: einheiten.filter((e) => e.quartal === q).length,
    }));

    // Kompetenz-Abdeckung (einfache Zählung)
    const alleKompetenzen = new Set<string>();
    einheiten.forEach((e) => {
      e.kompetenzenIds?.forEach((id) => alleKompetenzen.add(id));
    });

    return NextResponse.json({
      schuljahr,
      totalEinheiten: einheiten.length,
      statusUebersicht,
      quartalUebersicht,
      fachbereichVerteilung,
      beurteilungenProWoche,
      wochenMitWarnung,
      kompetenzAbdeckung: {
        total: alleKompetenzen.size,
      },
    });
  } catch (error) {
    console.error("Error fetching statistik:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistik" },
      { status: 500 }
    );
  }
}
