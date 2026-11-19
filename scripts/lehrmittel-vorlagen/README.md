# Lehrmittel-Vorlagen: Deutsch (LMVZ) aus der LP21-Bezugsmatrix

Die Vorlagen `src/lib/data/lehrmittel-vorlagen/deutsch-*.ts` werden aus der
Verlags-Übersicht „Bezüge zum Lehrplan 21" (PDF, A3 quer) erzeugt:

```bash
pip install pdfplumber
python3 scripts/lehrmittel-vorlagen/deutsch-lp21-extract.py D_Z2_LP21-Ref_detailliert.pdf matrix.json
python3 scripts/lehrmittel-vorlagen/deutsch-generate.py matrix.json src/lib/data/lehrmittel-vorlagen
```

- **Extraktor**: liest Wortkoordinaten. Zeilen = Kapitel/Üben-Bereiche (Label-Spalte),
  Spalten = Kompetenz-Codes im Kopf (`D.x.y.z`), Zelle `d1` → Kompetenzstufe `….d`.
  Schwarze Rahmen-Rechtecke = fokussierte Kompetenzbereiche, letzte Spalte = MI-Codes.
- **Generator**: 5 Kapitel à 6 Wochen + Freibereich (Themen ≈ 2/3) und ein
  begleitender Block „Üben" (≈ 1/3). Spalten-/Zeilen-Positionen sind auf das
  Layout Zyklus 2 (Januar 2026) abgestimmt – bei anderen Zyklen Positionen prüfen
  (`KB`-Konstante, `BANDS`).

# Schweizer Zahlenbuch 3–6: Kompetenzraster → `lp21Codes` pro Lernumgebung

Die Kompetenzraster (Klett und Balmer, „… und der Lehrplan 21") markieren pro
Lernumgebung die angesprochenen **Kompetenzen** (26 Spalten MA.1.A.1 … MA.3.C.3).

```bash
mkdir -p raster-img
pdftoppm -r 150 -png ZB3-Raster.pdf raster-img/zb3   # analog zb4, zb5, zb6
python3 scripts/lehrmittel-vorlagen/zahlenbuch-kompetenzraster-extract.py raster.json raster-img \
  3 ZB3-Raster.pdf 4 ZB4-Raster.pdf 5 ZB5-Raster.pdf 6 ZB6-Raster.pdf
python3 scripts/lehrmittel-vorlagen/zahlenbuch-kompetenzraster-apply.py raster.json .
```

- Spalten werden über die 26 Kopf-Rechtecke bestimmt (Reihenfolge = LP21-Struktur MA).
- **Achtung:** Das PDF zu Band 4 (und teilweise Band 3) enthält verdeckte, um ±89 pt
  verschobene Kopien der Punkte. Deshalb zählt ein Punkt nur, wenn er im gerenderten
  Bild (pdftoppm) tatsächlich dunkel ist.
- Kapitelnummern nur aus der Nummernspalte (Seitenzahlen auf gleicher Höhe ignorieren).
- Beim Übernehmen löst der Server Kompetenz-Codes in Kompetenzstufen auf
  (`src/lib/data/lehrmittel-vorlagen/resolve.ts`): Zyklus der Vorlage; in Zyklus 2
  3./4. Klasse bis und mit Orientierungspunkt, 5./6. Klasse danach.

# NaTech 1|2, 3|4, 5|6: Themenübersicht + LP21-Bezüge (Spiralprinzip)

Die einseitige A3-Übersicht „Bezüge zum Lehrplan 21 – Natur und Technik
Primarstufe" (LMVZ, November 2017) ist **keine Jahresplanung**: pro Band 10 Themen
(Themen 1–5 = 1. Schuljahr, 6–10 = 2. Schuljahr) mit Punkten bei den
Schwerpunkt-Kompetenzen (NMG.x.y).

```bash
pip install pdfplumber
python3 -I scripts/lehrmittel-vorlagen/natech-generate.py Natech_Primar_LP21_Uebersicht.pdf \
  > src/lib/data/lehrmittel-vorlagen/natech.ts
```

- Spalten = Kompetenz-Codes (`NMG.x.y`), Punkte = Glyph „•" (kein Bild), Kontrolle:
  Punkte pro Spalte = Zeile „Anzahl" (wird auf stderr ausgegeben).
- Erzeugt 6 Vorlagen (`natech-1` … `natech-6`, je 5 Themen) mit `art: "themenuebersicht"`
  (kein Richtwert, Vorschlag 4 Wochen), `reihe: "NaTech"` und `strang`/`strangNr`
  für die Spiralprinzip-Matrix. Kompetenz-Texte für Tooltips stehen im Skript.
