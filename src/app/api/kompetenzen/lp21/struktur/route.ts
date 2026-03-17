import { NextRequest, NextResponse } from "next/server";
import { getLP21Struktur, getAllLP21Strukturen, countAnwendungskompetenzen } from "@/lib/firestore/system-cache";

/**
 * GET /api/kompetenzen/lp21/struktur?fachbereich=D
 *
 * Lädt die LP21 Fachbereich-Struktur (Kompetenzbereiche + Kompetenzen)
 * die beim LP21 Sync gespeichert wurde.
 *
 * Umbrella-Kategorien (SPR, GES) werden automatisch in Sub-Fachbereiche aufgelöst:
 * SPR → D, FS1F, FS2E, FS3I
 * GES → BG, TTG
 *
 * Ohne fachbereich-Parameter: Lädt alle verfügbaren Strukturen (nur Fachbereich-Codes).
 * Mit fachbereich-Parameter: Lädt die vollständige Struktur eines Fachbereichs.
 */
export async function GET(request: NextRequest) {
  try {
    const fachbereich = request.nextUrl.searchParams.get("fachbereich");

    if (!fachbereich) {
      // Alle verfügbaren Fachbereich-Codes zurückgeben
      // getAllLP21Strukturen expandiert Umbrella-Kategorien automatisch
      const alle = await getAllLP21Strukturen();
      return NextResponse.json(
        {
          fachbereiche: alle.map((s) => ({
            code: s.fachbereichCode,
            name: s.fachbereichName,
            kanton: s.kanton,
            kompetenzbereiche: s.kompetenzbereiche.length,
            lastSyncedAt: s.lastSyncedAt,
          })),
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
          },
        }
      );
    }

    // getLP21Struktur handles sub-fachbereich extraction from umbrella categories
    const struktur = await getLP21Struktur(fachbereich);

    if (!struktur) {
      // Return 200 with empty data (not 404) - no synced structure is a valid state
      const alle = await getAllLP21Strukturen();
      const verfuegbar = alle.map((s) => s.fachbereichCode);
      console.log(
        `LP21 Struktur API: '${fachbereich}' nicht gefunden. Verfügbar: ${verfuegbar.join(", ") || "(leer)"}`
      );
      return NextResponse.json(
        {
          fachbereichCode: fachbereich,
          fachbereichName: "",
          kanton: "",
          kompetenzbereiche: [],
          synced: false,
          verfuegbareFachbereiche: verfuegbar,
        },
        {
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );
    }

    // Für MI/IB: Anwendungskompetenzen aus system_kompetenzen ergänzen
    let kompetenzbereiche = struktur.kompetenzbereiche;
    const isMIA = fachbereich === "MI" || fachbereich === "IB";
    if (isMIA) {
      const hasAnwendung = kompetenzbereiche.some(
        (kb) => kb.code.endsWith(".3") || kb.bezeichnung === "Anwendungskompetenzen"
      );
      if (!hasAnwendung) {
        const anwendung = await countAnwendungskompetenzen();
        if (anwendung.count > 0) {
          kompetenzbereiche = [
            ...kompetenzbereiche,
            {
              uid: `${fachbereich}.3`,
              code: `${fachbereich}.3`,
              bezeichnung: "Anwendungskompetenzen",
              kompetenzen: anwendung.kompetenzen.map((k) => ({
                uid: k.code,
                code: k.code,
                bezeichnung: k.bezeichnung,
                kompetenzstufen: 0, // Will be loaded dynamically
              })),
            },
          ];
        }
      }
    }

    return NextResponse.json(
      {
        fachbereichCode: struktur.fachbereichCode,
        fachbereichName: struktur.fachbereichName,
        kanton: struktur.kanton,
        kompetenzbereiche,
        lastSyncedAt: struktur.lastSyncedAt,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/kompetenzen/lp21/struktur:", error);
    return NextResponse.json(
      { error: "Failed to fetch LP21 Struktur" },
      { status: 500 }
    );
  }
}
