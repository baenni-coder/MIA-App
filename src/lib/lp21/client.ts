/**
 * LP21 API Client
 *
 * Kommuniziert mit der Datenschnittstelle des Lehrplans 21.
 * API-Dokumentation: Datenschnittstelle_LP21-2026_02_15.pdf
 *
 * Die LP21 API ist eine einfache PHP-Anwendung die keine parallelen
 * Requests verträgt. Alle Aufrufe werden daher strikt sequentiell
 * ausgeführt (wie im offiziellen PHP-Beispielscript).
 */

import { getLP21Config } from "./config";
import { LP21GetDataResponse, LP21Kanton, LP21Sprache } from "./types";

// Request-Zähler für Logging
let requestCount = 0;

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

  requestCount++;

  // URL bauen (wie PHP-Script: https://api.lehrplan.ch/getData.php?kanton=...&uid=...&user=...&password=...)
  const params = new URLSearchParams();
  params.set("kanton", kanton || config.defaultKanton);
  params.set("sprache", sprache || (config.defaultSprache as LP21Sprache));
  params.set("uid", uid);
  params.set("user", config.username);
  params.set("password", config.password);

  const url = `${config.baseUrl}/getData.php?${params.toString()}`;

  // Logging alle 50 Requests (oder bei Root)
  if (requestCount <= 2 || requestCount % 50 === 0) {
    const debugParams = new URLSearchParams(params);
    debugParams.set("password", "***");
    console.log(`🔗 LP21 API [${requestCount}]: ${config.baseUrl}/getData.php?${debugParams.toString()}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MIA-App/1.0 (LP21 Datenschnittstelle; +https://mia.schueu.ch)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      const isCloudflare = responseText.includes("Just a moment") || responseText.includes("cloudflare");
      throw new Error(
        `LP21 API error: ${response.status} ${response.statusText}${isCloudflare ? " (Cloudflare block)" : ""}`
      );
    }

    const text = await response.text();

    // PHP gibt manchmal Warnings vor dem JSON aus
    // z.B. "\nWarning: Undefined..." gefolgt von dem eigentlichen JSON
    let jsonText = text;
    const jsonStart = text.indexOf("{");
    if (jsonStart > 0) {
      console.warn(`⚠️ LP21 API: PHP warning vor JSON (uid=${uid}): ${text.substring(0, jsonStart).trim()}`);
      jsonText = text.substring(jsonStart);
    }

    let rawData: any;
    try {
      rawData = JSON.parse(jsonText);
    } catch {
      throw new Error(`LP21 API: Ungültiges JSON für uid=${uid}: ${text.substring(0, 100)}`);
    }

    // LP21 API gibt { lp21: [ { ...element } ] } zurück
    const element = rawData?.lp21?.[0] ?? rawData;

    if (element.error) {
      throw new Error(`LP21 API returned error: ${element.error}`);
    }

    // Debug: Root-Element loggen
    if (uid === "00000000000000000000000000000000") {
      console.log(
        `✅ LP21 API Root-Element: strukturtyp=${element.strukturtyp}, ` +
          `hierarchie_unten=${element.hierarchie_unten?.length || 0} Kinder`
      );
    }

    return element as LP21GetDataResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Mehrere Elemente SEQUENTIELL laden
 *
 * Die LP21 API verträgt keine parallelen Requests (gibt PHP-Warnings
 * statt JSON zurück). Daher strikt sequentiell wie im PHP-Beispielscript.
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
  const results = new Map<string, LP21GetDataResponse>();

  // Strikt sequentiell — ein Request nach dem anderen
  for (const uid of uids) {
    try {
      const data = await getData(uid, kanton, sprache);
      results.set(uid, data);
    } catch (error) {
      console.error(`❌ LP21 getData failed for uid=${uid}:`, error instanceof Error ? error.message : error);
    }
  }

  return results;
}

/**
 * Child-Elemente eines Elements laden
 * Folgt den hierarchie_unten Links
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

/**
 * Reset request counter (für Tests oder neuen Sync-Lauf)
 */
export function resetRequestCount(): void {
  requestCount = 0;
}
