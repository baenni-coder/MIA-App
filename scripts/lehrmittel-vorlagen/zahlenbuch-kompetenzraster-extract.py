"""Extrahiert Lernumgebung -> LP21-Kompetenzen (MA) aus den Kompetenzrastern des Schweizer Zahlenbuchs."""
import sys, re, json, pdfplumber

CODES = (["MA.1.A.%d" % i for i in range(1, 5)] + ["MA.1.B.%d" % i for i in range(1, 4)] + ["MA.1.C.%d" % i for i in range(1, 3)]
       + ["MA.2.A.%d" % i for i in range(1, 4)] + ["MA.2.B.%d" % i for i in range(1, 3)] + ["MA.2.C.%d" % i for i in range(1, 5)]
       + ["MA.3.A.%d" % i for i in range(1, 4)] + ["MA.3.B.%d" % i for i in range(1, 3)] + ["MA.3.C.%d" % i for i in range(1, 4)])
assert len(CODES) == 26

def clusters(items, key, tol):
    items = sorted(items, key=key); out = []
    for it in items:
        if out and key(it) - key(out[-1][-1]) <= tol: out[-1].append(it)
        else: out.append([it])
    return out

def header_columns(page, top_limit):
    """Liefert x-Zentren der 26 Kompetenz-Spalten anhand der senkrechten Kopftexte."""
    vch = [c for c in page.chars if not c.get("upright", True) and c["bottom"] < top_limit and c["text"].strip()]
    lines = clusters(vch, lambda c: (c["x0"] + c["x1"]) / 2, 1.5)
    lx = [(sum((c["x0"] + c["x1"]) / 2 for c in l) / len(l), len(l)) for l in lines if len(l) >= 8]
    return lx

from PIL import Image

def visible(img, page, d, scale):
    """True, wenn an der Punkt-Position im gerenderten Bild wirklich etwas Dunkles ist
    (das PDF enthält verdeckte, verschobene Kopien der Punkte)."""
    cx = (d["x0"] + d["x1"]) / 2 * scale; cy = (d["top"] + d["bottom"]) / 2 * scale
    r = 2
    px = [img.getpixel((int(cx) + dx, int(cy) + dy)) for dx in range(-r, r + 1) for dy in range(-r, r + 1)]
    return min(sum(v[:3]) / 3 for v in px) < 110

def extract(path, images):
    pdf = pdfplumber.open(path)
    rows = {}  # nr -> {titel, codes:set}
    for p, imgpath in zip(pdf.pages, images):
        img = Image.open(imgpath).convert("RGB")
        scale = img.width / float(p.width)
        alle = [c for c in p.chars if c["text"] == "•"]
        dots = [d for d in alle if visible(img, p, d, scale)]
        print(f"  sichtbare Punkte {len(dots)} von {len(alle)}", file=sys.stderr)
        if not dots:
            continue
        top_dot = min(d["top"] for d in dots)
        # Spalten: Dot-Cluster (dedupliziert), Code über die Band-Reihenfolge der Kopfzeilen
        dcols = [sum((d["x0"] + d["x1"]) / 2 for d in cl) / len(cl) for cl in clusters(dots, lambda d: (d["x0"] + d["x1"]) / 2, 3)]
        # Kopf-Spalten = Rechtecke (Bänder) gleicher Breite direkt über den Dots (eine pro Kompetenz)
        rects = [r for r in p.rects if r["bottom"] <= top_dot + 2 and r["height"] > 60 and 12 < r["width"] < 40]
        rx = sorted({round((r["x0"] + r["x1"]) / 2, 1) for r in rects})
        # Duplikate (gleiche Spalte, mehrere Rects) zusammenfassen
        cols = []
        for x in rx:
            if not cols or x - cols[-1] > 5: cols.append(x)
        yield_info = {"page": p.page_number, "header_cols": len(cols), "dot_cols": len(dcols)}
        print("  page", yield_info, file=sys.stderr)
        if len(cols) != 26:
            raise SystemExit(f"Unerwartete Spaltenzahl {len(cols)} auf Seite {p.page_number} – bitte prüfen")
        # Zeilen-Labels: upright Wörter links der ersten Spalte
        first = cols[0] - 15
        words = [w for w in p.extract_words(extra_attrs=["upright"]) if w["upright"] and w["x1"] < first and w["top"] > top_dot - 8]
        # Nummernspalte bestimmen (häufigste x-Position einstelliger/zweistelliger Zahlen);
        # Seitenzahlen o.ä. ausserhalb der Spalte ignorieren
        from collections import Counter
        numx = Counter(round(w["x1"]) for w in words if re.fullmatch(r"\d{1,2}", w["text"]))
        nrx = numx.most_common(1)[0][0]
        words = [w for w in words if not (re.fullmatch(r"\d{1,3}", w["text"]) and w["x1"] < nrx - 8)]
        lab = clusters(words, lambda w: (w["top"] + w["bottom"]) / 2, 2)
        labels = []
        for l in lab:
            l = sorted(l, key=lambda w: w["x0"])
            nrw = [w for w in l if re.fullmatch(r"\d{1,2}", w["text"]) and abs(w["x1"] - nrx) <= 3]
            if not nrw: continue
            nr = int(nrw[0]["text"])
            titel = " ".join(w["text"] for w in l if w["x0"] > nrw[0]["x1"])
            yc = sum((w["top"] + w["bottom"]) / 2 for w in l) / len(l)
            labels.append((yc, nr, titel))
        for d in dots:
            dx = (d["x0"] + d["x1"]) / 2; dy = (d["top"] + d["bottom"]) / 2
            ci = min(range(26), key=lambda i: abs(cols[i] - dx))
            if abs(cols[ci] - dx) > 10: continue
            li = min(labels, key=lambda l: abs(l[0] - dy))
            if abs(li[0] - dy) > 5: continue
            r = rows.setdefault(li[1], {"titel": li[2], "codes": set()})
            r["codes"].add(CODES[ci])
        for yc, nr, titel in labels:
            rows.setdefault(nr, {"titel": titel, "codes": set()})
    return {nr: {"titel": v["titel"], "codes": sorted(v["codes"], key=CODES.index)} for nr, v in sorted(rows.items())}

import glob
out = {}
imgdir = sys.argv[2]
for band, path in zip(sys.argv[3::2], sys.argv[4::2]):
    print(band, file=sys.stderr)
    out[band] = extract(path, sorted(glob.glob(f"{imgdir}/zb{band}-*.png")))
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
for band, rows in out.items():
    print(f"== {band}: {len(rows)} Lernumgebungen, {sum(len(r['codes']) for r in rows.values())} Bezüge")
