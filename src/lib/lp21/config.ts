/**
 * LP21 API Konfiguration
 *
 * Die Schnittstelle ist passwortgeschützt und erfordert eine
 * Nutzungsvereinbarung mit der D-EDK Geschäftsstelle.
 */

import { Kanton } from "@/types";
import { LP21Kanton } from "./types";

// ============================================
// Konfiguration
// ============================================

const LP21_API_URL = process.env.LP21_API_URL || "https://api.lehrplan.ch";
const LP21_API_USERNAME = process.env.LP21_API_USERNAME;
const LP21_API_PASSWORD = process.env.LP21_API_PASSWORD;
const LP21_DEFAULT_KANTON = (process.env.LP21_DEFAULT_KANTON || "v-fe") as LP21Kanton;
const LP21_DEFAULT_SPRACHE = process.env.LP21_DEFAULT_SPRACHE || "de";

/** Maximale Anzahl gleichzeitiger API-Requests */
const LP21_MAX_CONCURRENT = 5;

/** Delay zwischen Requests in ms (Rate Limiting) */
const LP21_REQUEST_DELAY = 200;

/** Request Timeout in ms */
const LP21_REQUEST_TIMEOUT = 15000;

export function getLP21Config() {
  if (!LP21_API_USERNAME || !LP21_API_PASSWORD) {
    throw new Error(
      "LP21 API credentials missing. Set LP21_API_USERNAME and LP21_API_PASSWORD environment variables."
    );
  }

  return {
    baseUrl: LP21_API_URL,
    username: LP21_API_USERNAME,
    password: LP21_API_PASSWORD,
    defaultKanton: LP21_DEFAULT_KANTON,
    defaultSprache: LP21_DEFAULT_SPRACHE,
    maxConcurrent: LP21_MAX_CONCURRENT,
    requestDelay: LP21_REQUEST_DELAY,
    requestTimeout: LP21_REQUEST_TIMEOUT,
  };
}

// ============================================
// Kanton-Mapping: App-Kanton → LP21-Kanton
// ============================================

/**
 * Mapping von MIA-App Kantoncodes (Grossbuchstaben)
 * zu LP21 API Kantoncodes (Kleinbuchstaben)
 */
const KANTON_MAP: Record<Kanton, LP21Kanton> = {
  AG: "ag",
  AI: "ai",
  AR: "ar",
  BE: "be",
  BL: "bl",
  BS: "bs",
  FR: "fr",
  GE: "v-fe", // Genf nutzt Vorlage (französischsprachig)
  GL: "gl",
  GR: "gr-d", // Default: deutschsprachige Schulen
  JU: "v-fe", // Jura nutzt Vorlage
  LU: "lu",
  NE: "v-fe", // Neuenburg nutzt Vorlage
  NW: "nw",
  OW: "ow",
  SG: "sg",
  SH: "sh",
  SO: "so",
  SZ: "sz",
  TG: "tg",
  TI: "v-fe", // Tessin nutzt Vorlage (italienischsprachig)
  UR: "ur",
  VD: "v-fe", // Waadt nutzt Vorlage
  VS: "vs",
  ZG: "zg",
  ZH: "zh",
};

/**
 * Konvertiert App-Kanton zu LP21 API Kanton-Code
 */
export function kantonToLP21(kanton?: Kanton | string): LP21Kanton {
  if (!kanton) return LP21_DEFAULT_KANTON;
  return KANTON_MAP[kanton as Kanton] || LP21_DEFAULT_KANTON;
}
