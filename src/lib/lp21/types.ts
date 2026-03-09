/**
 * TypeScript Interfaces für die LP21 API Datenschnittstelle
 * Basierend auf: Datenschnittstelle_LP21-2026_02_15.pdf
 */

// ============================================
// API Response Basistypen
// ============================================

/** Basis-Element mit gemeinsamen Feldern */
export interface LP21BaseElement {
  uid: string;
  strukturtyp: string;
  kanton: string;
  sprache?: string;
  url?: string;
  hierarchie_oben?: string;
  hierarchie_oben_typ?: string;
}

// ============================================
// Kompetenzaufbau-Hierarchie
// ============================================

/** Fachbereich (z.B. "Medien und Informatik") */
export interface LP21Fachbereich extends LP21BaseElement {
  f_id: number;
  bezeichnung: string;
  code: string;
  hierarchie_unten?: string[];
  hierarchie_unten_typ?: string;
  hierarchie_unten_kapitel?: string[];
  hierarchie_unten_kapitel_typ?: string;
}

/** Fach - fakultatives Element (2. Ebene) */
export interface LP21Fach extends LP21BaseElement {
  fb_id: number;
  f_id: number;
  bezeichnung: string;
  code: string;
  hierarchie_unten?: string[];
  hierarchie_unten_typ?: string;
}

/** Kompetenzbereich (z.B. "MI.1 - Medien") */
export interface LP21Kompetenzbereich extends LP21BaseElement {
  fb_id: number;
  f_id: number;
  kb_id: number;
  bezeichnung: string;
  code: string;
  hierarchie_unten?: string[];
  hierarchie_unten_typ?: string;
}

/** Handlungs-/Themenaspekt (fakultativ, nicht bei MI) */
export interface LP21HandlungsThemenaspekt extends LP21BaseElement {
  fb_id: number;
  f_id: number;
  kb_id: number;
  ha_id: number;
  bezeichnung: string;
  code: string;
  hierarchie_unten?: string[];
  hierarchie_unten_typ?: string;
}

/** Kompetenz (z.B. "MI.1.1") */
export interface LP21Kompetenz extends LP21BaseElement {
  fb_id: number;
  f_id: number;
  kb_id: number;
  ha_id: number;
  k_id: number;
  bezeichnung: string;
  code: string;
  hierarchie_unten?: string[];
  hierarchie_unten_typ?: string;
  querverweise?: string[];
}

/** Aufbau - fakultativ (nur bei Gestalten, Bewegung und Sport) */
export interface LP21Aufbau extends LP21BaseElement {
  fb_id: number;
  f_id: number;
  kb_id: number;
  ha_id: number;
  k_id: number;
  aufbau: number;
}

/** Kompetenzstufe (z.B. "MI.1.1.a") - Kerneinheit für MIA-App */
export interface LP21Kompetenzstufe extends LP21BaseElement {
  fb_id: number;
  f_id: number;
  kb_id: number;
  ha_id: number;
  k_id: number;
  aufbau: number;
  zyklus: string;
  code: string;
  bezeichnung: string;
  grundanspruch?: boolean;
  orientierungspunkt?: boolean;
  orientierungspunkt_vorher?: number;
  linie_oben?: number;
  linie_unten?: number;
  anzahl_in_zyklus?: number;
  anzahl_in_kompetenz?: number;
  folge_in_aufbau?: number;
  folge_in_zyklus?: number;
  spaeter_im_Zyklus?: boolean;
  hierarchie_unten?: string[];
  hierarchie_unten_typ?: string;
  querverweise?: string[];
}

/** Aufzählungspunkt - Textinhalt einer Kompetenzstufe */
export interface LP21Aufzaehlungspunkt extends LP21BaseElement {
  fb_id: number;
  f_id: number;
  kb_id: number;
  ha_id: number;
  k_id: number;
  aufbau: number;
  zyklus: string;
  aufzählungspunkt: number;
  bezeichnung: string;
  begriffe?: string;
}

