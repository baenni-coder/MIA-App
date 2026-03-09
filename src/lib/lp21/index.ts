/**
 * LP21 API Integration
 *
 * Exports für die Lehrplan 21 Datenschnittstelle
 */

export { getData, getDataBatch, getChildren, extractUidFromUrl } from "./client";
export { crawlFachbereich } from "./crawler";
export { mapCrawlResultToKompetenzen, mapToSystemKompetenzen } from "./mapper";
export { getLP21Config, kantonToLP21 } from "./config";
export type {
  LP21GetDataResponse,
  LP21Fachbereich,
  LP21Kompetenzbereich,
  LP21Kompetenz,
  LP21Kompetenzstufe,
  LP21Aufzaehlungspunkt,
  LP21CrawlResult,
  LP21CrawlProgress,
  LP21Kanton,
  LP21Sprache,
} from "./types";
