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
