import json, sys, re
m = json.load(open(sys.argv[1])); outdir = sys.argv[2]
KB = {"D.1":"Hören","D.2":"Lesen","D.3":"Sprechen","D.4":"Schreiben","D.5":"Sprache(n) im Fokus","D.6":"Literatur im Fokus"}
ZR = ["Aug. bis Sept.","Okt. bis Dez.","Jan. bis März","März bis Mai","Mai bis Juni"]
BAND = {"Drei":("3. Klasse","drei","Drei"),"Vier":("4. Klasse","vier","Vier"),"Fünf":("5. Klasse","fuenf","Fuenf"),"Sechs":("6. Klasse","sechs","Sechs")}
def key(c):
    return [int(p) if p.isdigit() else p for p in re.split(r"[.]", c)]
def arr(xs): return "[" + ", ".join(json.dumps(x, ensure_ascii=False) for x in xs) + "]"
for band, rows in m.items():
    stufe, slug, ident = BAND[band]
    kap = [r for r in rows if r["nr"]]; ueb = [r for r in rows if not r["nr"]]
    L = []
    L.append('import type { LehrmittelVorlage } from "@/types";\n')
    L.append("/**")
    L.append(f" * Jahresplanung „Deutsch {band}“ (Lehrmittelverlag Zürich, {stufe}).")
    L.append(" * Quelle: LMVZ, Bezüge zum Lehrplan 21, Zyklus 2 (Januar 2026) + Jahresübersicht.")
    L.append(" * AUTOMATISCH aus der LP21-Bezugsmatrix extrahiert (Zellen = Kompetenzstufen,")
    L.append(" * Rahmen = fokussierte Kompetenzbereiche, letzte Spalte = Medien und Informatik).")
    L.append(" * Themen ≈ 2/3 der Deutschzeit (5 Kapitel à ca. 6 Wochen + Freibereich),")
    L.append(" * Üben ≈ 1/3 begleitend (Reihenfolge frei).")
    L.append(" */")
    L.append(f"export const deutsch{ident}: LehrmittelVorlage = {{")
    L.append(f'  id: "deutsch-{slug}",')
    L.append(f'  lehrmittel: "Deutsch {band}",')
    L.append(f'  titel: "Jahresplanung Deutsch {band}",')
    L.append('  verlag: "Lehrmittelverlag Zürich",')
    L.append('  quelle: "© Lehrmittelverlag Zürich, Januar 2026 – Bezüge zum Lehrplan 21, Zyklus 2 (Grundlage: LP21 Kanton Zürich)",')
    L.append('  fachbereichId: "D",')
    L.append(f'  stufen: ["{stufe}"],')
    L.append(f'  bildUrl: "/lehrmittel/deutsch-{slug}.png",')
    L.append('  hinweis:\n    "Themen (5 Kapitel à ca. 6 Wochen + Freibereich) beanspruchen etwa zwei Drittel, Üben etwa einen Drittel der Unterrichtszeit. Jedes Kapitel besteht aus einem Basismodul und drei Wahlmodulen. LP21-Bezüge gemäss Übersicht des Verlags; MIA-Bezüge werden beim Übernehmen als Kompetenzen eingetragen.",')
    L.append("  bloecke: [")
    for i, r in enumerate(kap):
        codes = sorted(r["codes"], key=key) + sorted(r["mi"], key=key)
        L.append("    {")
        L.append(f'      id: "kapitel-{r["nr"]}",')
        L.append(f'      titel: {json.dumps(f"Kapitel {r[chr(110)+chr(114)]}: {r[chr(116)+chr(105)+chr(116)+chr(101)+chr(108)]}", ensure_ascii=False)},')
        L.append('      phase: "Themen",')
        L.append("      wochenMin: 6,\n      wochenMax: 6,")
        L.append(f'      zeitraumHinweis: "{ZR[i]}",')
        L.append("      kapitel: [],")
        L.append(f"      fokus: {arr([KB[f] for f in r['fokus']])},")
        L.append(f"      lp21Codes: {arr(codes)},")
        L.append("    },")
    L.append('    {\n      id: "freibereich",\n      titel: "Freibereich",\n      phase: "Themen",\n      wochenMin: 6,\n      wochenMax: 6,\n      zeitraumHinweis: "Juni bis Juli",\n      kapitel: [],\n    },')
    allu = []
    for r in ueb:
        for c in r["codes"]:
            if c not in allu: allu.append(c)
    L.append("    {")
    L.append('      id: "ueben",')
    L.append('      titel: "Üben",')
    L.append('      phase: "Üben",')
    L.append("      wochenMin: 0,\n      wochenMax: 0,\n      begleitend: true,\n      zeitraumHinweis: \"ca. ein Drittel der Deutschzeit\",")
    L.append("      kapitel: [")
    for r in ueb: L.append(f'        {{ nr: "", titel: {json.dumps(r["titel"], ensure_ascii=False)} }},')
    L.append("      ],")
    fok = []
    for r in ueb:
        for f in r["fokus"]:
            if KB[f] not in fok: fok.append(KB[f])
    L.append(f"      fokus: {arr(fok)},")
    L.append(f"      lp21Codes: {arr(sorted(allu, key=key))},")
    L.append("    },")
    L.append("  ],\n};\n")
    open(f"{outdir}/deutsch-{slug}.ts", "w").write("\n".join(L))
    print(slug, len(kap), "kapitel,", len(ueb), "üben")
