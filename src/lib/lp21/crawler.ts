/**
 * LP21 Hierarchie-Crawler
 *
 * Traversiert den Kompetenzaufbau-Baum der LP21 API
 * und sammelt alle Kompetenzstufen für einen Fachbereich.
 *
 * Hierarchie: Fachbereich → [Fach] → Kompetenzbereich →
 *             [Handlungs-/Themenaspekt] → Kompetenz →
 *             [Aufbau] → Kompetenzstufe → Aufzählungspunkt
 */

import { getData, getDataBatch, extractUidFromUrl } from "./client";
import {
  LP21GetDataResponse,
  LP21Kanton,
  LP21Sprache,
  LP21CrawlResult,
  LP21KompetenzbereichResult,
  LP21KompetenzResult,
  LP21KompetenzstufeResult,
  LP21CrawlProgress,
} from "./types";

// ============================================
// Bekannte UIDs
// ============================================

/**
 * UID des Kompetenzaufbau-Wurzelelements.
 * Dieses Element hat strukturtyp="Kompetenzaufbau" und
 * enthält alle Fachbereiche als hierarchie_unten.
 */
const KOMPETENZAUFBAU_UID = "00000000000000000000000000000000";

// ============================================
// Crawler
// ============================================

/**
 * Crawlt einen kompletten Fachbereich der LP21 API
 *
 * @param fachbereichCode - Code des Fachbereichs (z.B. "MI" für Medien und Informatik)
 * @param kanton - Kantonscode (default: v-fe)
 * @param sprache - Sprachcode (default: de)
 * @param onProgress - Optionaler Progress-Callback
 * @returns Vollständiges Ergebnis mit allen Kompetenzstufen
 */
export async function crawlFachbereich(
  fachbereichCode: string,
  kanton?: LP21Kanton,
  sprache?: LP21Sprache,
  onProgress?: (progress: LP21CrawlProgress) => void
): Promise<LP21CrawlResult> {
  const startTime = Date.now();

  // 1. Kompetenzaufbau laden → Fachbereiche finden
  onProgress?.({
    phase: "fachbereich",
    current: 0,
    total: 1,
    message: "Lade Kompetenzaufbau...",
  });

  const kompetenzaufbau = await getData(KOMPETENZAUFBAU_UID, kanton, sprache);

  if (!kompetenzaufbau.hierarchie_unten?.length) {
    throw new Error("Kompetenzaufbau hat keine Fachbereiche");
  }

  // 2. Alle Fachbereiche laden und den gesuchten finden
  const fachbereichUids = kompetenzaufbau.hierarchie_unten.map(extractUidFromUrl);
  const fachbereiche = await getDataBatch(fachbereichUids, kanton, sprache);

  let targetFachbereich: LP21GetDataResponse | null = null;
  let targetUid = "";

  for (const [uid, fb] of fachbereiche) {
    if (fb.code?.startsWith(fachbereichCode)) {
      targetFachbereich = fb;
      targetUid = uid;
      break;
    }
  }

  if (!targetFachbereich) {
    throw new Error(
      `Fachbereich "${fachbereichCode}" nicht gefunden. Verfügbare: ${Array.from(fachbereiche.values())
        .map((fb) => fb.code)
        .join(", ")}`
    );
  }

  onProgress?.({
    phase: "fachbereich",
    current: 1,
    total: 1,
    message: `Fachbereich gefunden: ${getBezeichnung(targetFachbereich)}`,
  });

  // 3. Navigiere die Hierarchie unter dem Fachbereich
  // MI hat keine Fächer und keine Handlungs-/Themenaspekte,
  // aber wir behandeln den allgemeinen Fall.
  const kompetenzbereiche = await crawlKompetenzbereiche(
    targetFachbereich,
    targetUid,
    kanton,
    sprache,
    onProgress
  );

  const totalKompetenzstufen = kompetenzbereiche.reduce(
    (sum, kb) => sum + kb.kompetenzen.reduce((s, k) => s + k.kompetenzstufen.length, 0),
    0
  );

  return {
    fachbereich: {
      uid: targetUid,
      code: targetFachbereich.code || fachbereichCode,
      bezeichnung: getBezeichnung(targetFachbereich),
    },
    kompetenzbereiche,
    totalKompetenzstufen,
    duration: Date.now() - startTime,
  };
}

/**
 * Crawlt alle Kompetenzbereiche eines Fachbereichs
 */
