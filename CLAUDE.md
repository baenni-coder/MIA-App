# MIA-App - Dokumentation für Claude Code

## Projektübersicht

Die MIA-App ist eine Webanwendung für Lehrpersonen zur Verwaltung ihres Jahresplans für "Medien, Informatik und Anwendungskompetenzen (MIA)". Die App ermöglicht es Lehrern, sich anzumelden, ihre Schule und Klassenstufe auszuwählen und einen personalisierten Jahresplan in einem Kanban-Board-Format anzuzeigen.

**NEU (2024-12)**: Lehrpersonen können jetzt eigene Themen mit Lektionsplanung erstellen. PICTS-Admins können diese Themen prüfen und freigeben. Genehmigte Themen werden systemweit für alle Schulen sichtbar.

## Tech Stack

- **Framework**: Next.js 15 mit App Router
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui Komponenten
- **Authentifizierung**: Firebase Authentication (Client + Admin SDK)
- **Datenbank**:
  - Firebase Firestore (Lehrerprofile, Custom Themes, Custom Lektionen, Notifications)
  - Airtable (System-Themen, Schulen, Kompetenzen, Lektionsplanung)
- **Storage**: Firebase Storage (Lehrmittel-Bilder für Custom Themes)
- **Deployment**: Optimiert für Vercel

## Architektur

