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
  SchulferienCustom,
} from "@/types";

// JSON-Daten mit korrekten Typen
export const schulkalender = schulkalenderData as unknown as SchulkalenderData;
export const lp21Fachbereiche = lp21FachbereicheData as unknown as LP21FachbereicheData;

/**
 * Default-Farben für LP21 Fachbereich-Codes (von API synchronisiert).
 * Diese Farben werden verwendet, wenn Fachbereiche aus der LP21 API
 * geladen werden statt aus der statischen JSON-Datei.
 */
const LP21_FACHBEREICH_FARBEN: Record<string, string> = {
  // Sprachen
  SPR: "#2563EB",   // Blau
  D: "#2563EB",     // Deutsch (Alias)
  FS1: "#7C3AED",   // Französisch
  FS2: "#9333EA",   // Englisch
  DaZ: "#3B82F6",   // Deutsch als Zweitsprache
  // MINT
  MA: "#DC2626",    // Mathematik – Rot
  IB: "#6366F1",    // Informatische Bildung – Indigo
  MI: "#6366F1",    // Medien und Informatik (Alias)
  // Natur, Mensch, Gesellschaft
  NMG: "#16A34A",   // Grün
  // Gestalten
  GES: "#F59E0B",   // Gelb/Orange
  BG: "#F59E0B",    // Bildnerisches Gestalten (Alias)
  TTG: "#EA580C",   // Textiles/Technisches Gestalten
  // Musik
  MU: "#EC4899",    // Pink
  // Bewegung und Sport
  BS: "#0891B2",    // Cyan
  // Berufliche Orientierung
  BO: "#64748B",    // Slate/Grau
};

/**
 * Gibt die Farbe für einen LP21 Fachbereich-Code zurück.
 * Funktioniert mit sowohl statischen IDs ("D", "MI") als auch
 * LP21-API-Codes ("SPR", "IB", "DaZ").
 */
export function getLp21FachbereichFarbe(code: string): string {
  return LP21_FACHBEREICH_FARBEN[code] || "#6b7280";
}

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
 * Findet einen Fachbereich anhand von ID oder fachbereichKuerzel.
 * Nützlich für Backward-Kompatibilität, wenn gespeicherte IDs API-Codes verwenden.
 * z.B. "FS1F" → findet Fachbereich mit id="FS1" (kuerzel="FS1F")
 */
