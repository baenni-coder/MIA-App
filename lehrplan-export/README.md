# Lehrplan-Daten Export (JSON)

Statischer Export der in der MIA-App integrierten Lehrplan-Daten zur
Weiterverwendung in anderen Projekten. Beide Dateien sind reines JSON
ohne App-Abhängigkeiten.

## Dateien

### `lehrplan21-fachbereiche.json`
Fachbereichsstruktur des Lehrplan 21 (Solothurner Version, so.lehrplan.ch).
Fokus auf Zyklus 1 (KG–2. Klasse) und Zyklus 2 (3.–6. Klasse).

- 11 Fachbereiche (D, DaZ, FS1, FS2, MA, NMG, BG, TTG, MU, BS, MI)
- Hierarchie: `fachbereiche[] → kompetenzbereiche[] → kompetenzen[]`
- Zusätzlich: `meta` (Quelle/Version) und `ueberfachlicheKompetenzen`

Struktur pro Kompetenz:
```json
{ "id": "D.1.A", "code": "D.1.A.1", "name": "...", "beschreibung": "..." }
```

Hinweis (aus `meta`): Die LP21-API (api.lehrplan.ch) erfordert einen separaten
Zugang bei der D-EDK. Diese Datei ist die statische Basis; die vollständigen
Kompetenzstufen mit allen LP-Codes werden in der App bei vorhandenem API-Zugang
zusätzlich von der LP21-API geladen und in Firestore gecacht.

### `regelstandards-so.json`
Regelstandards Kanton Solothurn für Medien & Informatik / Informatische Bildung.
184 Einträge, gegliedert in 7 Handlungsfelder.

Struktur pro Eintrag:
```json
{
  "rsCode": "RS.1.1.a",
  "handlungsfeld": "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
  "handlungsfeldNummer": 1,
  "dimension": "Dimension Zugang: ...",
  "kompetenz": "Datensicherheit",
  "kompetenzenLehrplan": ["IB.2.3.b", "IB.3.1.a"],
  "kompetenzstufe": "…können sich mit eigenem Login anmelden ...",
  "zyklus": "Zyklus 2",
  "klassenstufe": "3./4."
}
```
`kompetenzenLehrplan` referenziert LP21-Codes (IB.x.y.z / MI.x.y.z).

## Quellen in der App
- `src/lib/data/lehrplan21-fachbereiche.json`
- `src/lib/data/regelstandards.ts` (hier nach JSON konvertiert)
