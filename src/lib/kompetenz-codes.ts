/**
 * Kompakte Darstellung von LP21-Kompetenzen in Jahresplanungs-Ansichten.
 *
 * Einheiten speichern `kompetenzenNamen` im Format "CODE: Beschreibung"
 * (z.B. "MA.1.A.1.d: Die Schülerinnen und Schüler …"). Für Übersichten und
 * PDFs zeigen wir nur die Codes und fassen Stufen derselben Kompetenz zusammen:
 * MA.1.A.1.c, MA.1.A.1.d, MA.1.A.1.e → "MA.1.A.1.c–e".
 */

export interface KompetenzEintrag {
  code: string; // z.B. "MA.1.A.1.d" (oder der ganze Name, falls kein Code erkennbar)
  text: string; // Beschreibung ohne Code
}

export interface KompetenzGruppe {
  label: string; // z.B. "MA.1.A.1.c–e"
  eintraege: KompetenzEintrag[];
}

const CODE_RE = /^([A-Za-z0-9]+(?:\.[A-Za-z0-9]+){2,})\s*:\s*([\s\S]*)$/;

export function parseKompetenzName(name: string): KompetenzEintrag {
  const m = name.match(CODE_RE);
  if (m) return { code: m[1], text: m[2].trim() };
  // Name ist evtl. nur ein Code (z.B. "MI.1.2.b")
  if (/^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+){2,}$/.test(name.trim())) {
    return { code: name.trim(), text: "" };
  }
  return { code: name, text: "" };
}

/** Stufenbuchstabe am Ende ("MA.1.A.1.d" → ["MA.1.A.1", "d"]), sonst null. */
function splitStufe(code: string): [string, string] | null {
  const m = code.match(/^(.*\.\d+)\.([a-z])$/);
  return m ? [m[1], m[2]] : null;
}

/** Fasst Buchstaben zu Bereichen zusammen: [c,d,e,g] → "c–e, g". */
function buchstabenBereiche(letters: string[]): string {
  const sorted = Array.from(new Set(letters)).sort();
  const teile: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur && cur.charCodeAt(0) === prev.charCodeAt(0) + 1) {
      prev = cur;
      continue;
    }
    teile.push(start === prev ? start : prev.charCodeAt(0) === start.charCodeAt(0) + 1 ? `${start}, ${prev}` : `${start}–${prev}`);
    start = cur;
    prev = cur;
  }
  return teile.join(", ");
}

/** Gruppiert Kompetenzstufen nach Kompetenz und erzeugt kompakte Labels. */
export function gruppiereKompetenzen(namen: string[] | undefined): KompetenzGruppe[] {
  if (!namen || namen.length === 0) return [];
  const gruppen = new Map<string, { eintraege: KompetenzEintrag[]; letters: string[] }>();
  const reihenfolge: string[] = [];
  for (const name of namen) {
    const e = parseKompetenzName(name);
    const s = splitStufe(e.code);
    const key = s ? s[0] : e.code;
    if (!gruppen.has(key)) {
      gruppen.set(key, { eintraege: [], letters: [] });
      reihenfolge.push(key);
    }
    const g = gruppen.get(key)!;
    if (!g.eintraege.some((x) => x.code === e.code)) g.eintraege.push(e);
    if (s) g.letters.push(s[1]);
  }
  return reihenfolge
    .sort((a, b) => {
      // Freitext ohne Code ans Ende
      const fa = a.includes(".") ? 0 : 1;
      const fb = b.includes(".") ? 0 : 1;
      return fa - fb || a.localeCompare(b, "de", { numeric: true });
    })
    .map((key) => {
      const g = gruppen.get(key)!;
      const label =
        g.letters.length > 0 && g.letters.length === g.eintraege.length
          ? `${key}.${buchstabenBereiche(g.letters)}`
          : g.eintraege.map((e) => e.code).join(", ");
      return {
        label,
        eintraege: g.eintraege.sort((a, b) => a.code.localeCompare(b.code, "de", { numeric: true })),
      };
    });
}

/** Einzeilige Code-Liste, z.B. "MA.1.A.1.c–e · D.1.A.1.e · +2". */
export function kompakteCodeListe(namen: string[] | undefined, max = 6): string {
  const gruppen = gruppiereKompetenzen(namen);
  if (gruppen.length === 0) return "";
  const sichtbar = gruppen.slice(0, max).map((g) => g.label);
  const rest = gruppen.length - sichtbar.length;
  return sichtbar.join(" · ") + (rest > 0 ? ` · +${rest}` : "");
}

/** Tooltip-Text für eine Gruppe (alle Stufen ausgeschrieben). */
export function gruppenTooltip(g: KompetenzGruppe): string {
  return g.eintraege.map((e) => (e.text ? `${e.code}: ${e.text}` : e.code)).join("\n\n");
}
