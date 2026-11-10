import json, re, sys
raster = json.load(open(sys.argv[1])); repo = sys.argv[2]
for band in "3456":
    p = f"{repo}/src/lib/data/lehrmittel-vorlagen/schweizer-zahlenbuch-{band}.ts"
    s = open(p).read(); n = 0
    def sub(m):
        global n
        nr = m.group(1); body = m.group(2)
        codes = raster[band].get(nr, {}).get("codes", [])
        if not codes or "lp21Codes" in body: return m.group(0)
        n += 1
        return "{ nr: %s,%s, lp21Codes: [%s] }" % (nr, body, ", ".join('"%s"' % c for c in codes))
    s2 = re.sub(r"\{ nr: (\d+),((?:(?!\}).)*?) \}", sub, s)
    open(p, "w").write(s2)
    print(band, "Kapitel mit Codes:", n)
