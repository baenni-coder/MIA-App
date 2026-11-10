import type {
  Beurteilung,
  LehrmittelVorlage,
  LehrmittelVorlageBlock,
} from "@/types";
import { findFachbereich, getLp21FachbereichFarbe } from "@/lib/data/lp21-data";
import { deutschDrei } from "./deutsch-drei";
import { deutschVier } from "./deutsch-vier";
import { deutschFuenf } from "./deutsch-fuenf";
import { deutschSechs } from "./deutsch-sechs";
import { schweizerZahlenbuch3 } from "./schweizer-zahlenbuch-3";
import { schweizerZahlenbuch4 } from "./schweizer-zahlenbuch-4";
import { schweizerZahlenbuch5 } from "./schweizer-zahlenbuch-5";
import { schweizerZahlenbuch6 } from "./schweizer-zahlenbuch-6";

/**
 * Registry aller Lehrmittel-Jahresplanungsvorlagen.
 * Neue Vorlage: Datei in diesem Ordner anlegen und hier eintragen.
 */
const VORLAGEN: LehrmittelVorlage[] = [
  schweizerZahlenbuch3,
  schweizerZahlenbuch4,
  schweizerZahlenbuch5,
  schweizerZahlenbuch6,
  deutschDrei,
  deutschVier,
  deutschFuenf,
  deutschSechs,
];

export function getLehrmittelVorlagen(): LehrmittelVorlage[] {
  return VORLAGEN;
}

export function getLehrmittelVorlageById(id: string): LehrmittelVorlage | undefined {
  return VORLAGEN.find((v) => v.id === id);
}

/**
 * Standard-Wochenzahl eines Blocks: Mittelwert der Richtwerte, abgerundet
 * (lässt Luft für Vertiefung/Projekte; die Lehrperson kann erhöhen).
 */
export function defaultWochen(block: LehrmittelVorlageBlock): number {
  if (block.optional && block.wochenMin === 0) return Math.max(1, Math.ceil(block.wochenMax / 2));
  return Math.max(1, block.wochenMin, Math.floor((block.wochenMin + block.wochenMax) / 2));
}

export function uebungenLabel(vorlage: LehrmittelVorlage): string {
  return vorlage.uebungenLabel || "Blitzrechnen";
}

export function formatWochenRichtwert(block: LehrmittelVorlageBlock): string {
  if (block.begleitend) return "begleitend";
  return block.wochenMin === block.wochenMax
    ? `${block.wochenMin} ${block.wochenMin === 1 ? "Woche" : "Wochen"}`
    : `${block.wochenMin}–${block.wochenMax} Wochen`;
}

// ============================================
// Planung: Blöcke auf Schulwochen verteilen
// ============================================

export interface Schulwoche {
  kw: number;
  jahr: number;
  istFerien: boolean;
}

export interface VorlageAuswahl {
  blockId: string;
  wochen: number;
}

export interface GeplanterTeil {
  zeitraumStart: number;
  zeitraumEnde: number;
  wochen: Schulwoche[]; // nur Schulwochen (ohne Ferien)
}

export interface GeplanterBlock {
  block: LehrmittelVorlageBlock;
  wochen: number;
  passt: boolean; // false = reicht nicht mehr ins Schuljahr
  teile: GeplanterTeil[]; // >1, wenn der Block über den Jahreswechsel geht
}

/** Teilt eine Wochenfolge am Jahreswechsel in zusammenhängende Teile. */
function inTeile(wochen: Schulwoche[]): GeplanterTeil[] {
  const teile: GeplanterTeil[] = [];
  for (const w of wochen) {
    const last = teile[teile.length - 1];
    if (last && last.wochen[0].jahr === w.jahr) {
      last.wochen.push(w);
      last.zeitraumEnde = w.kw;
    } else {
      teile.push({ zeitraumStart: w.kw, zeitraumEnde: w.kw, wochen: [w] });
    }
  }
  return teile;
}

