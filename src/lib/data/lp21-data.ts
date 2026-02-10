import schulkalenderData from "./schulkalender.json";
import lp21FachbereicheData from "./lehrplan21-fachbereiche.json";
import type {
  SchulkalenderData,
  LP21FachbereicheData,
  LP21Fachbereich,
  LP21Kompetenzbereich,
  LP21KompetenzRef,
  FerienPreset,
  QuartalSchema,
} from "@/types";

// JSON-Daten mit korrekten Typen
export const schulkalender = schulkalenderData as unknown as SchulkalenderData;
export const lp21Fachbereiche = lp21FachbereicheData as unknown as LP21FachbereicheData;

/**
 * Gibt alle Fachbereiche zurück
 */
export function getAlleFachbereiche(): LP21Fachbereich[] {
  return lp21Fachbereiche.fachbereiche;
}

/**
 * Gibt einen Fachbereich nach ID zurück
 */
export function getFachbereichById(id: string): LP21Fachbereich | undefined {
  return lp21Fachbereiche.fachbereiche.find((fb) => fb.id === id);
}

/**
 * Gibt alle Kompetenzbereiche eines Fachbereichs zurück
 */
export function getKompetenzbereiche(
  fachbereichId: string
): LP21Kompetenzbereich[] {
  const fb = getFachbereichById(fachbereichId);
  return fb?.kompetenzbereiche || [];
}

/**
 * Gibt alle Kompetenzen eines Kompetenzbereichs zurück
 */
export function getKompetenzen(
  fachbereichId: string,
  kompetenzbereichId: string
): LP21KompetenzRef[] {
  const bereiche = getKompetenzbereiche(fachbereichId);
  const bereich = bereiche.find((kb) => kb.id === kompetenzbereichId);
  return bereich?.kompetenzen || [];
}

/**
 * Sucht eine Kompetenz nach ID (vollständiger Scan)
 */
export function getKompetenzById(kompetenzId: string): {
  fachbereich: LP21Fachbereich;
  kompetenzbereich: LP21Kompetenzbereich;
  kompetenz: LP21KompetenzRef;
} | null {
  for (const fb of lp21Fachbereiche.fachbereiche) {
    for (const kb of fb.kompetenzbereiche) {
      const komp = kb.kompetenzen.find((k) => k.id === kompetenzId);
      if (komp) {
        return {
          fachbereich: fb,
          kompetenzbereich: kb,
          kompetenz: komp,
        };
      }
    }
  }
  return null;
}

/**
 * Gibt die Farbe eines Fachbereichs zurück
 */
export function getFachbereichFarbe(fachbereichId: string): string {
  const fb = getFachbereichById(fachbereichId);
  return fb?.farbe || "#6b7280";
}

/**
 * Gibt alle Ferien-Presets zurück
 */
export function getFerienPresets(): Record<string, FerienPreset> {
  return schulkalender.ferienPresets;
}

/**
 * Gibt ein Ferien-Preset nach ID zurück
 */
export function getFerienPreset(presetId: string): FerienPreset | undefined {
  return schulkalender.ferienPresets[presetId];
}

/**
 * Gibt die Ferien für ein bestimmtes Schuljahr und Preset zurück
 */
export function getFerien(
  presetId: string,
  schuljahr: string
): Record<string, { start: string; ende: string; label: string }> | undefined {
  const preset = getFerienPreset(presetId);
  if (!preset?.schuljahre[schuljahr]) {
    return undefined;
  }
  return preset.schuljahre[schuljahr];
}

/**
 * Gibt die Quartal-Einteilung zurück
 */
export function getQuartalSchema(): QuartalSchema[] {
  return schulkalender.schulwochen_schema.quartalEinteilung;
}

/**
 * Prüft, ob eine Kalenderwoche in den Ferien liegt
 */
export function istFerienWoche(
  presetId: string,
  schuljahr: string,
  kalenderwoche: number,
  jahr: number
): { istFerien: boolean; ferienName?: string } {
  const ferien = getFerien(presetId, schuljahr);
  if (!ferien) {
    return { istFerien: false };
  }

  // Datum des Montags der Kalenderwoche berechnen
  const montag = getMondayOfWeek(kalenderwoche, jahr);

  for (const [, ferienData] of Object.entries(ferien)) {
    const start = new Date(ferienData.start);
    const ende = new Date(ferienData.ende);

    // Prüfen, ob der Montag der Woche in den Ferien liegt
    if (montag >= start && montag <= ende) {
      return { istFerien: true, ferienName: ferienData.label };
    }
  }

  return { istFerien: false };
}

/**
 * Berechnet das Datum des Montags einer Kalenderwoche
 */
export function getMondayOfWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);
  return targetDate;
}

/**
 * Berechnet das Datum des Freitags einer Kalenderwoche
 */
export function getFridayOfWeek(week: number, year: number): Date {
  const monday = getMondayOfWeek(week, year);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday;
}

/**
 * Formatiert ein Datum als deutsches Format
 */
export function formatDatumKurz(date: Date): string {
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Gibt das aktuelle Schuljahr zurück
 * (August bis Juli des nächsten Jahres)
 */
export function getAktuellesSchuljahr(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  // Wenn vor August, gehört es noch zum vorherigen Schuljahr
  if (month < 7) {
    return `${year - 1}/${year}`;
  }
  return `${year}/${year + 1}`;
}

/**
 * Generiert eine Liste von Schuljahren
 */
export function getSchuljahrListe(count: number = 3): string[] {
  const currentYear = new Date().getFullYear();
  const schuljahre: string[] = [];

  for (let i = -1; i < count; i++) {
    const startYear = currentYear + i;
    schuljahre.push(`${startYear}/${startYear + 1}`);
  }

  return schuljahre;
}

/**
 * Gibt die Schulwochen eines Schuljahrs zurück (ca. 38 Wochen)
 */
export function getSchulwochenFuerSchuljahr(
  presetId: string,
  schuljahr: string
): Array<{
  kw: number;
  jahr: number;
  quartal: number;
  istFerien: boolean;
  ferienName?: string;
}> {
  const wochen: Array<{
    kw: number;
    jahr: number;
    quartal: number;
    istFerien: boolean;
    ferienName?: string;
  }> = [];

  // Schuljahr parsen (z.B. "2025/2026")
  const [startYear] = schuljahr.split("/").map(Number);
  const endYear = startYear + 1;

  // Q1: August - September (KW 33-39)
  for (let kw = 33; kw <= 52; kw++) {
    const ferien = istFerienWoche(presetId, schuljahr, kw, startYear);
    wochen.push({
      kw,
      jahr: startYear,
      quartal: kw <= 41 ? 1 : 2,
      ...ferien,
    });
  }

  // Q3-Q4: Januar - Juli (KW 1-27)
  for (let kw = 1; kw <= 27; kw++) {
    const ferien = istFerienWoche(presetId, schuljahr, kw, endYear);
    wochen.push({
      kw,
      jahr: endYear,
      quartal: kw <= 14 ? 3 : 4,
      ...ferien,
    });
  }

  return wochen;
}
