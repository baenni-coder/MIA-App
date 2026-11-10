import { ALLE_STUFEN, FACHBEREICHE, type Fachbereich, type Stufe } from "@/types";

/**
 * Kategorisierung von Lehrmitteln nach Fach und Stufe.
 * Wird von der Lehrmittel-Übersicht (Filter/Gruppierung) und der
 * Lehrmittel-API (Validierung) genutzt.
 */

const FACH_ALIASES: Record<string, Fachbereich> = {
  IB: "MI", // Solothurn: Informatische Bildung = Medien und Informatik
  FS1F: "FS1",
  FS2E: "FS2",
  TG: "TTG",
};

const FACH_CODES = new Set<string>(FACHBEREICHE.map((f) => f.value));

/** LP21-/App-Code → kanonischer Fachbereich (oder null, z.B. für SPEZIAL). */
export function normalizeFach(code: string | undefined | null): Fachbereich | null {
  if (!code) return null;
  const c = FACH_ALIASES[code] || code;
  return FACH_CODES.has(c) ? (c as Fachbereich) : null;
}

export function fachLabel(code: Fachbereich): string {
  return FACHBEREICHE.find((f) => f.value === code)?.label || code;
}

export function fachFarbe(code: Fachbereich): string {
  return FACHBEREICHE.find((f) => f.value === code)?.farbe || "#6b7280";
}

/** Reihenfolge der Fächer wie in FACHBEREICHE (für Sortierung). */
export function fachIndex(code: Fachbereich): number {
  const i = FACHBEREICHE.findIndex((f) => f.value === code);
  return i === -1 ? 999 : i;
}

export function stufeIndex(stufe: Stufe): number {
  return ALLE_STUFEN.indexOf(stufe);
}

/** Validiert/normalisiert eine Fachbereich-Liste aus einem Request-Body. */
export function sanitizeFachbereiche(value: unknown): Fachbereich[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: Fachbereich[] = [];
  for (const v of value) {
    const f = typeof v === "string" ? normalizeFach(v) : null;
    if (f && !out.includes(f)) out.push(f);
  }
  return out.sort((a, b) => fachIndex(a) - fachIndex(b));
}

/** Validiert eine Stufen-Liste aus einem Request-Body. */
export function sanitizeStufen(value: unknown): Stufe[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter(
    (v): v is Stufe => typeof v === "string" && (ALLE_STUFEN as string[]).includes(v)
  );
  return Array.from(new Set(out)).sort((a, b) => stufeIndex(a) - stufeIndex(b));
}
