import { NextRequest, NextResponse } from "next/server";
import { getSystemKompetenzenByFachbereich, getSystemKompetenzen } from "@/lib/firestore/system-cache";

/**
 * GET /api/kompetenzen/lp21?fachbereich=D
 * Lädt gesynced LP21 Kompetenzstufen aus Firestore, gefiltert nach Fachbereich.
 * Für den KompetenzPicker der Jahresplanung.
 *
 * Query Parameters:
 * - fachbereich: Fachbereich-Code (z.B. "D", "MI", "IB", "MA", "FS1F", "BG")
 * - kompetenzbereich: Optional Kompetenzbereich-Prefix (z.B. "D.2", "MI.3")
 *   Spezialfall: MI.3 / IB.3 → filtert nach kompetenzbereich="Anwendungskompetenzen"
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

    let kompetenzstufen = await getSystemKompetenzenByFachbereich(fachbereich);

    // Für MI/IB: Auch Anwendungskompetenzen einschliessen
    const isMIA = fachbereich === "MI" || fachbereich === "IB";
    if (isMIA) {
      const alle = await getSystemKompetenzen();
      const anwendung = alle.filter((k) => k.kompetenzbereich === "Anwendungskompetenzen");
      // Deduplizierung: nur hinzufügen wenn nicht schon enthalten
      const existingIds = new Set(kompetenzstufen.map((k) => k.airtableId));
      const newAnwendung = anwendung.filter((k) => !existingIds.has(k.airtableId));
      kompetenzstufen = [...kompetenzstufen, ...newAnwendung];
    }

    // Optional: Weiter filtern nach Kompetenzbereich
    const kompetenzbereich = request.nextUrl.searchParams.get("kompetenzbereich");
    let filtered = kompetenzstufen;
    if (kompetenzbereich) {
      // Spezialfall: MI.3 / IB.3 → Anwendungskompetenzen (nach Feld, nicht lpCode-Prefix)
      if (/^(MI|IB)\.3/.test(kompetenzbereich)) {
        filtered = kompetenzstufen.filter((k) => k.kompetenzbereich === "Anwendungskompetenzen");
      } else {
        filtered = kompetenzstufen.filter((k) => k.lpCode?.startsWith(kompetenzbereich + "."));
      }
    }

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
