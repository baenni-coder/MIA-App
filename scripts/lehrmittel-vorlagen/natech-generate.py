#!/usr/bin/env python3
"""
NaTech 1|2, 3|4, 5|6 (LMVZ / schulverlag plus) – Themenübersicht + LP21-Bezüge.

Liest die einseitige A3-Übersicht „Bezüge zum Lehrplan 21 – Natur und Technik
Primarstufe" (Verlags-PDF) und erzeugt src/lib/data/lehrmittel-vorlagen/natech.ts.

- Spalten: Kompetenz-Codes NMG.x.y (Zeile „Kompetenz-Code")
- Zeilen: 3 Bände × 10 Themen (Themen 1–5 = 1. Schuljahr des Bandes, 6–10 = 2.)
- Punkte (Glyph „•") = Schwerpunkt-Kompetenz des Themas
- Kontrolle: Punkte pro Spalte = Zeile „Anzahl" im PDF

Aufruf:
  python3 -I scripts/lehrmittel-vorlagen/natech-generate.py <pfad/zum/pdf> > src/lib/data/lehrmittel-vorlagen/natech.ts
"""
import collections
import json
import sys

import pdfplumber

# Kompetenz-Texte (LP21, Kompetenz-Ebene) – aus den gedrehten Spaltenköpfen,
# wo der Druck Buchstaben abschneidet, von Hand ergänzt.
KOMPETENZ_TEXTE = {
    "NMG.1.1": "Sich und andere wahrnehmen und beschreiben",
    "NMG.1.2": "Mitverantwortung für Gesundheit und Wohlbefinden übernehmen und sich vor Gefahren schützen",
    "NMG.1.3": "Zusammenhänge von Ernährung und Wohlbefinden erkennen und erläutern",
    "NMG.1.4": "Den Aufbau des eigenen Körpers beschreiben und Funktionen von ausgewählten Organen erklären",
    "NMG.1.5": "Wachstum und Entwicklung des menschlichen Körpers wahrnehmen und verstehen",
    "NMG.1.6": "Geschlecht und Rollen reflektieren",
    "NMG.2.1": "Tiere und Pflanzen in ihren Lebensräumen erkunden und dokumentieren sowie das Zusammenwirken beschreiben",
    "NMG.2.2": "Die Bedeutung von Sonne, Luft, Wasser, Boden und Steinen für Lebewesen erkennen, darüber nachdenken und Zusammenhänge erklären",
    "NMG.2.3": "Wachstum, Entwicklung und Fortpflanzung bei Tieren und Pflanzen beobachten und vergleichen",
    "NMG.2.4": "Artenvielfalt von Pflanzen und Tieren erkennen und sie kategorisieren",
    "NMG.2.5": "Vorstellungen zur Geschichte der Erde und der Entwicklung von Pflanzen, Tieren und Menschen entwickeln",
    "NMG.2.6": "Einflüsse des Menschen auf die Natur einschätzen und über eine nachhaltige Entwicklung nachdenken",
    "NMG.3.1": "Erfahrungen mit Bewegungen und Kräften beschreiben und einordnen",
    "NMG.3.2": "Die Bedeutung von Energie und Energieumwandlungen im Alltag erkennen, beschreiben und reflektiert handeln",
    "NMG.3.3": "Stoffe im Alltag und in natürlicher Umgebung wahrnehmen, untersuchen und ordnen",
    "NMG.3.4": "Stoffe bearbeiten, verändern und nutzen",
    "NMG.4.1": "Signale, Sinne und Sinnesleistungen erkennen, vergleichen und erläutern",
    "NMG.4.2": "Akustische Phänomene vergleichen und untersuchen",
    "NMG.4.3": "Optische Phänomene erkennen und untersuchen",
    "NMG.4.4": "Wetterphänomene beobachten, sich über Naturereignisse informieren sowie entsprechende Phänomene und Sachverhalte erklären",
    "NMG.4.5": "Erscheinungen auf der Erde und Bewegungen von Himmelskörpern wahrnehmen, beschreiben und erklären",
    "NMG.5.1": "Alltagsgeräte und technische Anlagen untersuchen und nachkonstruieren",
    "NMG.5.2": "Elektrische und magnetische Phänomene sowie deren technische Anwendungen untersuchen",
    "NMG.5.3": "Bedeutung und Folgen technischer Entwicklungen für Mensch und Umwelt einschätzen",
}

BAENDE = ["1|2", "3|4", "5|6"]
VORSCHLAG_WOCHEN = 4


def code_key(c):
    return [int(n) for n in c[4:].split(".")]


