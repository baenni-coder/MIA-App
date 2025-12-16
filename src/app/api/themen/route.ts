import { NextResponse } from "next/server";
import { getAllThemen, getThemenByStufe, getThemenGroupedByZeitraum } from "@/lib/airtable/themen";
import { getCustomThemesByStufe } from "@/lib/firestore/custom-themes";
import { getKompetenzenByIds } from "@/lib/airtable/kompetenzen";
import { Stufe, Thema, Zeitraum, CustomTheme } from "@/types";

/**
 * Konvertiert CustomTheme zu Thema-Format
 */
async function convertCustomThemeToThema(customTheme: CustomTheme): Promise<Thema> {
  // Kompetenzen auflösen falls noch nicht geschehen
  let kompetenzen = customTheme.kompetenzen;
  if (!kompetenzen && customTheme.kompetenzenIds.length > 0) {
    const kompetenzenMap = await getKompetenzenByIds(customTheme.kompetenzenIds);
    kompetenzen = customTheme.kompetenzenIds
      .map((id) => kompetenzenMap.get(id))
      .filter((k) => k !== undefined);
  }

  // String-Repräsentation für Anzeige
  const kompetenzenString = kompetenzen
    ?.map((k) => k.lpCode || k.name)
    .join(", ");

  return {
    id: customTheme.id,
    thema: customTheme.thema,
    beschreibung: customTheme.beschreibung,
    lehrmittel: customTheme.lehrmittel,
    bildLehrmittel: customTheme.bildLehrmittel,
    anzahlLektionen: customTheme.anzahlLektionen,
    kompetenzenLehrplan: kompetenzenString,
    kompetenzen: kompetenzen,
    fileRouge: customTheme.fileRouge,
    unterlagen: customTheme.unterlagen,
    schuljahr: customTheme.schuljahr,
    zeitraum: customTheme.zeitraum,
    // Custom Theme Felder
    isCustom: true,
    customThemeId: customTheme.id,
  };
}

/**
 * Kombiniert Airtable Themen und Custom Themes
 */
async function getCombinedThemenByStufe(stufe: Stufe): Promise<Thema[]> {
  // Lade beide Quellen parallel
  const [airtableThemen, customThemes] = await Promise.all([
    getThemenByStufe(stufe),
    getCustomThemesByStufe(stufe),
  ]);

  // Konvertiere Custom Themes zu Thema-Format
  const customThemenPromises = customThemes.map((ct) => convertCustomThemeToThema(ct));
  const customThemenConverted = await Promise.all(customThemenPromises);

  // Kombiniere beide Listen
  return [...airtableThemen, ...customThemenConverted];
}

/**
 * Gruppiert kombinierte Themen nach Zeitraum
 */
async function getCombinedThemenGroupedByZeitraum(
  stufe: Stufe
): Promise<Record<Zeitraum, Thema[]>> {
  const themen = await getCombinedThemenByStufe(stufe);

  const grouped: Record<Zeitraum, Thema[]> = {
    "Sommerferien-Herbstferien": [],
    "Herbstferien-Weihnachtsferien": [],
    "Weihnachtsferien-Winterferien": [],
    "Winterferien-Frühlingsferien": [],
    "Frühlingsferien-Sommerferien": [],
    "Zusatz": [],
  };

  themen.forEach((thema) => {
    if (thema.zeitraum && grouped[thema.zeitraum]) {
      grouped[thema.zeitraum].push(thema);
    }
  });

  return grouped;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stufe = searchParams.get("stufe") as Stufe | null;
    const grouped = searchParams.get("grouped") === "true";

    if (stufe && grouped) {
      // Verwende kombinierte Funktion statt nur Airtable
      const themenGrouped = await getCombinedThemenGroupedByZeitraum(stufe);
      return NextResponse.json(themenGrouped);
    }

    if (stufe) {
      // Verwende kombinierte Funktion statt nur Airtable
      const themen = await getCombinedThemenByStufe(stufe);
      return NextResponse.json(themen);
    }

    // Ohne Stufe: nur Airtable Themen (wie bisher)
    const allThemen = await getAllThemen();
    return NextResponse.json(allThemen);
  } catch (error) {
    console.error("Error fetching Themen:", error);
    return NextResponse.json(
      { error: "Failed to fetch Themen" },
      { status: 500 }
    );
  }
}
