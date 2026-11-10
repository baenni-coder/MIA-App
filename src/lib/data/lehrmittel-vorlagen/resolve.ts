import type { LehrmittelVorlage, SystemKompetenz } from "@/types";
import { istKompetenzCode, vorlageZyklen } from "./index";

const normCode = (c: string) => c.replace(/[\s.]/g, "").toLowerCase();

/**
 * Löst LP21-Codes in system_kompetenzen auf (Ergebnis: 0..n Kompetenzstufen).
 *
 * - Kompetenzstufe (z.B. "D.4.B.1.c"): genau diese Stufe.
 * - MI/IB (z.B. "MI.1.3.c"): je nach Kanton (SO bevorzugt IB).
 * - Kompetenz ohne Stufe (z.B. "MA.1.A.2", aus Kompetenzrastern): alle Stufen
 *   dieser Kompetenz im Zyklus der Vorlage. In Zyklus 2 wird am
 *   Orientierungspunkt (Ende 4. Klasse) geteilt: 3./4. Klasse → Stufen bis und
 *   mit Orientierungspunkt, 5./6. Klasse → Stufen danach.
 *
 * Nicht auffindbare Codes bleiben unaufgelöst (stehen weiterhin im Lernziel-Text).
 */
export function buildResolver(alle: SystemKompetenz[], vorlage: LehrmittelVorlage, kanton?: string) {
  const byCode = new Map<string, SystemKompetenz[]>();
  alle.forEach((k) => {
    if (!k.lpCode) return;
    const key = normCode(k.lpCode);
    const list = byCode.get(key) || [];
    list.push(k);
    byCode.set(key, list);
  });
  const pick = (code: string): SystemKompetenz | undefined => {
    const list = byCode.get(normCode(code));
    if (!list || list.length === 0) return undefined;
    // Airtable-Quelle bevorzugen (MIA-kuratiert), sonst erste
    return list.find((k) => k.source === "airtable") || list[0];
  };

  const zyklen = vorlageZyklen(vorlage);
  const klassen = vorlage.stufen.map((st) => (st === "KiGa" ? 0 : parseInt(st, 10)));
  const nurUnten = zyklen.length === 1 && zyklen[0] === "Zyklus 2" && klassen.every((n) => n <= 4);
  const nurOben = zyklen.length === 1 && zyklen[0] === "Zyklus 2" && klassen.every((n) => n >= 5);

  const expandKompetenz = (code: string): SystemKompetenz[] => {
    const prefix = code + ".";
    const seen = new Set<string>();
    const stufen = alle
      .filter((k) => k.lpCode?.startsWith(prefix) && /^[a-z]$/i.test(k.lpCode.slice(prefix.length)))
      .filter((k) => !k.zyklus?.length || k.zyklus.some((z) => zyklen.includes(z)))
      .sort((a, b) => (a.lpCode || "").localeCompare(b.lpCode || "", "de", { numeric: true }))
      .filter((k) => (seen.has(k.lpCode!) ? false : (seen.add(k.lpCode!), true)))
      .map((k) => pick(k.lpCode!) || k);
    if (!nurUnten && !nurOben) return stufen;
    const op = stufen.findIndex((k) => k.orientierungspunkt);
    if (op === -1) return stufen;
    return nurUnten ? stufen.slice(0, op + 1) : stufen.slice(op + 1);
  };

  return (code: string): SystemKompetenz[] => {
    const isMia = code.startsWith("MI.") || code.startsWith("IB.");
    if (isMia) {
      const rest = code.slice(3);
      const order = kanton === "SO" ? ["IB.", "MI."] : ["MI.", "IB."];
      for (const p of order) {
        const k = pick(p + rest);
        if (k) return [k];
      }
      return [];
    }
    if (istKompetenzCode(code)) return expandKompetenz(code);
    const k = pick(code);
    return k ? [k] : [];
  };
}