/**
 * Verteilt die ausgewählten Blöcke nacheinander auf die Schulwochen ab
 * `startKW`. Ferienwochen werden übersprungen. Da die Jahresplanung
 * Zeiträume innerhalb eines Kalenderjahres speichert (KW-Start ≤ KW-Ende),
 * wird ein Block, der über den Jahreswechsel läuft, in zwei Teile getrennt.
 *
 * Begleitende Blöcke (`begleitend`) belegen keine eigenen Wochen, sondern
 * laufen parallel von der ersten bis zur letzten verplanten Woche (bzw. über
 * die ganze Restzeit, wenn nur begleitende Blöcke gewählt sind).
 */
export function planeVorlage(
  vorlage: LehrmittelVorlage,
  auswahl: VorlageAuswahl[],
  schulwochen: Schulwoche[],
  startKW: number
): GeplanterBlock[] {
  const startPos = Math.max(0, schulwochen.findIndex((s) => s.kw === startKW));
  const unterricht = schulwochen.slice(startPos).filter((w) => !w.istFerien);
  let idx = 0;

  const result: GeplanterBlock[] = [];
  // Reihenfolge der Vorlage beibehalten
  for (const block of vorlage.bloecke) {
    const a = auswahl.find((x) => x.blockId === block.id);
    if (!a || block.begleitend) continue;
    const n = Math.max(1, Math.floor(a.wochen));
    const wochen = unterricht.slice(idx, idx + n);
    if (wochen.length < n) {
      result.push({ block, wochen: n, passt: false, teile: [] });
      idx = unterricht.length;
      continue;
    }
    idx += n;
    result.push({ block, wochen: n, passt: true, teile: inTeile(wochen) });
  }

  // Begleitende Blöcke über den verplanten Zeitraum legen
  const genutzt = Math.min(idx, unterricht.length);
  const spanne = unterricht.slice(0, genutzt > 0 ? genutzt : unterricht.length);
  for (const block of vorlage.bloecke) {
    if (!block.begleitend) continue;
    if (!auswahl.some((x) => x.blockId === block.id)) continue;
    result.push({
      block,
      wochen: spanne.length,
      passt: spanne.length > 0,
      teile: inTeile(spanne),
    });
  }
  // Begleitende Blöcke in Vorlagen-Reihenfolge einsortieren
  const order = new Map(vorlage.bloecke.map((b, i) => [b.id, i]));
  return result.sort((x, y) => (order.get(x.block.id)! - order.get(y.block.id)!));
}

// ============================================
// Einheiten-Payloads erzeugen
// ============================================

export interface VorlageEinheitPayload {
  titel: string;
  fachbereichId: string;
  fachbereichName?: string;
  fachbereichFarbe: string;
  lernziele: string;
  zeitraumStart: number;
  zeitraumEnde: number;
  beurteilungen: Beurteilung[];
  materialien: string[];
  lehrmittel: string;
  lp21Codes: string[]; // werden serverseitig zu kompetenzenIds aufgelöst
}

/** MI-/IB-Codes eines Blocks (MIA-Bezug). */
export function miaCodes(block: LehrmittelVorlageBlock): string[] {
  return (block.lp21Codes || []).filter((c) => c.startsWith("MI.") || c.startsWith("IB."));
}

function seitenBereich(block: LehrmittelVorlageBlock): string | null {
  const zahlen = block.kapitel
    .flatMap((k) => (k.seiten ? k.seiten.split(/[–-]/) : []))
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
  if (zahlen.length === 0) return null;
  const first = Math.min(...zahlen);
  const last = Math.max(...zahlen);
  return first === last ? `S. ${first}` : `S. ${first}–${last}`;
}

