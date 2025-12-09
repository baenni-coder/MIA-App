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
│   │   ├── themen/              # Themen-Endpunkte
│   │   └── teachers/            # Lehrer-Endpunkte
│   ├── auth/                     # Auth-Seiten
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                # Dashboard-Seiten
│   │   └── jahresplan/          # Jahresplan Kanban-Board
│   ├── layout.tsx               # Root Layout
│   └── page.tsx                 # Landing Page
├── components/                   # React Komponenten
│   ├── ui/                      # shadcn/ui Basis-Komponenten
│   ├── DashboardLayout.tsx      # Dashboard Layout
│   ├── KanbanBoard.tsx          # Jahresplan Kanban-Board
│   └── ProtectedRoute.tsx       # Auth-Schutz
├── contexts/                     # React Contexts
│   └── AuthContext.tsx          # Authentication State
├── lib/                          # Utility Libraries
│   ├── airtable/                # Airtable Integration
│   │   ├── config.ts            # Airtable Konfiguration
│   │   ├── themen.ts            # Themen CRUD
│   │   ├── schulen.ts           # Schulen CRUD
│   │   └── kompetenzen.ts       # Kompetenzen Auflösung
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

**Tabelle: `Kompetenzen`**
- Name (string) - Bezeichnung der Kompetenz
- Weitere Felder je nach Airtable-Setup

## Wichtige Features

### 1. Authentifizierung
- E-Mail/Passwort Login über Firebase
- Registrierung mit Schul- und Stufenauswahl
- Geschützte Routen via ProtectedRoute-Component
- Server-seitige Session-Validierung

### 2. Jahresplan Kanban-Board
- 6 Spalten für Zeiträume:
  - Sommerferien - Herbstferien
  - Herbstferien - Weihnachtsferien
  - Weihnachtsferien - Winterferien
  - Winterferien - Frühlingsferien
  - Frühlingsferien - Sommerferien
  - Zusatz
- Filterung nach Klassenstufe des Lehrers
- Klickbare Karten mit Detailansicht
- Anzeige von:
  - Thema
  - Beschreibung ("Um was geht es?")
  - Lehrmittel-Bild
  - Anzahl Lektionen
  - Kompetenzen (aufgelöst aus verlinkten Records)
  - Links zu Unterlagen und PICTS-Buchung

### 3. Schulspezifische PICTS-Links
- Jede Schule hat einen eigenen PICTS-Buchungslink
- Link wird aus der Schulen-Tabelle geladen
- Angezeigt in der Themen-Detailansicht

### 4. Kompetenzen-Auflösung
- Kompetenzen sind in Airtable als verlinkte Records gespeichert
- Batch-Loading aller Kompetenzen für Performance
- Automatische Auflösung von Record-IDs zu lesbaren Namen
- Fehlertoleranz bei fehlenden Kompetenzen

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
AIRTABLE_KOMPETENZEN_TABLE=Kompetenzen
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
- Batch-Loading aller Kompetenzen
- Auflösung von IDs zu Namen vor Rückgabe

### Problem: Airtable Array-Felder
**Ursache**: Airtable Multiple-Select und Linked Records kommen als Arrays
**Lösung**:
- Typ-Prüfung mit `Array.isArray()`
- Flexible Parser-Funktionen (z.B. `parseStufen()`)

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
Lädt Lehrerprofil inkl. Schul-Informationen

### POST `/api/teachers`
Erstellt neues Lehrerprofil
```json
{
  "userId": "firebase-uid",
  "email": "lehrer@schule.ch",
  "name": "Max Mustermann",
  "schuleId": "recXXXXXXXXXXXXXX",
  "stufe": "5. Klasse"
}
```

### GET `/api/themen?stufe={stufe}&grouped=true`
Lädt Themen nach Stufe, gruppiert nach Zeiträumen

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
