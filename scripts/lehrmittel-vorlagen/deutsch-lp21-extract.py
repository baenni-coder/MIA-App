import sys, re, json, pdfplumber
pdf = pdfplumber.open(sys.argv[1])
KB = [(206.5,"D.1","Hören"),(311.8,"D.2","Lesen"),(427.9,"D.3","Sprechen"),(544.4,"D.4","Schreiben"),(779.4,"D.5","Sprache(n) im Fokus"),(890.2,"D.6","Literatur im Fokus")]
BANDS = [["Drei","Vier"],["Fünf","Sechs"]]
result = {}
for pi, page in enumerate(pdf.pages):
    words = [w for w in page.extract_words(extra_attrs=["upright"]) if w["upright"]]
    headers = sorted([w for w in words if re.match(r"^D\.\d\.[A-G]\.\d$", w["text"])], key=lambda w: w["x0"])
    hy = headers[0]["top"]
    # label rows
    lab = {}
    for w in words:
        if 60 <= w["x0"] < 205 and w["top"] > hy + 8 and w["top"] < 790:
            lab.setdefault(round(w["top"]), []).append(w)
    rows = []
    for t in sorted(lab):
        ws = sorted(lab[t], key=lambda w: w["x0"])
        nr = None; txt = []
        for w in ws:
            if w["x0"] < 80:
                if w["text"] != "Üben": nr = w["text"]
            else: txt.append(w["text"])
        if txt: rows.append(dict(top=t, nr=nr, titel=" ".join(txt)))
    # merge rows that are too close (multi-line labels) - none expected
    tops = [r["top"] for r in rows]
    bounds = []
    for i, t in enumerate(tops):
        lo = (tops[i-1] + t) / 2 if i else t - 9
        hi = (t + tops[i+1]) / 2 if i + 1 < len(tops) else t + 12
        bounds.append((lo, hi))
    # vertical frame edges
    verts = [r for r in page.rects if str(r.get("non_stroking_color")) == "0.0" and r["width"] < 2 and r["height"] > 5]
    for r, (lo, hi) in zip(rows, bounds):
        r["codes"] = []; r["mi"] = []; r["fokus"] = []
        yc = (lo + hi) / 2
        for x, code, name in KB:
            if any(abs(v["x0"] - x) < 1.5 and v["top"] - 1 <= yc <= v["bottom"] + 1 for v in verts):
                r["fokus"].append(code)
        for w in words:
            wc = (w["top"] + w["bottom"]) / 2
            if not (lo <= wc < hi): continue
            if w["text"].startswith("MI."):
                if w["text"] not in r["mi"]: r["mi"].append(w["text"])
            elif re.match(r"^[a-h]\d*$", w["text"]) and 215 < w["x0"] < 1060:
                col = [h for h in headers if h["x0"] <= w["x0"] + 3]
                if not col: continue
                c = col[-1]["text"] + "." + w["text"][0]
                if c not in r["codes"]: r["codes"].append(c)
    # split bands: each band = 5 chapters + Üben rows until next nr == "1"
    split = [i for i, r in enumerate(rows) if r["nr"] == "1"]
    for bi, start in enumerate(split):
        end = split[bi + 1] if bi + 1 < len(split) else len(rows)
        result[BANDS[pi][bi]] = rows[start:end]
json.dump(result, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
for band, rs in result.items():
    print("==", band)
    for r in rs:
        print(f"  {r['nr'] or 'Ü'} {r['titel']:<38} fokus={','.join(r['fokus']):<16} n={len(r['codes']):>2} MI={r['mi']}")