async function crawlKompetenzbereiche(
  fachbereich: LP21GetDataResponse,
  fachbereichUid: string,
  kanton?: LP21Kanton,
  sprache?: LP21Sprache,
  onProgress?: (progress: LP21CrawlProgress) => void
): Promise<LP21KompetenzbereichResult[]> {
  // Fachbereich kann direkt Kompetenzbereiche haben oder zuerst Fächer
  let kompetenzbereichElements: { uid: string; data: LP21GetDataResponse }[] = [];

  const childUids = (fachbereich.hierarchie_unten || []).map(extractUidFromUrl);
  if (childUids.length === 0) return [];

  const children = await getDataBatch(childUids, kanton, sprache);

  for (const [uid, child] of children) {
    if (child.strukturtyp === "Kompetenzbereich") {
      kompetenzbereichElements.push({ uid, data: child });
    } else if (child.strukturtyp === "Fach") {
      // Fach hat Kompetenzbereiche als Kinder
      const kbUids = (child.hierarchie_unten || []).map(extractUidFromUrl);
      const kbs = await getDataBatch(kbUids, kanton, sprache);
      for (const [kbUid, kb] of kbs) {
        if (kb.strukturtyp === "Kompetenzbereich") {
          kompetenzbereichElements.push({ uid: kbUid, data: kb });
        }
      }
    }
  }

  onProgress?.({
    phase: "kompetenzbereich",
    current: 0,
    total: kompetenzbereichElements.length,
    message: `${kompetenzbereichElements.length} Kompetenzbereiche gefunden`,
  });

  const results: LP21KompetenzbereichResult[] = [];

  for (let i = 0; i < kompetenzbereichElements.length; i++) {
    const { uid, data } = kompetenzbereichElements[i];

    onProgress?.({
      phase: "kompetenzbereich",
      current: i + 1,
      total: kompetenzbereichElements.length,
      message: `Verarbeite ${data.code}: ${getBezeichnung(data)}`,
    });

    const kompetenzen = await crawlKompetenzen(data, kanton, sprache, onProgress);

    results.push({
      uid,
      code: data.code || "",
      bezeichnung: getBezeichnung(data),
      kompetenzen,
    });
  }

  return results;
}

/**
 * Crawlt alle Kompetenzen eines Kompetenzbereichs
 */
async function crawlKompetenzen(
  kompetenzbereich: LP21GetDataResponse,
  kanton?: LP21Kanton,
  sprache?: LP21Sprache,
  onProgress?: (progress: LP21CrawlProgress) => void
): Promise<LP21KompetenzResult[]> {
  const childUids = (kompetenzbereich.hierarchie_unten || []).map(extractUidFromUrl);
  if (childUids.length === 0) return [];

  const children = await getDataBatch(childUids, kanton, sprache);
  let kompetenzElements: { uid: string; data: LP21GetDataResponse }[] = [];

  for (const [uid, child] of children) {
    if (child.strukturtyp === "Kompetenz") {
      kompetenzElements.push({ uid, data: child });
    } else if (child.strukturtyp === "Handlungs-/Themenaspekt" || child.strukturtyp === "Handlungs/Themenaspekt") {
      // Handlungs-/Themenaspekt hat Kompetenzen als Kinder
      const kUids = (child.hierarchie_unten || []).map(extractUidFromUrl);
      const ks = await getDataBatch(kUids, kanton, sprache);
      for (const [kUid, k] of ks) {
        if (k.strukturtyp === "Kompetenz") {
          kompetenzElements.push({ uid: kUid, data: k });
        }
      }
    }
  }

  const results: LP21KompetenzResult[] = [];

  for (const { uid, data } of kompetenzElements) {
    const kompetenzstufen = await crawlKompetenzstufen(data, kanton, sprache);

    results.push({
      uid,
      code: data.code || "",
      bezeichnung: getBezeichnung(data),
      kompetenzstufen,
    });
  }

  return results;
}

/**
 * Crawlt alle Kompetenzstufen einer Kompetenz
 */
