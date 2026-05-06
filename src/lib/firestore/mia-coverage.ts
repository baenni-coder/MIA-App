import { getJahresplanEinheiten } from "@/lib/firestore/jahresplanung";
import {
  getSystemKompetenzen,
  getSystemThemeByAirtableId,
} from "@/lib/firestore/system-cache";
import { getCustomThemeById } from "@/lib/firestore/custom-themes";
import {
  JahresplanEinheit,
  Kanton,
  MiaBereich,
  MiaCoverageEinheit,
  MiaCoverageResult,
  MiaCoverageStats,
  Stufe,
  SystemKompetenz,
} from "@/types";

/**
 * Mapping Stufe → Zyklus für den Filter.
 * Zyklus 1: KiGa, 1.+2. Klasse
 * Zyklus 2: 3.–6. Klasse
 * Zyklus 3: 7.–9. Klasse
 */
function stufeToZyklus(stufe: Stufe | undefined): string | null {
  if (!stufe) return null;
  if (stufe === "KiGa" || stufe === "1. Klasse" || stufe === "2. Klasse")
    return "Zyklus 1";
  if (
    stufe === "3. Klasse" ||
    stufe === "4. Klasse" ||
    stufe === "5. Klasse" ||
    stufe === "6. Klasse"
  )
    return "Zyklus 2";
  return "Zyklus 3";
}

/**
 * Normalisiert einen LP-Code auf die MI.-Variante, damit MI.x.y und IB.x.y
 * als dieselbe Kompetenz behandelt werden. Anwendungskompetenzen bekommen
 * je nach Quelle MI.3 oder IB.3 – beides wird zu MI.3 normalisiert.
 */
function canonicalizeLpCode(lpCode: string | undefined): string | null {
  if (!lpCode) return null;
  if (lpCode.startsWith("IB.")) return "MI." + lpCode.slice(3);
  return lpCode;
}

/**
 * Display-Code je nach Kanton (SO → IB, sonst MI).
 */
function toDisplayCode(canonicalCode: string, kanton?: Kanton): string {
  if (kanton === "SO" && canonicalCode.startsWith("MI.")) {
    return "IB." + canonicalCode.slice(3);
  }
  return canonicalCode;
}

/**
 * Klassifiziert eine Kompetenz in einen MIA-Bereich.
 * MI.1 → Medien, MI.2 → Informatik, MI.3 → Anwendungskompetenzen
 * (Anwendungskompetenzen werden in Airtable evtl. als "Anwendungskompetenzen"
 * im Feld kompetenzbereich geführt.)
 */
function classifyBereich(
  canonicalCode: string,
  kompetenzbereich?: string
): MiaBereich {
  if (kompetenzbereich) {
    const kb = kompetenzbereich.toLowerCase();
    if (kb.includes("anwendungs")) return "anwendungskompetenzen";
    if (kb.includes("medien")) return "medien";
    if (kb.includes("informatik")) return "informatik";
  }
  // Fallback über LP-Code
  if (canonicalCode.startsWith("MI.1") || canonicalCode.startsWith("IB.1"))
    return "medien";
  if (canonicalCode.startsWith("MI.2") || canonicalCode.startsWith("IB.2"))
    return "informatik";
  if (canonicalCode.startsWith("MI.3") || canonicalCode.startsWith("IB.3"))
    return "anwendungskompetenzen";
  return "medien";
}

/**
 * Filtert Kompetenzen auf MI/IB (alle drei Bereiche).
 */
function isMiaKompetenz(k: SystemKompetenz): boolean {
  if (k.lpCode && (k.lpCode.startsWith("MI.") || k.lpCode.startsWith("IB.")))
    return true;
  // Anwendungskompetenzen können auch ohne MI./IB.-Präfix kommen
  if (k.kompetenzbereich?.toLowerCase().includes("anwendungs")) return true;
  return false;
}

