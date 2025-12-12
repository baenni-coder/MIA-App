# MIA-App - Dokumentation für Claude Code

## Projektübersicht

Die MIA-App ist eine Webanwendung für Lehrpersonen zur Verwaltung ihres Jahresplans für "Medien, Informatik und Anwendungskompetenzen (MIA)". Die App ermöglicht es Lehrern, sich anzumelden, ihre Schule und Klassenstufe auszuwählen und einen personalisierten Jahresplan in einem Kanban-Board-Format anzuzeigen.

## Tech Stack

- **Framework**: Next.js 15 mit App Router
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui Komponenten
- **Authentifizierung**: Firebase Authentication (Client + Admin SDK)
- **Datenbank**:
  - Firebase Firestore (Lehrerprofile)
  - Airtable (Themen, Schulen, Kompetenzen)
- **Deployment**: Optimiert für Vercel

## Architektur

### Ordnerstruktur

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── schulen/             # Schulen-Endpunkte
│   │   ├── teachers/            # Lehrer-Endpunkte (GET, POST, PUT)
│   │   └── themen/              # Themen-Endpunkte
│   ├── auth/                     # Auth-Seiten
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                # Dashboard-Seiten
│   │   ├── jahresplan/          # Jahresplan mit Stufe-Auswahl
│   │   ├── lehrmittel/          # Lehrmittel-Übersicht
│   │   └── page.tsx             # Dashboard mit Profil-Bearbeitung
│   ├── layout.tsx               # Root Layout
│   └── page.tsx                 # Landing Page
├── components/                   # React Komponenten
│   ├── ui/                      # shadcn/ui Basis-Komponenten
│   │   ├── badge.tsx            # Badge für Kompetenzen
│   │   ├── dialog.tsx           # Dialoge für Details
│   │   ├── select.tsx           # Radix UI Select-Komponente
│   │   └── ...                  # Weitere UI-Komponenten
│   ├── DashboardLayout.tsx      # Dashboard Layout mit Logo
│   ├── KanbanBoard.tsx          # Kanban-Board mit Roboter-Bildern
│   └── ProtectedRoute.tsx       # Auth-Schutz
├── contexts/                     # React Contexts
│   └── AuthContext.tsx          # Authentication State
├── lib/                          # Utility Libraries
│   ├── airtable/                # Airtable Integration
│   │   ├── config.ts            # Airtable Konfiguration
│   │   ├── themen.ts            # Themen CRUD
│   │   ├── schulen.ts           # Schulen CRUD
│   │   ├── kompetenzen.ts       # Kompetenzen mit Unterrichtsideen
│   │   ├── unterrichtsideen.ts  # Unterrichtsideen Auflösung
│   │   └── lektionsplanung.ts   # Lektionsplanung CRUD
│   └── firebase/                # Firebase Integration
│       ├── config.ts            # Client-Side Config
│       └── admin.ts             # Server-Side Admin SDK
├── middleware.ts                 # Next.js Middleware
└── types/                        # TypeScript Typen
    └── index.ts                 # Zentrale Type Definitions