export function findFachbereich(idOrKuerzel: string): LP21Fachbereich | undefined {
  // First try by id
  const byId = getFachbereichById(idOrKuerzel);
  if (byId) return byId;
  // Then try by kuerzel
  return lp21Fachbereiche.fachbereiche.find(
    (fb) => fb.fachbereichKuerzel === idOrKuerzel
  );
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
 * Berechnet die ISO-Wochennummer eines Datums
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

/**
 * Findet die KW in der die Sportferien enden.
 * Wird verwendet um die Grenze zwischen Q2 und Q3 zu bestimmen.
 * Lehrpersonen planen "von Ferien zu Ferien":
 * Q2 = Herbst→Sport, Q3 = Sport→Frühling
 */
export function findSportferienEndeKW(
  presetId: string,
  schuljahr: string,
  customFerien?: SchulferienCustom[]
): number {
  const DEFAULT_KW = 7; // Fallback: typisch für Kanton SO

  if (customFerien && customFerien.length > 0) {
    const sport = customFerien.find((f) =>
      f.ferienName.toLowerCase().includes("sport")
    );
    if (sport) {
      const ende = parseLocalDate(sport.ende);
      return getISOWeekNumber(ende);
    }
    return DEFAULT_KW;
  }

  const ferien = getFerien(presetId, schuljahr);
  if (ferien && "sportferien" in ferien) {
    const sportferien = ferien["sportferien"] as {
      start: string;
      ende: string;
      label: string;
    };
    const ende = parseLocalDate(sportferien.ende);
    return getISOWeekNumber(ende);
  }

  return DEFAULT_KW;
}

/**
 * Parst ein "YYYY-MM-DD" Datum als Lokalzeit (nicht UTC).
 * new Date("2026-02-02") wird als UTC geparst, was in CET/CEST
 * zu Fehlern bei Datums-Vergleichen führt.
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
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

  // Datum des Montags und Freitags der Kalenderwoche berechnen
  const montag = getMondayOfWeek(kalenderwoche, jahr);
  const freitag = getFridayOfWeek(kalenderwoche, jahr);

  for (const [, ferienData] of Object.entries(ferien)) {
    const start = parseLocalDate(ferienData.start);
    const ende = parseLocalDate(ferienData.ende);

    // Prüfen, ob die Woche die Ferien überlappt
    // (Montag liegt in den Ferien ODER Freitag liegt in den Ferien ODER Ferien liegen komplett in der Woche)
    if (montag <= ende && freitag >= start) {
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
 * Ermittelt den Startzeitpunkt der Sommerferien eines Schuljahrs aus einem
 * Ferien-Preset. Die Sommerferien am Ende von Schuljahr "X/X+1" sind unter
 * dem Schlüssel "X/X+1" abgelegt und liegen im Kalenderjahr X+1.
 * Gibt null zurück, wenn keine Daten vorhanden sind.
 */
function getSommerferienStart(
  presetId: string,
  schuljahr: string
): Date | null {
  const ferien = getFerien(presetId, schuljahr);
  if (!ferien) return null;

  // Schlüssel, der "sommer" enthält (z.B. "sommerferien")
  const entry = Object.entries(ferien).find(([key]) =>
    key.toLowerCase().includes("sommer")
  );
  if (!entry) return null;

  return parseLocalDate(entry[1].start);
}

/**
 * Gibt das aktuelle Schuljahr zurück.
 *
 * Der Wechsel auf das neue Schuljahr erfolgt am ersten Tag der Sommerferien
 * (aus dem Ferien-Preset). Solange für das Preset keine Feriendaten vorliegen,
 * wird als Fallback der 1. Juli verwendet (typischer Sommerferienbeginn in der
 * Deutschschweiz).
 */
export function getAktuellesSchuljahr(presetId: string = "SO_BeLoSe"): string {
  const now = new Date();
  const year = now.getFullYear();

  // Die Sommerferien, die den Wechsel markieren, gehören zum ablaufenden
  // Schuljahr (Y-1)/Y und finden im Kalenderjahr Y statt.
  const endingSchuljahr = `${year - 1}/${year}`;
  const sommerStart =
    getSommerferienStart(presetId, endingSchuljahr) ?? new Date(year, 6, 1); // Fallback: 1. Juli

  // Ab dem ersten Ferientag zählt das neue Schuljahr.
  if (now >= sommerStart) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
}

/**
 * Generiert eine Liste von Schuljahren
 */
export function getSchuljahrListe(futureCount: number = 3, pastCount: number = 1): string[] {
  const currentYear = new Date().getFullYear();
  const schuljahre: string[] = [];

  for (let i = -pastCount; i < futureCount; i++) {
    const startYear = currentYear + i;
    schuljahre.push(`${startYear}/${startYear + 1}`);
  }

  return schuljahre;
}

/**
 * Prüft, ob eine Kalenderwoche in benutzerdefinierten Ferien liegt
 */
export function istFerienWocheCustom(
  customFerien: SchulferienCustom[],
  kalenderwoche: number,
  jahr: number
): { istFerien: boolean; ferienName?: string } {
  if (customFerien.length === 0) {
    return { istFerien: false };
  }

  const montag = getMondayOfWeek(kalenderwoche, jahr);
  const freitag = getFridayOfWeek(kalenderwoche, jahr);

  for (const ferien of customFerien) {
    const start = parseLocalDate(ferien.start);
    const ende = parseLocalDate(ferien.ende);

    // Overlap-Prüfung: Woche überlappt mit Ferien
    if (montag <= ende && freitag >= start) {
      return { istFerien: true, ferienName: ferien.ferienName };
    }
  }

  return { istFerien: false };
}

/**
 * Gibt die Schulwochen eines Schuljahrs zurück (ca. 38 Wochen)
 * Unterstützt optionale benutzerdefinierte Ferien, die Preset-Ferien überschreiben.
 */
export function getSchulwochenFuerSchuljahr(
  presetId: string,
  schuljahr: string,
  customFerien?: SchulferienCustom[]
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

  const useCustom = customFerien && customFerien.length > 0;

  // Schuljahr parsen (z.B. "2025/2026")
  const [startYear] = schuljahr.split("/").map(Number);
  const endYear = startYear + 1;

  // Sportferien-Grenze bestimmen (Q2/Q3-Boundary)
  // Lehrpersonen planen "von Ferien zu Ferien":
  // Q2 = Herbst→Sport (inkl. Weihnachten→Sport), Q3 = Sport→Frühling
  const sportEndeKW = findSportferienEndeKW(presetId, schuljahr, customFerien);

  // Q1: Sommer→Herbst, Q2: Herbst→Weihnachten (KW 33-52)
  for (let kw = 33; kw <= 52; kw++) {
    const ferien = useCustom
      ? istFerienWocheCustom(customFerien, kw, startYear)
      : istFerienWoche(presetId, schuljahr, kw, startYear);
    wochen.push({
      kw,
      jahr: startYear,
      quartal: kw <= 41 ? 1 : 2,
      ...ferien,
    });
  }

  // Q2b + Q3 + Q4: Januar - Juli (KW 1-27)
  // KW 1 bis sportEndeKW → Q2 (Weihnachten→Sport)
  // KW sportEndeKW+1 bis 14 → Q3 (Sport→Frühling)
  // KW 15+ → Q4 (Frühling→Sommer)
  for (let kw = 1; kw <= 27; kw++) {
    const ferien = useCustom
      ? istFerienWocheCustom(customFerien, kw, endYear)
      : istFerienWoche(presetId, schuljahr, kw, endYear);
    wochen.push({
      kw,
      jahr: endYear,
      quartal: kw <= sportEndeKW ? 2 : kw <= 14 ? 3 : 4,
      ...ferien,
    });
  }

  return wochen;
}