/**
 * Resolves linkedMiaTheme → kompetenzenIds aus Firestore.
 * Versucht zuerst SystemTheme (Airtable-Original), dann Custom Theme.
 * Cache vermeidet doppelte Abfragen während eines Coverage-Runs.
 */
async function getThemeKompetenzIds(
  themeId: string,
  cache: Map<string, string[]>
): Promise<string[]> {
  if (cache.has(themeId)) return cache.get(themeId)!;

  // Versuche SystemTheme
  const systemTheme = await getSystemThemeByAirtableId(themeId).catch(() => null);
  if (systemTheme) {
    const ids = systemTheme.kompetenzenIds || [];
    cache.set(themeId, ids);
    return ids;
  }

  // Fallback Custom Theme
  const customTheme = await getCustomThemeById(themeId).catch(() => null);
  if (customTheme) {
    const ids = customTheme.kompetenzenIds || [];
    cache.set(themeId, ids);
    return ids;
  }

  // Theme existiert nicht mehr → leere Liste, damit der Coverage-Algorithmus
  // weitermacht (Orphan-Handling).
  cache.set(themeId, []);
  return [];
}

/**
 * Hauptfunktion: Berechnet, welche MI/IB-Kompetenzen im aktuellen Schuljahr
 * durch Jahresplanungs-Einheiten abgedeckt sind.
 *
 * Algorithmus:
 * 1. Lade alle Einheiten des Lehrers für das Schuljahr.
 * 2. Lade alle MI/IB-Kompetenzen aus system_kompetenzen (Airtable + LP21).
 * 3. Dedupe MI./IB.-Duplikate über canonicalLpCode (MI ist Master).
 * 4. Filtere optional auf den Zyklus der Lehrperson (basierend auf stufe).
 * 5. Für jede Einheit:
 *    a) Direkte Abdeckung: Schaue welche der eigenen kompetenzenIds
 *       MI/IB-Kompetenzen sind.
 *    b) Indirekte Abdeckung: Wenn linkedMiaThemeId gesetzt ist, lade die
 *       Kompetenzen des Themas und werte deren MI/IB-Anteil aus.
 * 6. Aggregiere pro canonicalCode die abdeckenden Einheiten.
 */