### Ordnerstruktur

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                # Auth-Endpunkte
│   │   │   └── check-admin/     # Admin-Status prüfen
│   │   ├── custom-themes/       # Custom Theme CRUD
│   │   │   ├── [id]/           # Single Theme, Update, Delete
│   │   │   │   └── review/      # Theme Review (Approve/Reject)
│   │   │   └── route.ts         # List & Create
│   │   ├── custom-lektionen/    # Custom Lektionen CRUD
│   │   │   ├── [id]/           # Update, Delete
│   │   │   └── route.ts         # List & Create (auch Batch)
│   │   ├── notifications/       # Notifications
│   │   │   ├── [id]/           # Mark single as read
│   │   │   └── route.ts         # List & Mark all read
│   │   ├── upload-image/        # Image Upload zu Firebase Storage
│   │   ├── schulen/             # Schulen-Endpunkte
│   │   ├── teachers/            # Lehrer-Endpunkte (GET, POST, PUT)
│   │   ├── themen/              # Themen-Endpunkte (Airtable + Firestore)
│   │   └── lektionsplanung/     # Lektionsplanung (Airtable)
│   ├── auth/                     # Auth-Seiten
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                # Dashboard-Seiten
│   │   ├── admin/               # Admin Dashboard (Review Workflow)
│   │   ├── jahresplan/          # Jahresplan mit Stufe-Auswahl
│   │   ├── lehrmittel/          # Lehrmittel-Übersicht
│   │   ├── thema-erstellen/     # Custom Theme erstellen
│   │   ├── thema-bearbeiten/[id]/ # Custom Theme bearbeiten
│   │   ├── meine-themen/        # Übersicht eigene Custom Themes
│   │   ├── thema/[id]/lektionen/ # Lektionen-Verwaltung
│   │   └── page.tsx             # Dashboard mit Profil-Bearbeitung
│   ├── layout.tsx               # Root Layout
│   └── page.tsx                 # Landing Page
├── components/                   # React Komponenten
│   ├── ui/                      # shadcn/ui Basis-Komponenten
│   │   ├── badge.tsx            # Badge für Kompetenzen
│   │   ├── checkbox.tsx         # Checkbox (native HTML)
│   │   ├── dialog.tsx           # Dialoge für Details (inkl. DialogFooter)
│   │   ├── select.tsx           # Radix UI Select-Komponente
│   │   ├── textarea.tsx         # Textarea für Formulare
│   │   └── ...                  # Weitere UI-Komponenten
│   ├── AdminThemeReview.tsx     # Admin Review Dialog
│   ├── CustomThemeForm.tsx      # Formular für Custom Themes
│   ├── DashboardLayout.tsx      # Dashboard Layout mit Logo & Notifications
│   ├── KanbanBoard.tsx          # Kanban-Board mit Roboter-Bildern
│   ├── LektionEditor.tsx        # Editor für Custom Lektionen
│   ├── NotificationBell.tsx     # Notification Bell mit Badge
│   ├── ProtectedRoute.tsx       # Auth-Schutz
│   └── ThemeStatusBadge.tsx     # Status Badge (draft, pending, approved, rejected)
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
│   ├── firebase/                # Firebase Integration
│   │   ├── config.ts            # Client-Side Config
│   │   └── admin.ts             # Server-Side Admin SDK
│   ├── firestore/               # Firestore Helper Functions
│   │   ├── permissions.ts       # Rollen-basierte Permissions
│   │   ├── custom-themes.ts     # Custom Themes CRUD
│   │   ├── custom-lektionen.ts  # Custom Lektionen CRUD
│   │   └── notifications.ts     # Notifications CRUD
│   └── storage/                 # Firebase Storage
│       └── upload.ts            # Image Upload & Validation
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
  role: UserRole            // "teacher" | "picts_admin" | "super_admin"
  createdAt: string
}
```

**Collection: `custom_themes`**
```typescript
{
  thema: string             // Name des Themas
  beschreibung: string      // "Um was geht es?"
  lehrmittel?: string       // Optional: Name des Lehrmittels
  bildLehrmittel?: string   // Firebase Storage URL
  anzahlLektionen: number   // Anzahl der Lektionen
  schuljahr: Stufe[]        // Array von Klassenstufen
  zeitraum: Zeitraum        // Kanban-Spalte
  kompetenzenIds: string[]  // Airtable Record IDs
  kompetenzen?: Kompetenz[] // Aufgelöste Kompetenzen (nicht gespeichert)
  fileRouge?: string        // Optional: Roter Faden
  unterlagen?: string       // Optional: URL zu Unterlagen
  createdBy: string         // User ID des Erstellers
  createdByName: string     // Name des Erstellers
  schuleId: string          // Schul-ID (Airtable)
  status: ThemeStatus       // "draft" | "pending_review" | "approved" | "rejected"
  isSystemWide: boolean     // true wenn approved und für alle sichtbar
  reviewedBy?: string       // User ID des Reviewers
  reviewedByName?: string   // Name des Reviewers
  reviewedAt?: Date         // Zeitpunkt des Reviews
  reviewNotes?: string      // Feedback bei Ablehnung
  airtableId?: string       // Falls nach Airtable exportiert
  createdAt: Date
  updatedAt: Date
}
```

**Collection: `custom_lektionen`**
```typescript
{
  customThemeId: string     // Referenz zum Custom Theme
  lektionNummer: string     // z.B. "Lektion 1"
  aufgaben: string          // Aufgabenbeschreibung
  vorwissen?: string        // Benötigtes Vorwissen
  material: string[]        // Liste von Materialien
  websiteTools: Array<{     // Websites & Tools
    name: string
    link: string
  }>
  einstieg?: string         // Einstiegsphase
  hauptteil?: string        // Hauptteil
  abschluss?: string        // Abschlussphase
  stolpersteine?: string    // Hinweise zu häufigen Problemen
  createdAt: Date
  updatedAt: Date
}
```

**Collection: `notifications`**
```typescript
{
  recipientId: string       // User ID des Empfängers
  recipientName: string     // Name des Empfängers
  type: NotificationType    // "theme_submitted" | "theme_approved" | "theme_rejected"
  title: string             // Notification Titel
  message: string           // Notification Text
  actionUrl?: string        // URL zum Klicken
  relatedThemeId?: string   // Referenz zum Theme
  relatedThemeName?: string // Name des Themes
  isRead: boolean           // Gelesen Status
  createdAt: Date
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

### 8. Rollen-basiertes Permissions-System
- **3 Rollen**: `teacher`, `picts_admin`, `super_admin`
- **Teacher**: Kann eigene Custom Themes erstellen und bearbeiten
- **PICTS Admin**: Kann Themen der eigenen Schule reviewen und freigeben
- **Super Admin**: Kann Admins ernennen und alle Themen verwalten
- **Permission Checks**:
  - `canReadCustomTheme()` - Lesen erlaubt?
  - `canEditCustomTheme()` - Bearbeiten erlaubt?
  - `canDeleteCustomTheme()` - Löschen erlaubt?
  - `canReviewCustomTheme()` - Review erlaubt?

### 9. Custom Themes erstellen & verwalten
- **Thema-Erstellung** (`/dashboard/thema-erstellen`):
  - Formular mit allen Thema-Feldern
  - Multi-Select für Klassenstufen mit nativen Checkboxen
  - Zeitraum-Auswahl für Kanban-Spalte
  - Kompetenzen-Auswahl (Airtable IDs)
  - Bild-Upload mit Drag & Drop (max 10MB, JPEG/PNG/WEBP)
  - Zwei Submit-Optionen: "Als Entwurf speichern" oder "Zur Prüfung einreichen"
- **Thema-Bearbeitung** (`/dashboard/thema-bearbeiten/[id]`):
  - Gleiche Features wie Erstellung
  - Auch nach Freigabe editierbar (geht zurück zu "pending_review")
  - Abgelehnte Themen können überarbeitet und neu eingereicht werden
- **Meine Themen** (`/dashboard/meine-themen`):
  - Übersicht aller eigenen Custom Themes
  - Status-Badges (Draft, Pending, Approved, Rejected)
  - Bearbeiten, Löschen, Lektionen verwalten
  - Feedback bei Ablehnung sichtbar

### 10. Custom Lektionen Editor
- **Lektionen-Verwaltung** (`/dashboard/thema/[id]/lektionen`):
  - Liste aller Lektionen zum Thema
  - Lektion hinzufügen, bearbeiten, löschen
- **Lektions-Editor**:
  - Lektionsnummer
  - Aufgaben & Lernziele
  - Benötigtes Vorwissen
  - Material als Tags (hinzufügen/entfernen)
  - Websites & Tools mit Name + Link
  - 3-Phasen-Modell: Einstieg, Hauptteil, Abschluss
  - Stolpersteine (Hinweise für Lehrpersonen)

### 11. Admin Dashboard & Review-Workflow
- **Admin Dashboard** (`/dashboard/admin`):
  - Nur für `picts_admin` und `super_admin` zugänglich
  - Tabs: "Zu prüfen" | "Freigegeben" | "Abgelehnt"
  - Filtert Themen nach Schule des Admins
- **Review-Dialog**:
  - Vollständige Thema-Details anzeigen
  - Kompetenzen und Lektionen einsehen
  - "Freigeben" Button → Status: approved, isSystemWide: true
  - "Ablehnen" Button → Feedback-Feld erforderlich
- **Workflow**:
  1. Teacher erstellt Theme → Status: `draft`
  2. Teacher reicht ein → Status: `pending_review`, Notification an PICTS-Admins
  3. Admin reviewt → `approved` oder `rejected`
  4. Bei Approval: Theme wird systemweit sichtbar
  5. Bei Rejection: Teacher erhält Notification mit Feedback
  6. Teacher kann Theme überarbeiten und neu einreichen

### 12. In-App Notifications
- **Notification Bell** (im Dashboard Header):
  - Badge mit Anzahl ungelesener Notifications
  - Auto-Refresh alle 30 Sekunden
  - Dropdown mit Notification-Liste
  - Klick auf Notification → Navigation zur Action-URL
- **Notification-Typen**:
  - `theme_submitted`: PICTS-Admins werden informiert bei neuer Einreichung
  - `theme_approved`: Teacher wird informiert bei Freigabe
  - `theme_rejected`: Teacher wird informiert bei Ablehnung (mit Feedback)
- **Mark as Read**: Einzeln oder alle auf einmal

### 13. Integration Custom Themes in Jahresplan
- **Automatische Zusammenführung**:
  - `/api/themen` kombiniert Airtable-Themen + Firestore Custom Themes
  - Nur `approved` und `isSystemWide: true` Themen werden angezeigt
  - Custom Themes erscheinen im gleichen Kanban-Board
  - Kompetenzen werden automatisch aufgelöst
  - Gruppierung nach Zeitraum funktioniert für beide Quellen
- **Kennzeichnung**:
  - `isCustom: true` Feld im Thema-Objekt
  - Ermöglicht spätere UI-Differenzierung (z.B. Badge "Eigenes Thema")

### 14. Firebase Storage Integration
- **Image Upload**:
  - Drag & Drop oder File-Select
  - Client-seitige Validierung: max 10MB, JPEG/PNG/WEBP
  - Server-seitige Validierung: File-Type, File-Size
  - Automatische Komprimierung für große Bilder
  - Unique Dateinamen: `theme-images/{userId}/{timestamp}-{originalName}`
- **Storage Security Rules**:
  - Nur authentifizierte User können hochladen
  - Bilder sind öffentlich lesbar (für Jahresplan-Anzeige)

### 15. Lektionsplanung mit Export (Airtable-Themen)
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

### Problem: React 19 Rendering-Fehler mit "[object Object]"
**Ursache**: Airtable Lookup-Felder geben manchmal Arrays oder Objekte zurück statt Strings
**Lösung**:
- Robuste `getString()` Helper-Funktion in Airtable-Integration:
```typescript
const getString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value || undefined;
  if (Array.isArray(value) && value.length > 0) {
    if (typeof value[0] === 'string') return value[0];
    return undefined; // Ignoriere Objekte in Arrays
  }
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object') return undefined; // Objekte nicht zu String konvertieren
  return String(value);
};
```
- Type-Checks in UI: `typeof lektion.aufgaben === 'string'`
- Array-Checks: `Array.isArray(lektion.material)`
- Verhindert dass Objekte direkt als React-Children gerendert werden

### Problem: Airtable Lookup-Felder als Arrays
**Ursache**: Lookup-Felder in Airtable werden als Arrays zurückgegeben
**Lösung**:
- Ersten Wert aus Array extrahieren wenn es ein String ist
- Objekte in Arrays ignorieren (nicht zu "[object Object]" konvertieren)
- Graceful Fallbacks mit `undefined` statt fehlerhaften Werten

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
Lädt alle Lektionen für ein bestimmtes Thema (Airtable)

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

### GET `/api/custom-themes?createdBy={userId}&status={status}`
Lädt Custom Themes mit optionalen Filtern

**Query Parameters:**
- `createdBy` - User ID des Erstellers
- `schuleId` - Schul-ID
- `status` - Status Filter (draft, pending_review, approved, rejected)

**Response:**
```json
[
  {
    "id": "firestore-doc-id",
    "thema": "Mein Custom Theme",
    "beschreibung": "...",
    "bildLehrmittel": "https://storage.googleapis.com/...",
    "anzahlLektionen": 8,
    "schuljahr": ["5. Klasse", "6. Klasse"],
    "zeitraum": "Sommerferien-Herbstferien",
    "kompetenzenIds": ["recXXX", "recYYY"],
    "status": "approved",
    "isSystemWide": true,
    "createdBy": "user-id",
    "createdByName": "Max Mustermann",
    "createdAt": "2024-12-10T...",
    "updatedAt": "2024-12-12T..."
  }
]
```

### POST `/api/custom-themes`
Erstellt ein neues Custom Theme

**Request Body:**
```json
{
  "thema": "Mein Custom Theme",
  "beschreibung": "...",
  "lehrmittel": "Connected",
  "bildLehrmittel": "https://storage.googleapis.com/...",
  "anzahlLektionen": 8,
  "schuljahr": ["5. Klasse"],
  "zeitraum": "Sommerferien-Herbstferien",
  "kompetenzenIds": ["recXXX"],
  "status": "draft"
}
```

**Response:**
```json
{
  "id": "firestore-doc-id"
}
```

### PUT `/api/custom-themes/[id]`
Aktualisiert ein Custom Theme

**Request Body:** Gleich wie POST (partial updates möglich)

### DELETE `/api/custom-themes/[id]`
Löscht ein Custom Theme (nur Ersteller oder Admin)

### PUT `/api/custom-themes/[id]/review`
Reviewt ein Custom Theme (nur PICTS-Admin)

**Request Body:**
```json
{
  "action": "approve" | "reject",
  "reviewNotes": "Optional feedback bei reject"
}
```

### GET `/api/custom-lektionen?themeId={customThemeId}`
Lädt alle Custom Lektionen für ein Custom Theme

**Response:**
```json
[
  {
    "id": "firestore-doc-id",
    "customThemeId": "theme-id",
    "lektionNummer": "Lektion 1",
    "aufgaben": "...",
    "material": ["Tablet", "Beamer"],
    "websiteTools": [{"name": "...", "link": "..."}],
    "einstieg": "...",
    "hauptteil": "...",
    "abschluss": "..."
  }
]
```

### POST `/api/custom-lektionen`
Erstellt Custom Lektion(en)

**Request Body (einzeln):**
```json
{
  "customThemeId": "theme-id",
  "lektionNummer": "Lektion 1",
  "aufgaben": "...",
  "material": ["Tablet"],
  "websiteTools": [{"name": "Code.org", "link": "https://code.org"}],
  "einstieg": "...",
  "hauptteil": "...",
  "abschluss": "..."
}
```

**Request Body (batch):**
```json
{
  "customThemeId": "theme-id",
  "lektionen": [
    { "lektionNummer": "Lektion 1", ... },
    { "lektionNummer": "Lektion 2", ... }
  ]
}
```

### PUT `/api/custom-lektionen/[id]`
Aktualisiert eine Custom Lektion

### DELETE `/api/custom-lektionen/[id]`
Löscht eine Custom Lektion

### GET `/api/notifications?recipientId={userId}`
Lädt Notifications für einen User

**Response:**
```json
[
  {
    "id": "firestore-doc-id",
    "type": "theme_submitted",
    "title": "Neues Thema zur Prüfung",
    "message": "Max Mustermann hat das Thema 'Mein Theme' eingereicht",
    "actionUrl": "/dashboard/admin",
    "isRead": false,
    "createdAt": "2024-12-10T..."
  }
]
```

### PUT `/api/notifications/[id]`
Markiert Notification als gelesen

### POST `/api/notifications`
Markiert alle Notifications als gelesen (für einen User)

**Request Body:**
```json
{
  "recipientId": "user-id"
}
```

### POST `/api/upload-image`
Lädt Bild zu Firebase Storage hoch

**Request:** `multipart/form-data` mit `file` field

**Response:**
```json
{
  "url": "https://storage.googleapis.com/..."
}
```

### GET `/api/auth/check-admin?userId={uid}`
Prüft Admin-Status eines Users (Server-side)

**Response:**
```json
{
  "isAdmin": true,
  "role": "picts_admin"
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

## Firebase Deployment

### Security Rules deployen

1. **Firebase CLI installieren** (falls noch nicht geschehen):
```bash
npm install -g firebase-tools
```

2. **Login**:
```bash
firebase login
```

3. **Projekt initialisiert** (bereits vorhanden):
- `firebase.json` - Konfiguration
- `.firebaserc` - Projekt ID
- `firestore.rules` - Firestore Security Rules
- `storage.rules` - Firebase Storage Security Rules

4. **Rules deployen**:
```bash
# Beide Rules zusammen
firebase deploy --only firestore:rules,storage:rules

# Oder einzeln
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### Ersten Super Admin ernennen

**Manuell in Firebase Console:**
1. Öffne Firebase Console → Firestore Database
2. Navigiere zu Collection `teachers`
3. Finde deinen User-Eintrag
4. Bearbeite das Feld `role` → setze auf `"super_admin"`
5. Speichern

**Alternativ mit Admin SDK** (einmalig ausführen):
```typescript
// Script: scripts/make-super-admin.ts
import { getAdminDb } from "@/lib/firebase/admin";

async function makeSuperAdmin(email: string) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("teachers")
    .where("email", "==", email)
    .get();

  if (snapshot.empty) {
    console.log("User nicht gefunden");
    return;
  }

  const doc = snapshot.docs[0];
  await doc.ref.update({ role: "super_admin" });
  console.log("Super Admin Rolle gesetzt für:", email);
}

makeSuperAdmin("deine-email@schule.ch");
```

## Nächste Schritte & Roadmap

### UI/UX Verbesserungen
- [ ] **Hintergrund für Startseite** erstellen
  - Hero-Section mit MIA-App Branding
  - Features-Übersicht
  - Call-to-Action für Login/Registrierung

- [ ] **Navigation im Dashboard erweitern**
  - Sidebar oder Top-Menu mit Links zu:
    - Dashboard (Profil)
    - Jahresplan
    - Lehrmittel
    - **NEU:** Thema erstellen
    - **NEU:** Meine Themen
    - **NEU:** Admin Dashboard (nur für Admins)
  - Mobile-Responsive Navigation

- [ ] **Custom Theme Badge im Kanban-Board**
  - Badge "Eigenes Thema" für Custom Themes
  - Visuell von Airtable-Themen unterscheidbar

### Funktionale Erweiterungen
- [ ] **Lektionsplanung für Custom Themes**
  - Lektionsplanung-Viewer auch für Custom Lektionen
  - Export-Funktionen (Markdown, PDF) für Custom Lektionen
  - Integration in Thema-Detail-Dialog

- [ ] **Batch-Operations für Custom Lektionen**
  - Multiple Lektionen auf einmal erstellen
  - Template-System für wiederkehrende Strukturen
  - Copy/Paste zwischen Themen

- [ ] **Erweiterte Admin-Features**
  - Benutzer-Verwaltung für Super Admins
  - PICTS-Admin Ernennung direkt in der App
  - Statistiken (Anzahl Themen, Reviews, etc.)

- [ ] **Airtable Export**
  - Button im Admin Dashboard
  - Genehmigte Custom Themes nach Airtable exportieren
  - Bi-direktionale Synchronisation

### Performance & Qualität
- [ ] **Caching-Strategie**
  - React Query für API-Calls
  - Optimistic Updates
  - Background Refresh

- [ ] **Error Handling verbessern**
  - Toast Notifications für Errors
  - Bessere Error Messages
  - Retry-Mechanismus

- [ ] **Loading States**
  - Skeleton Screens statt Spinner
  - Progressive Loading
  - Optimistic UI Updates

### Testing & Monitoring
- [ ] **Unit Tests** für kritische Funktionen
  - Permission System
  - API Routes
  - Firestore Helper Functions

- [ ] **E2E Tests** für User Workflows
  - Theme erstellen und einreichen
  - Review Workflow
  - Notification System

- [ ] **Monitoring & Analytics**
  - Firebase Analytics
  - Error Tracking (Sentry)
  - Performance Monitoring

## Kontakt & Support

Bei Fragen oder Problemen:
- Check die Konsole für detaillierte Error-Logs
- Firebase Admin Logs in Vercel Function Logs
- Airtable API Limits beachten (5 requests/second)

## Lizenz

Privates Projekt für Schulen