// ============================================
// getData API Response
// ============================================

/**
 * Generischer API Response von getData
 * Die Struktur variiert je nach Element-Typ
 */
export interface LP21GetDataResponse {
  uid: string;
  strukturtyp: string;
  kanton: string;
  sprache?: string;
  url?: string;
  code?: string;
  bezeichnung?: string | string[];
  titel?: string | string[];
  inhalt?: string;
  fussnoten?: string;

  // Hierarchie-IDs
  fb_id?: number;
  f_id?: number;
  kb_id?: number;
  ha_id?: number;
  k_id?: number;
  aufbau?: number;
  zyklus?: string;
  aufzählungspunkt?: number;

  // Kapitelnummern
  u1?: number;
  absatzfolge?: number;

  // Kompetenzstufen-spezifisch
  grundanspruch?: boolean;
  orientierungspunkt?: boolean;
  orientierungspunkt_vorher?: number;
  linie_oben?: number;
  linie_unten?: number;
  anzahl_in_zyklus?: number;
  anzahl_in_kompetenz?: number;
  folge_in_aufbau?: number;
  folge_in_zyklus?: number;
  spaeter_im_Zyklus?: boolean;

  // Aufzählungspunkt
  begriffe?: string;

  // Navigation
  hierarchie_oben?: string;
  hierarchie_oben_typ?: string;
  hierarchie_unten?: string[];
  hierarchie_unten_typ?: string;
  hierarchie_unten_kapitel?: string[];
  hierarchie_unten_kapitel_typ?: string;

  // Querverweise
  querverweise?: string[];

  // Fehler
  error?: string;
}

// ============================================
// Kanton-Codes für LP21 API
// ============================================

/** LP21 API Kanton-Codes (Kleinbuchstaben, andere als App-Kantone) */
export type LP21Kanton =
  | "v-fe" | "v-ef"    // Vorlagen
  | "ag" | "ai" | "ar" | "be" | "bl" | "bs"
  | "fr" | "fl" | "gl"
  | "gr-d" | "gr-r" | "gr-i"  // Graubünden: deutsch, rätoromanisch, italienisch
  | "lu" | "nw" | "ow"
  | "sg" | "sh" | "so" | "sz"
  | "tg" | "ur" | "vs" | "zg" | "zh";

/** LP21 API Sprachcodes */
export type LP21Sprache = "de" | "fr" | "it" | "rm" | "en";

/** LP21 Zyklus-Codes */
export type LP21Zyklus = "1" | "12" | "2" | "23" | "3";

// ============================================
// Crawler-Typen
// ============================================

/** Ergebnis des LP21-Crawlers */
export interface LP21CrawlResult {
  fachbereich: {
    uid: string;
    code: string;
    bezeichnung: string;
  };
  kompetenzbereiche: LP21KompetenzbereichResult[];
  totalKompetenzstufen: number;
  duration: number;
}

/** Kompetenzbereich mit aufgelösten Kompetenzen */
export interface LP21KompetenzbereichResult {
  uid: string;
  code: string;
  bezeichnung: string;
  kompetenzen: LP21KompetenzResult[];
}

/** Kompetenz mit aufgelösten Kompetenzstufen */
export interface LP21KompetenzResult {
  uid: string;
  code: string;
  bezeichnung: string;
  kompetenzstufen: LP21KompetenzstufeResult[];
}

/** Kompetenzstufe mit Aufzählungspunkten */
export interface LP21KompetenzstufeResult {
  uid: string;
  code: string;
  zyklus: string;
  grundanspruch: boolean;
  orientierungspunkt: boolean;
  aufzaehlungspunkte: {
    bezeichnung: string;
    begriffe?: string;
  }[];
  querverweise?: string[];
}

/** Progress-Callback für den Crawler */
export interface LP21CrawlProgress {
  phase: "fachbereich" | "kompetenzbereich" | "kompetenz" | "kompetenzstufe";
  current: number;
  total: number;
  message: string;
}