export async function getMiaCoverage(
  teacherId: string,
  schuljahr: string,
  options?: { kanton?: Kanton; stufe?: Stufe }
): Promise<MiaCoverageResult[]> {
  const [einheiten, alleKompetenzen] = await Promise.all([
    getJahresplanEinheiten(teacherId, { schuljahr }),
    getSystemKompetenzen(),
  ]);

  // 1. Nur MI/IB-Kompetenzen, dedupliziert nach canonicalCode
  const competenciesByCanonical = new Map<string, SystemKompetenz>();
  alleKompetenzen.forEach((k) => {
    if (!isMiaKompetenz(k)) return;
    const canon = canonicalizeLpCode(k.lpCode);
    if (!canon) return;

    // Bevorzuge Airtable-Quelle, weil sie schul-kuratiert ist
    const existing = competenciesByCanonical.get(canon);
    if (!existing) {
      competenciesByCanonical.set(canon, k);
      return;
    }
    if (existing.source !== "airtable" && k.source === "airtable") {
      competenciesByCanonical.set(canon, k);
    }
  });

  // 2. Optional Zyklus-Filter (basierend auf stufe der Lehrperson)
  const zyklus = stufeToZyklus(options?.stufe);
  if (zyklus) {
    for (const [canon, k] of competenciesByCanonical) {
      // Wenn Kompetenz keinen zyklus-Eintrag hat, eingeschlossen lassen
      if (k.zyklus && k.zyklus.length > 0 && !k.zyklus.includes(zyklus)) {
        competenciesByCanonical.delete(canon);
      }
    }
  }

  // 3. Lookup: kompetenzId → canonicalCode (für schnellen Match in Einheit)
  const idToCanonical = new Map<string, string>();
  alleKompetenzen.forEach((k) => {
    const canon = canonicalizeLpCode(k.lpCode);
    if (canon && competenciesByCanonical.has(canon)) {
      // sowohl airtableId als auch doc-id speichern
      idToCanonical.set(k.id, canon);
      if (k.airtableId) idToCanonical.set(k.airtableId, canon);
    }
  });

  // 4. Coverage-Map aufbauen
  const coverageByCanonical = new Map<string, MiaCoverageEinheit[]>();
  competenciesByCanonical.forEach((_, canon) => {
    coverageByCanonical.set(canon, []);
  });

  const themeIdCache = new Map<string, string[]>();

  for (const einheit of einheiten) {
    // 4a) Direkte Coverage über kompetenzenIds
    const directHits = new Set<string>();
    (einheit.kompetenzenIds || []).forEach((id) => {
      const canon = idToCanonical.get(id);
      if (canon) directHits.add(canon);
    });

    // 4b) Indirekte Coverage über linkedMiaThemeId
    const indirectHits = new Set<string>();
    if (einheit.linkedMiaThemeId) {
      const themeKompIds = await getThemeKompetenzIds(
        einheit.linkedMiaThemeId,
        themeIdCache
      );
      themeKompIds.forEach((id) => {
        const canon = idToCanonical.get(id);
        if (canon && !directHits.has(canon)) indirectHits.add(canon);
      });
    }

    // Coverage-Einträge anlegen
    const addToCoverage = (canon: string, viaTheme: boolean) => {
      const list = coverageByCanonical.get(canon);
      if (!list) return;
      list.push(toCoverageEinheit(einheit, viaTheme));
    };

    directHits.forEach((c) => addToCoverage(c, false));
    indirectHits.forEach((c) => addToCoverage(c, true));
  }

  // 5. Resultat zusammenstellen
  const results: MiaCoverageResult[] = [];
  competenciesByCanonical.forEach((k, canon) => {
    const coveringEinheiten = coverageByCanonical.get(canon) || [];
    results.push({
      canonicalCode: canon,
      displayCode: toDisplayCode(canon, options?.kanton),
      competencyName: k.kompetenzstufe || k.kompetenz || k.name || canon,
      competencyDescription: k.kompetenz,
      kompetenzstufe: k.kompetenzstufe,
      bereich: classifyBereich(canon, k.kompetenzbereich),
      kompetenzbereich: k.kompetenzbereich,
      zyklus: k.zyklus,
      klassenstufe: k.klassenstufe,
      isCovered: coveringEinheiten.length > 0,
      coveringEinheiten,
    });
  });

  // Sortiere nach displayCode
  results.sort((a, b) => a.displayCode.localeCompare(b.displayCode, "de"));
  return results;
}

function toCoverageEinheit(
  einheit: JahresplanEinheit,
  linkedViaMiaTheme: boolean
): MiaCoverageEinheit {
  return {
    einheitId: einheit.id,
    titel: einheit.titel,
    fachbereichId: einheit.fachbereichId,
    fachbereichName: einheit.fachbereichName,
    fachbereichFarbe: einheit.fachbereichFarbe || einheit.farbe,
    zeitraumStart: einheit.zeitraumStart,
    zeitraumEnde: einheit.zeitraumEnde,
    linkedViaMiaTheme,
  };
}

/**
 * Statistiken über die Coverage-Resultate (für Header der UI).
 */
export function calculateMiaCoverageStats(
  results: MiaCoverageResult[]
): MiaCoverageStats {
  const stats: MiaCoverageStats = {
    total: results.length,
    covered: 0,
    uncovered: 0,
    byBereich: {
      medien: { total: 0, covered: 0 },
      informatik: { total: 0, covered: 0 },
      anwendungskompetenzen: { total: 0, covered: 0 },
    },
  };

  results.forEach((r) => {
    if (r.isCovered) stats.covered++;
    else stats.uncovered++;
    const b = stats.byBereich[r.bereich];
    b.total++;
    if (r.isCovered) b.covered++;
  });

  return stats;
}
