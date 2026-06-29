# Anleitung: Kompletten Lehrplan-Datensatz als JSON exportieren

Es gibt zwei Wege, an den vollständigen Datensatz zu kommen. **Weg A** ist für
die meisten Fälle der richtige: Er exportiert den bereits in eurer App
synchronisierten Datensatz (LP21 **und** Airtable) read-only aus Firestore.
**Weg B** holt die LP21-Daten frisch und direkt von der LP21-API.

---

## Weg A (empfohlen): Export aus Firestore

Voraussetzung: In Firestore liegen die synchronisierten Daten bereits vor
(d.h. ein Sync wurde über die Admin-UI oder `lp21:sync` schon einmal gemacht).
Der Export schreibt **nichts** – er liest nur.

### Schritt 1 – Projekt vorbereiten

```bash
cd MIA-App
npm install
```

`firebase-admin` und `dotenv` sind bereits Dependencies, es muss nichts
zusätzlich installiert werden.

### Schritt 2 – Credentials in `.env.local` setzen

Du brauchst nur die drei Firebase-Admin-Variablen (gleich wie für die App).
Falls `.env.local` noch nicht existiert: aus `.env.example` kopieren.

```bash
FIREBASE_ADMIN_PROJECT_ID=dein-projekt-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@dein-projekt.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> Den Private Key in **doppelte Anführungszeichen** setzen; die `\n` bleiben
> als Text stehen, das Script wandelt sie korrekt in Zeilenumbrüche um.
> Die Werte stammen aus der Firebase Service-Account-JSON
> (Firebase Console → Projekteinstellungen → Dienstkonten → Neuen privaten Schlüssel generieren).

### Schritt 3 – Export ausführen

```bash
# Lehrplan-Collections (Default): system_kompetenzen + lp21_struktur
npm run export:lehrplan

# Alternativ direkt:
node scripts/export-lehrplan-data.js
```

Optionen:

```bash
# Alle System-Collections (zusätzlich Themen, Schulen, Lektionen, Sync-Metadaten)
node scripts/export-lehrplan-data.js --all

# Nur bestimmte Collections
node scripts/export-lehrplan-data.js system_kompetenzen lp21_struktur

# Ziel-Ordner wählen (Default: ./lehrplan-export)
node scripts/export-lehrplan-data.js --out ./mein-export
```

### Schritt 4 – Ergebnis

Im Ziel-Ordner (Default `lehrplan-export/`) liegen anschliessend:

| Datei | Inhalt |
|---|---|
| `system_kompetenzen.json` | Alle einzelnen Kompetenzstufen mit LP-Codes (LP21 + Airtable, inkl. MI.3/IB.3 Anwendungskompetenzen) |
| `lp21_struktur.json` | LP21-Fachbereich-Strukturen (Kompetenzbereiche → Kompetenzen) |
| `_manifest.json` | Übersicht: Collection → Anzahl Dokumente, Export-Zeitstempel |

Mit `--all` zusätzlich `system_themes.json`, `system_schulen.json`,
`system_lektionen.json`, `sync_metadata.json`, `sync_logs.json`.

Jedes Dokument enthält ein `id`-Feld (Firestore-Doc-ID), Firestore-Timestamps
werden als ISO-Strings (`2026-06-29T12:34:56.000Z`) ausgegeben.

---

## Weg B: Frisch direkt von der LP21-API crawlen

Nutze diesen Weg, wenn du die **aktuellsten** LP21-Daten direkt von
`api.lehrplan.ch` willst (statt des Firestore-Caches). Erfordert zusätzlich
LP21-API-Zugang (D-EDK) in `.env.local`. Dieses Script schreibt die Daten
auch in Firestore.

```bash
# Verfügbare Fachbereiche eines Kantons auflisten
npm run lp21:list                        # Default-Kanton (LP21_DEFAULT_KANTON, sonst "so")
npx tsx scripts/lp21-sync.ts --list --kanton zh

# Alle Fachbereiche syncen UND als JSON-Backup speichern
npm run lp21:sync:json
# → erzeugt pro Fachbereich data/lp21/<kanton>-<code>.json

# Nur einen Fachbereich
npx tsx scripts/lp21-sync.ts --fachbereich SPR --json
```

Die JSON-Backups landen unter `data/lp21/` (eine Datei pro Fachbereich, mit
vollständigem Kompetenzbaum inkl. Kompetenzstufen).

> Hinweis: Weg B deckt nur die LP21-API-Daten ab. Die aus Airtable stammenden
> Kompetenzen (z.B. Anwendungskompetenzen MI.3/IB.3, Unterrichtsideen-Verknüpfungen)
> sind nur über **Weg A** (Firestore-Export) vollständig enthalten.

---

## Troubleshooting

- **„Firebase Admin Konfiguration fehlt"** → eine der drei `FIREBASE_ADMIN_*`
  Variablen fehlt oder ist leer in `.env.local`.
- **„Cannot find module 'firebase-admin'"** → `npm install` wurde noch nicht
  ausgeführt.
- **Leere/zu wenige Dokumente** → in Firestore wurde noch kein (vollständiger)
  Sync durchgeführt. Erst über die Admin-Sync-UI bzw. `npm run lp21:sync`
  befüllen, dann erneut exportieren.
- **Private-Key-Fehler (`error:0909...` / PEM)** → Key muss in doppelten
  Anführungszeichen stehen und die `\n` als Text enthalten.