```

## Datenmodell

### Firebase Firestore

**Collection: `teachers`**
```typescript
{
  email: string
  name: string
  schuleId: string          // Airtable Record ID
  stufe: Stufe              // z.B. "1. Klasse", "5. Klasse"
  role: "teacher"
  createdAt: string
}
```

### Airtable

**Tabelle: `Themen`**
- Thema (string)
- Um was geht es? (long text)
- Lehrmittel (string)
- Bild Lehrmittel (attachment)
- Anzahl Lektionen (number)
- Kompetenzen Lehrplan (linked records → Kompetenzen)
- File rouge (string)
- Unterlagen zum Kapitel (URL)
- Schuljahr (multiple select: KiGa, 1.-9. Klasse)
- Lektionsplanung (URL)
- Zeitraum der Bearbeitung (select)
- Startdatum (date)
- Übersicht PICTS Buchungen (URL)
- PICTS buchen (URL)

**Tabelle: `Schulen`**
- Name (string)
- Ort (string)
- PICTS buchen (URL) - Schulspezifischer PICTS-Link
- Created (date)

**Tabelle: `Kompetenzen Lehrplan`**
- Name (string) - Bezeichnung der Kompetenz
- LP Code (string) - Lehrplan-Code (z.B. "MI.1.1.a")
- Kompetenzbereich (string) - Kategorie der Kompetenz
- Kompetenz (long text) - Detaillierte Beschreibung
- Kompetenzstufe (string) - Stufe der Kompetenz
- Zyklus (multiple select) - Zugeordnete Zyklen
- Klassenstufe (multiple select) - Zugeordnete Klassenstufen
- Grundanspruch (long text) - Minimale Anforderungen
- Querverweis LP (string) - Verweise zu anderen Kompetenzen
- Unterrichtsideen (linked records → Themen) - Verlinkte Unterrichtsideen

**Tabelle: `Unterrichtsideen` (nutzt Themen-Tabelle)**
- Thema (string) - Name der Unterrichtsidee
- Lehrmittel (string) - Verwendetes Lehrmittel
- Anzahl Lektionen (number) - Dauer der Unterrichtsidee

**Tabelle: `Lektionsplanung`**
- Eindeutige Lektionsbezeichnung (string) - Eindeutiger Identifier
- Lektion (string) - Lektionsnummer
- Thema (linked record → Themen) - Referenz zum Thema
- Aufgaben (long text) - Beschreibung der Aufgaben
- Vorwissen (long text) - Benötigtes Vorwissen
- Material (string) - Materialien (CSV)
- Website oder Tool (linked records) - Verlinkte Tools/Websites
- Name (from Website oder Tool) (lookup) - Tool-Namen
- Link (from Website oder Tool) (lookup) - Tool-Links
- Einstieg (long text) - Einstiegsphase der Lektion
- Hauptteil (long text) - Hauptteil der Lektion
- Abschluss (long text) - Abschlussphase der Lektion
- Stolpersteine (long text) - Häufige Probleme/Hinweise
- KI Zusammenfassung Lektion (long text) - KI-generierte Zusammenfassung

## Wichtige Features

### 1. Authentifizierung
- E-Mail/Passwort Login über Firebase
- Registrierung mit Schul- und Stufenauswahl
- Geschützte Routen via ProtectedRoute-Component
- Server-seitige Session-Validierung

### 2. Dashboard
- **Profil-Übersicht**: Anzeige von Name, Schule, Stufe
- **Stufe-Bearbeitung**: Lehrpersonen können ihre Stufe für das nächste Schuljahr ändern
- **Schnellzugriff**: Jahresplan, Lehrmittel, PICTS-Buchungen
- **MIA-App Logo**: Branding in Header und Auth-Seiten

### 3. Jahresplan Kanban-Board
- **6 Spalten für Zeiträume** mit Roboter-Bildern:
  - Sommerferien - Herbstferien (roboter_sommer.png)
  - Herbstferien - Weihnachtsferien (roboter_herbst.png)
  - Weihnachtsferien - Winterferien (roboter_weihnachten.png)
  - Winterferien - Frühlingsferien (roboter_winter.png)
  - Frühlingsferien - Sommerferien (roboter_sommer.png)
  - Zusatz
- **Temporäre Stufe-Auswahl**: Dropdown zum Anschauen anderer Klassenstufen
- **Klickbare Themen-Karten** mit Detailansicht:
  - Thema, Beschreibung ("Um was geht es?")
  - Lehrmittel-Bild
  - Anzahl Lektionen
  - Klickbare Kompetenzen-Badges
  - Links zu Unterlagen und PICTS-Buchung

### 4. Klickbare Kompetenzen mit Detail-Dialog
- **Kompetenzen als Badges**: Klickbar mit LP-Code oder Namen
- **Kompetenz-Detail-Dialog** zeigt:
  - LP Code (z.B. "MI.1.1.a")
  - Kompetenzbereich (Badge)
  - Kompetenz (Detailbeschreibung)
  - Kompetenzstufe
  - Zyklus und Klassenstufe
  - Grundanspruch
  - Querverweis LP
  - **Unterrichtsideen**: Mit Lehrmittel und Lektionenanzahl
- **Zwei-Dialog-System**: Thema-Dialog → Kompetenz-Dialog

### 5. Lehrmittel-Übersicht
- Gruppierung aller Themen nach Lehrmittel
- Alphabetische Sortierung
- Für jedes Lehrmittel:
  - Lehrmittel-Bild
  - Liste aller zugehörigen Themen
  - Klassenstufen-Anzeige
  - Links zu Unterlagen und Lektionsplanung

### 6. Schulspezifische PICTS-Links
- Jede Schule hat einen eigenen PICTS-Buchungslink
- Link wird aus der Schulen-Tabelle geladen
- PICTS-Karte im Dashboard öffnet den Link
- Angezeigt in der Themen-Detailansicht

### 7. Daten-Auflösung mit Batch-Loading
- **Kompetenzen**: Automatische Auflösung von Record-IDs zu vollständigen Objekten
- **Unterrichtsideen**: Nested Resolution über verlinkte Records
- **Performance-Optimierung**: Batch-Loading à 10 IDs pro Request
- **Fehlertoleranz**: Graceful Handling bei fehlenden Daten

### 8. Lektionsplanung mit Export
- **Lektionsplanung-Viewer** im Thema-Dialog:
  - Button "Lektionsplanung anzeigen" in jedem Thema
  - Automatisches Laden aller Lektionen zum Thema aus Airtable
  - Akkordeon-Ansicht für strukturierte Darstellung
- **Detaillierte Lektionsinhalte**:
  - KI-Zusammenfassung der Lektion (hervorgehoben)
  - Aufgaben und Lernziele
  - Benötigtes Vorwissen
  - Material-Liste als Badges
  - Websites & Tools mit klickbaren Links
  - Einstieg, Hauptteil, Abschluss (3-Phasen-Modell)
  - Stolpersteine (Warnhinweise in gelb hervorgehoben)
- **Export-Funktionen**:
  - **Markdown-Export**: Strukturierte .md Datei für einfache Bearbeitung
  - **PDF-Export**: Professionell formatiertes PDF mit:
    - Deckblatt mit Thema und Datum
    - Jede Lektion auf separater Seite
    - Fußzeilen mit Seitenzahlen
    - Automatischer Seitenumbruch bei zu langem Content
- **Daten-Integration**:
  - Verknüpfung von Lektionen mit Themen über Airtable Linked Records
  - Lookup-Felder für Tool-Namen und Links
  - CSV-Parsing für Material-Listen

## Umgebungsvariablen

Kopiere `.env.example` zu `.env.local` und fülle folgende Werte:

```bash
# Firebase Client (NEXT_PUBLIC_ für Browser-Zugriff)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (Server-only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Airtable
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_THEMEN_TABLE=Themen
AIRTABLE_SCHULEN_TABLE=Schulen
AIRTABLE_KOMPETENZEN_TABLE=Kompetenzen Lehrplan
AIRTABLE_UNTERRICHTSIDEEN_TABLE=Themen
AIRTABLE_LEKTIONSPLANUNG_TABLE=Lektionsplanung
```

## Entwicklung

### Installation
```bash
npm install
```

### Development Server starten
```bash
npm run dev
```

App läuft auf: http://localhost:3000

### Build für Produktion
```bash
npm run build
npm start
```

## Bekannte Herausforderungen & Lösungen

### Problem: Firebase/Airtable Initialisierung während Build
**Lösung**: Lazy Initialization Pattern
- Client-Side Firebase nur im Browser initialisieren (`typeof window !== "undefined"`)
- Server-Side Firebase Admin und Airtable mit Getter-Funktionen (`getAdminDb()`, `getBase()`)

### Problem: Kompetenzen als kryptische IDs
**Ursache**: Airtable gibt bei verlinkten Records nur Record-IDs zurück
**Lösung**:
- Separate `kompetenzen.ts` Datei mit `getKompetenzenByIds()`
- Batch-Loading aller Kompetenzen (à 10 IDs pro Request)
- Auflösung von IDs zu vollständigen Objekten
- Nested Resolution für Unterrichtsideen

### Problem: Airtable Array-Felder
**Ursache**: Airtable Multiple-Select und Linked Records kommen als Arrays
**Lösung**:
- Typ-Prüfung mit `Array.isArray()`
- Flexible Parser-Funktionen (z.B. `parseStufen()`)

### Problem: @radix-ui/react-select nicht gefunden beim Dev-Server
**Ursache**: Webpack cached alte Version der select.tsx-Komponente
**Lösung**:
```bash
# 1. Dev-Server stoppen (Ctrl+C)
# 2. Cache und Dependencies neu aufbauen
rm -rf .next node_modules
npm install
# 3. Dev-Server neu starten
npm run dev
```
**Wichtig**: Nach Installation von `@radix-ui/react-select` immer Dev-Server neu starten!

### Problem: Hydration Error mit Badge in DialogDescription
**Ursache**: `<div>` (Badge) kann nicht in `<p>` (DialogDescription) sein
**Lösung**:
- Badge außerhalb von DialogDescription in separates `<div>` verschieben
- HTML-Semantik beachten: Block-Elemente nicht in Inline-Elementen

## Deployment

### Vercel (empfohlen)
1. Repository mit Vercel verbinden
2. Umgebungsvariablen in Vercel Dashboard setzen
3. Deploy ausführen

**Wichtig für Firebase Admin SDK auf Vercel:**
- Private Key muss JSON-escaped sein
- Anführungszeichen im Dashboard müssen beachtet werden

## API Endpunkte

### GET `/api/teachers?userId={uid}`
Lädt Lehrerprofil inkl. Schul-Informationen (mit PICTS-Link der Schule)

**Response:**
```json
{
  "userId": "firebase-uid",
  "email": "lehrer@schule.ch",
  "name": "Max Mustermann",
  "schuleId": "recXXXXXXXXXXXXXX",
  "stufe": "5. Klasse",
  "role": "teacher",
  "createdAt": "2024-12-10T...",
  "schule": {
    "id": "recXXXXXXXXXXXXXX",
    "name": "Schule Beispiel",
    "ort": "Zürich",
    "pictsBuchen": "https://..."
  }
}
```

### POST `/api/teachers`
Erstellt neues Lehrerprofil

**Request Body:**
```json
{
  "userId": "firebase-uid",
  "email": "lehrer@schule.ch",
  "name": "Max Mustermann",
  "schuleId": "recXXXXXXXXXXXXXX",
  "stufe": "5. Klasse"
}
```

### PUT `/api/teachers`
Aktualisiert Lehrerprofil (z.B. Stufe ändern)

**Request Body:**
```json
{
  "userId": "firebase-uid",
  "stufe": "6. Klasse"
}
```

### GET `/api/themen?stufe={stufe}&grouped=true`
Lädt Themen nach Stufe, gruppiert nach Zeiträumen

**Response:**
```json
{
  "Sommerferien - Herbstferien": [
    {
      "id": "recXXX",
      "thema": "...",
      "kompetenzen": [
        {
          "id": "recYYY",
          "lpCode": "MI.1.1.a",
          "name": "...",
          "unterrichtsideen": [...]
        }
      ]
    }
  ]
}
```

### GET `/api/schulen`
Lädt alle Schulen für Registrierungs-Dropdown

### GET `/api/lektionsplanung?thema={themaName}`
Lädt alle Lektionen für ein bestimmtes Thema

**Response:**
```json
{
  "lektionen": [
    {
      "id": "recXXX",
      "eindeutigeBezeichnung": "Lektion 1 - 1 Mitten in der Medienwelt",
      "lektion": "Lektion 1",
      "themaId": "recYYY",
      "themaName": "1 Mitten in der Medienwelt",
      "aufgaben": "1A | Medien – deine täglichen Begleiter...",
      "vorwissen": "...",
      "material": ["Tablet", "Beamer"],
      "websiteTools": [
        {
          "id": "recZZZ",
          "name": "Code.org",
          "link": "https://code.org/"
        }
      ],
      "einstieg": "...",
      "hauptteil": "...",
      "abschluss": "...",
      "stolpersteine": "...",
      "kiZusammenfassung": "..."
    }
  ]
}
```

## Tipps für weitere Entwicklung

### Neue Airtable-Tabelle hinzufügen
1. `.env.example` erweitern: `AIRTABLE_NEUE_TABELLE=TabellenName`
2. TypeScript Interface in `src/types/index.ts` definieren
3. CRUD-Funktionen in `src/lib/airtable/neue-tabelle.ts` erstellen
4. Lazy Initialization mit `getBase()` verwenden

### Neue UI-Komponente hinzufügen
```bash
npx shadcn@latest add [component-name]
```

### Neue geschützte Route
1. Seite in `src/app/dashboard/` erstellen
2. `<ProtectedRoute>` Component verwenden
3. `<DashboardLayout>` für konsistentes Layout

## Kontakt & Support

Bei Fragen oder Problemen:
- Check die Konsole für detaillierte Error-Logs
- Firebase Admin Logs in Vercel Function Logs
- Airtable API Limits beachten (5 requests/second)

## Lizenz

Privates Projekt für Schulen