def extract(pdf_path):
    page = pdfplumber.open(pdf_path).pages[0]
    words = page.extract_words()
    cols = [((w["x0"] + w["x1"]) / 2, w["text"]) for w in words
            if w["text"].startswith("NMG.") and w["top"] < 430]
    lines = collections.defaultdict(list)
    for w in words:
        if 430 < w["top"] < 740 and 55 < w["x0"] < 260:
            lines[round(w["top"], 1)].append(w)
    rows = []
    for _, ws in sorted(lines.items()):
        ws.sort(key=lambda w: w["x0"])
        rows.append({
            "y": (ws[0]["top"] + ws[0]["bottom"]) / 2,
            "nr": int(ws[0]["text"]),
            "strang": " ".join(w["text"] for w in ws[1:] if w["x0"] < 150),
            "titel": " ".join(w["text"] for w in ws if w["x0"] >= 150),
            "codes": set(),
        })
    assert len(rows) == 30, f"erwartet 30 Themenzeilen, gefunden {len(rows)}"
    per_col = collections.Counter()
    for d in (c for c in page.chars if c["text"] == "•"):
        x = (d["x0"] + d["x1"]) / 2
        y = (d["top"] + d["bottom"]) / 2
        code = min(cols, key=lambda c: abs(c[0] - x))[1]
        min(rows, key=lambda r: abs(r["y"] - y))["codes"].add(code)
        per_col[code] += 1
    for i, r in enumerate(rows):
        r["band"] = BAENDE[i // 10]
        r["codes"] = sorted(r["codes"], key=code_key)
    return rows, per_col


def ts(v):
    return json.dumps(v, ensure_ascii=False)


def main():
    rows, per_col = extract(sys.argv[1])
    print("Punkte pro Spalte:", dict(sorted(per_col.items(), key=lambda x: code_key(x[0]))), file=sys.stderr)

    out = []
    out.append('import type { LehrmittelVorlage, LehrmittelVorlageBlock } from "@/types";')
    out.append("")
    out.append("/**")
    out.append(" * NaTech 1|2, 3|4, 5|6 – Natur und Technik Primarstufe (LMVZ / schulverlag plus).")
    out.append(" * Quelle: „Bezüge zum Lehrplan 21“, Lehrmittelverlag Zürich, November 2017.")
    out.append(" * AUTOMATISCH erzeugt mit scripts/lehrmittel-vorlagen/natech-generate.py.")
    out.append(" *")
    out.append(" * Keine Jahresplanung des Verlags: pro Schuljahr 5 Themen ohne Richtwert")
    out.append(" * (art = \"themenuebersicht\"). Die 10 Themenstränge (Stoffe, Technik, Sinne …)")
    out.append(" * kehren in jedem Band wieder (Spiralprinzip, reihe = \"NaTech\").")
    out.append(" * LP21-Codes sind Kompetenzen (NMG.x.y), auf denen der Schwerpunkt liegt;")
    out.append(" * beim Übernehmen werden sie zu den Kompetenzstufen des Zyklus aufgelöst.")
    out.append(" */")
    out.append("")
    out.append(f"const LP21_TEXTE: Record<string, string> = {json.dumps(KOMPETENZ_TEXTE, ensure_ascii=False, indent=2)};")
    out.append("")
    out.append("const basis = {")
    out.append('  verlag: "Lehrmittelverlag Zürich / schulverlag plus",')
    out.append('  quelle: "© Lehrmittelverlag Zürich, November 2017 – NaTech, Bezüge zum Lehrplan 21 (Grundlage: D-EDK-Druckfassung vom 29.02.2016)",')
    out.append('  fachbereichId: "NMG",')
    out.append('  art: "themenuebersicht" as const,')
    out.append('  reihe: "NaTech",')
    out.append("  lp21Texte: LP21_TEXTE,")
    out.append("  hinweis:")
    out.append('    "Der Verlag gibt keine Jahresplanung vor: Reihenfolge und Dauer der Themen sind frei. Die Themenstränge (Stoffe, Technik, Sinne …) wiederholen sich in jedem Band auf höherem Niveau (Spiralprinzip). LP21-Bezüge = Kompetenzen, auf denen der Schwerpunkt des Themas liegt.",')
    out.append("};")
    out.append("")

    names = []
    for bi, band in enumerate(BAENDE):
        klassen = [bi * 2 + 1, bi * 2 + 2]
        lehrmittel = f"NaTech {band}"
        a, b = band.split("|")
        aliase = [f"NaTech {a}/{b}", f"NaTech {a} | {b}", f"NaTech {a}-{b}", f"NaTech {a}–{b}", "NaTech"]
        for half, klasse in enumerate(klassen):
            sel = [r for r in rows if r["band"] == band and (r["nr"] <= 5) == (half == 0)]
            var = f"natech{klasse}"
            names.append(var)
            out.append(f"export const {var}: LehrmittelVorlage = {{")
            out.append("  ...basis,")
            out.append(f'  id: "natech-{klasse}",')
            out.append(f"  lehrmittel: {ts(lehrmittel)},")
            out.append(f"  lehrmittelAliase: {ts(aliase)},")
            out.append(f'  titel: "{lehrmittel} – Themen {klasse}. Schuljahr",')
            out.append(f'  stufen: ["{klasse}. Klasse"],')
            out.append("  bloecke: [")
            for r in sel:
                block = {
                    "id": f"thema-{r['nr']}",
                    "titel": r["titel"],
                    "phase": "Themen",
                    "vorschlagWochen": VORSCHLAG_WOCHEN,
                    "strang": r["strang"],
                    "strangNr": r["nr"],
                    "kapitel": [],
                    "lp21Codes": r["codes"],
                }
                out.append("    " + json.dumps(block, ensure_ascii=False) + " satisfies LehrmittelVorlageBlock,")
            out.append("  ],")
            out.append("};")
            out.append("")
    print("\n".join(out))


if __name__ == "__main__":
    main()
