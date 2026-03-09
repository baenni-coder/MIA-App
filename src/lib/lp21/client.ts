/**
 * LP21 API Client
 *
 * Kommuniziert mit der Datenschnittstelle des Lehrplans 21.
 * API-Dokumentation: Datenschnittstelle_LP21-2026_02_15.pdf
 *
 * Hauptmethode: getData
 * - GET https://api.lehrplan.ch/getData.php?kanton=<KT>&sprache=<SPRACHE>&uid=<UID>
 * - GET https://api.lehrplan.ch/<UID> (Default: v-fe, DE)
 */

import { getLP21Config } from "./config";
import { LP21GetDataResponse, LP21Kanton, LP21Sprache } from "./types";

// ============================================
// Rate Limiting
// ============================================

let lastRequestTime = 0;

async function rateLimitDelay(): Promise<void> {
  const config = getLP21Config();
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < config.requestDelay) {
    await new Promise((resolve) => setTimeout(resolve, config.requestDelay - elapsed));
  }
  lastRequestTime = Date.now();
}

// ============================================
// API Client
// ============================================

/**
 * Einzelnes Lehrplan-Element nach UID laden
 *
 * @param uid - Eindeutiger Identifikator des Elements
 * @param kanton - Kantonscode (default: v-fe)
 * @param sprache - Sprachcode (default: de)
 * @returns LP21 Element-Daten
 */
export async function getData(
  uid: string,
  kanton?: LP21Kanton,
  sprache?: LP21Sprache
): Promise<LP21GetDataResponse> {
  const config = getLP21Config();

  await rateLimitDelay();

  const params = new URLSearchParams();
  params.set("kanton", kanton || config.defaultKanton);
  params.set("sprache", sprache || (config.defaultSprache as LP21Sprache));
  params.set("uid", uid);

  const url = `${config.baseUrl}/getData.php?${params.toString()}`;

  const authHeader = "Basic " + Buffer.from(`${config.username}:${config.password}`).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`LP21 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`LP21 API returned error: ${data.error}`);
    }

    return data as LP21GetDataResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Mehrere Elemente parallel laden (mit Rate Limiting)
 *
 * @param uids - Array von UIDs
 * @param kanton - Kantonscode
 * @param sprache - Sprachcode
 * @returns Map von UID → Response
 */
export async function getDataBatch(
  uids: string[],
  kanton?: LP21Kanton,
  sprache?: LP21Sprache
): Promise<Map<string, LP21GetDataResponse>> {
  const config = getLP21Config();
  const results = new Map<string, LP21GetDataResponse>();

  // Verarbeite in Batches von maxConcurrent
  for (let i = 0; i < uids.length; i += config.maxConcurrent) {
    const batch = uids.slice(i, i + config.maxConcurrent);

    const promises = batch.map(async (uid) => {
      try {
        const data = await getData(uid, kanton, sprache);
        return { uid, data };
      } catch (error) {
        console.error(`❌ LP21 getData failed for uid=${uid}:`, error);
        return { uid, data: null };
      }
    });

    const batchResults = await Promise.all(promises);

    for (const result of batchResults) {
      if (result.data) {
        results.set(result.uid, result.data);
      }
    }
  }

  return results;
}

/**
 * Child-Elemente eines Elements laden
 * Folgt den hierarchie_unten Links
 *
 * @param parentUid - UID des Eltern-Elements
 * @param kanton - Kantonscode
 * @param sprache - Sprachcode
 * @returns Array der Kind-Elemente
 */
export async function getChildren(
  parentUid: string,
  kanton?: LP21Kanton,
  sprache?: LP21Sprache
): Promise<LP21GetDataResponse[]> {
  const parent = await getData(parentUid, kanton, sprache);

  if (!parent.hierarchie_unten || parent.hierarchie_unten.length === 0) {
    return [];
  }

  // hierarchie_unten enthält URLs, wir brauchen die UIDs
  const childUids = parent.hierarchie_unten.map(extractUidFromUrl);
  const childMap = await getDataBatch(childUids, kanton, sprache);

  return Array.from(childMap.values());
}

/**
 * Extrahiert die UID aus einer LP21 API URL
 * z.B. "https://api.lehrplan.ch/getData.php?...&uid=ABC123" → "ABC123"
 * oder "https://api.lehrplan.ch/ABC123" → "ABC123"
 */
export function extractUidFromUrl(url: string): string {
  // Versuche zuerst als Query-Parameter
  try {
    const urlObj = new URL(url);
    const uid = urlObj.searchParams.get("uid");
    if (uid) return uid;
  } catch {
    // Nicht parsbar als URL
  }

  // Fallback: Letzter Pfad-Teil
  const parts = url.split("/");
  return parts[parts.length - 1];
}