async function crawlKompetenzstufen(
  kompetenz: LP21GetDataResponse,
  kanton?: LP21Kanton,
  sprache?: LP21Sprache
): Promise<LP21KompetenzstufeResult[]> {
  const childUids = (kompetenz.hierarchie_unten || []).map(extractUidFromUrl);
  if (childUids.length === 0) return [];

  const children = await getDataBatch(childUids, kanton, sprache);
  let kompetenzstufeElements: { uid: string; data: LP21GetDataResponse }[] = [];

  for (const [uid, child] of children) {
    if (child.strukturtyp === "Kompetenzstufe") {
      kompetenzstufeElements.push({ uid, data: child });
    } else if (child.strukturtyp === "Aufbau") {
      // Aufbau hat Kompetenzstufen als Kinder
      const ksUids = (child.hierarchie_unten || []).map(extractUidFromUrl);
      const kss = await getDataBatch(ksUids, kanton, sprache);
      for (const [ksUid, ks] of kss) {
        if (ks.strukturtyp === "Kompetenzstufe") {
          kompetenzstufeElements.push({ uid: ksUid, data: ks });
        }
      }
    }
  }

  const results: LP21KompetenzstufeResult[] = [];

  for (const { uid, data } of kompetenzstufeElements) {
    // Aufzählungspunkte laden
    const aufzaehlungspunkte = await crawlAufzaehlungspunkte(data, kanton, sprache);

    results.push({
      uid,
      code: data.code || "",
      zyklus: data.zyklus || "",
      grundanspruch: data.grundanspruch === true,
      orientierungspunkt: data.orientierungspunkt === true,
      orientierungspunktVorher: typeof data.orientierungspunkt_vorher === "number" ? data.orientierungspunkt_vorher : undefined,
      aufzaehlungspunkte,
      querverweise: data.querverweise,
    });
  }

  // Post-Processing: Orientierungspunkte korrekt zuordnen
  // Die LP21 API markiert manchmal die Stufe NACH der OP-Grenze mit orientierungspunkt=true.
  // Im Lehrplan ist der OP die LETZTE Stufe, die Schüler erreichen sollen (die VOR der Grenze).
  // Strategie:
  // 1. Wenn eine Stufe orientierungspunkt_vorher hat, ist die OP-Grenze VOR dieser Stufe
  //    → markiere die vorherige Stufe als OP
  // 2. Wenn orientierungspunkt=true auf einer Stufe ist und orientierungspunkt_vorher
  //    auch gesetzt ist, verschiebe den OP zur vorherigen Stufe
  results.sort((a, b) => a.code.localeCompare(b.code));

  for (let i = 0; i < results.length; i++) {
    const ks = results[i];
    // Wenn diese Stufe orientierungspunkt_vorher hat, ist die OP-Grenze VOR ihr
    if (typeof ks.orientierungspunktVorher === "number") {
      // Die Stufe davor sollte den OP haben
      if (i > 0 && !results[i - 1].orientierungspunkt) {
        results[i - 1].orientierungspunkt = true;
      }
      // Wenn die aktuelle Stufe orientierungspunkt=true hat UND orientierungspunkt_vorher,
      // dann ist der OP eigentlich auf der vorherigen Stufe
      if (ks.orientierungspunkt && i > 0) {
        ks.orientierungspunkt = false;
        results[i - 1].orientierungspunkt = true;
      }
    }
  }

  return results;
}

/**
 * Crawlt Aufzählungspunkte einer Kompetenzstufe
 */
async function crawlAufzaehlungspunkte(
  kompetenzstufe: LP21GetDataResponse,
  kanton?: LP21Kanton,
  sprache?: LP21Sprache
): Promise<{ bezeichnung: string; begriffe?: string }[]> {
  const childUids = (kompetenzstufe.hierarchie_unten || []).map(extractUidFromUrl);
  if (childUids.length === 0) {
    // Kompetenzstufe hat manchmal die Bezeichnung direkt
    if (kompetenzstufe.bezeichnung) {
      return [{ bezeichnung: getBezeichnung(kompetenzstufe) }];
    }
    return [];
  }

  const children = await getDataBatch(childUids, kanton, sprache);
  const results: { bezeichnung: string; begriffe?: string }[] = [];

  for (const [, child] of children) {
    if (child.strukturtyp === "Aufzaehlungspunkt" || child.strukturtyp === "Aufzählungspunkt") {
      results.push({
        bezeichnung: getBezeichnung(child),
        begriffe: typeof child.begriffe === "string" ? child.begriffe : undefined,
      });
    }
  }

  return results;
}

// ============================================
// Hilfsfunktionen
// ============================================

/**
 * Extrahiert die Bezeichnung aus einem LP21 Element.
 * Das Feld kann ein String oder ein Array sein.
 */
function getBezeichnung(element: LP21GetDataResponse): string {
  const bez = element.bezeichnung;
  if (typeof bez === "string") return bez;
  if (Array.isArray(bez) && bez.length > 0) return bez[0];
  return "";
}