function lernzieleText(vorlage: LehrmittelVorlage, block: LehrmittelVorlageBlock): string {
  const zeilen: string[] = [];
  if (block.kapitel.length > 0) {
    zeilen.push(
      block.begleitend
        ? `Bereiche (${vorlage.lehrmittel}, Reihenfolge frei):`
        : `Lernumgebungen (${vorlage.lehrmittel}):`
    );
    block.kapitel.forEach((k) => {
      zeilen.push(
        `• ${k.nr ? `${k.nr} ` : ""}${k.titel}${k.seiten ? ` (S. ${k.seiten})` : ""}${
          k.beurteilungsanlass ? ` – ${k.beurteilungsanlass}` : ""
        }`
      );
    });
    zeilen.push("");
  }
  if (block.fokus && block.fokus.length > 0) {
    zeilen.push(`Fokussierte Kompetenzbereiche: ${block.fokus.join(", ")}`);
  }
  const mia = miaCodes(block);
  if (mia.length > 0) {
    zeilen.push(`MIA-Bezug (Medien und Informatik): ${mia.join(", ")}`);
  }
  const fach = (block.lp21Codes || []).filter((c) => !mia.includes(c));
  if (fach.length > 0) {
    zeilen.push(`LP21-Bezüge: ${fach.join(", ")}`);
  }
  if (block.blitz && block.blitz.length > 0) {
    zeilen.push(`${uebungenLabel(vorlage)}: ${block.blitz.map((b) => `«${b}»`).join(", ")}`);
  }
  if (zeilen.length > 0 && zeilen[zeilen.length - 1] !== "") zeilen.push("");
  zeilen.push(
    block.begleitend
      ? `Läuft begleitend über das ganze Schuljahr${
          block.zeitraumHinweis ? ` (${block.zeitraumHinweis})` : ""
        }.`
      : `Richtwert gemäss Verlag: ${formatWochenRichtwert(block)}${
          block.zeitraumHinweis ? ` (${block.zeitraumHinweis})` : ""
        }`
  );
  return zeilen.join("\n");
}

export function vorlageZuEinheiten(
  vorlage: LehrmittelVorlage,
  plan: GeplanterBlock[]
): VorlageEinheitPayload[] {
  const fb = findFachbereich(vorlage.fachbereichId);
  const fachbereichFarbe = fb?.farbe || getLp21FachbereichFarbe(vorlage.fachbereichId);
  const payloads: VorlageEinheitPayload[] = [];

  for (const gp of plan) {
    if (!gp.passt) continue;
    const { block } = gp;
    const alleWochen = gp.teile.flatMap((t) => t.wochen);

    // Beurteilungen (Woche im Gesamtblock bestimmen)
    const beurteilungenGesamt: Array<{ woche: Schulwoche; b: Beurteilung }> = [];
    block.kapitel.forEach((k, i) => {
      if (!k.beurteilungsanlass) return;
      const pos = Math.min(
        alleWochen.length - 1,
        Math.floor((i / block.kapitel.length) * alleWochen.length)
      );
      const woche = alleWochen[pos];
      beurteilungenGesamt.push({
        woche,
        b: {
          typ: "formativ",
          kalenderwoche: woche.kw,
          notiz: `${k.beurteilungsanlass} – Lernprozessbeobachtung zu LU ${k.nr} «${k.titel}»`,
        },
      });
    });
    if (block.beurteilung) {
      const woche = alleWochen[alleWochen.length - 1];
      beurteilungenGesamt.push({
        woche,
        b: {
          typ: "summativ",
          kalenderwoche: woche.kw,
          notiz: `${block.beurteilung} (Lernzielkontrolle)`,
        },
      });
    }

    const seiten = seitenBereich(block);
    gp.teile.forEach((teil, ti) => {
      payloads.push({
        titel:
          gp.teile.length > 1
            ? `${block.titel} (Teil ${ti + 1}/${gp.teile.length})`
            : block.titel,
        fachbereichId: vorlage.fachbereichId,
        fachbereichName: fb?.name,
        fachbereichFarbe,
        lernziele: lernzieleText(vorlage, block),
        zeitraumStart: teil.zeitraumStart,
        zeitraumEnde: teil.zeitraumEnde,
        beurteilungen: beurteilungenGesamt
          .filter((x) => teil.wochen.includes(x.woche))
          .map((x) => x.b),
        materialien: seiten ? [`${vorlage.lehrmittel}, ${seiten}`] : [],
        lehrmittel: vorlage.lehrmittel,
        lp21Codes: block.lp21Codes || [],
      });
    });
  }
  return payloads;
}
