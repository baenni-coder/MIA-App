import { NextRequest, NextResponse } from "next/server";
import { getSystemKompetenzenByFachbereich } from "@/lib/firestore/system-cache";

/**
 * GET /api/kompetenzen/lp21?fachbereich=D
 * Lädt gesynced LP21 Kompetenzstufen aus Firestore, gefiltert nach Fachbereich.
 * Für den KompetenzPicker der Jahresplanung.
 *
 * Query Parameters:
 * - fachbereich: Fachbereich-Code (z.B. "D", "MI", "IB", "MA")
 * - kompetenzbereich: Optional Kompetenzbereich-Prefix (z.B. "D.2")
 */
export async function GET(request: NextRequest) {
  try {
    const fachbereich = request.nextUrl.searchParams.get("fachbereich");

    if (!fachbereich) {
      return NextResponse.json(
        { error: "Parameter 'fachbereich' ist erforderlich" },
        { status: 400 }
      );
    }

    const kompetenzstufen = await getSystemKompetenzenByFachbereich(fachbereich);

    // Optional: Weiter filtern nach Kompetenzbereich
    const kompetenzbereich = request.nextUrl.searchParams.get("kompetenzbereich");
    const filtered = kompetenzbereich
      ? kompetenzstufen.filter((k) => k.lpCode?.startsWith(kompetenzbereich + "."))
      : kompetenzstufen;

    // Nach lpCode sortieren
    filtered.sort((a, b) => (a.lpCode || "").localeCompare(b.lpCode || ""));

    return NextResponse.json(
      {
        kompetenzstufen: filtered.map((k) => ({
          id: k.lp21Uid || k.airtableId,
          lpCode: k.lpCode,
          name: k.name,
          kompetenzbereich: k.kompetenzbereich,
          kompetenz: k.kompetenz,
          kompetenzstufe: k.kompetenzstufe,
          zyklus: k.zyklus,
          klassenstufe: k.klassenstufe,
          grundanspruch: k.grundanspruch,
          orientierungspunkt: k.orientierungspunkt,
        })),
        total: filtered.length,
        fachbereich,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/kompetenzen/lp21:", error);
    return NextResponse.json(
      { error: "Failed to fetch LP21 kompetenzstufen" },
      { status: 500 }
    );
  }
}
