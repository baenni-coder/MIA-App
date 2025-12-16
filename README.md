# MIA-App

Eine Webanwendung für Lehrpersonen zur Verwaltung von Jahresplänen für **Medien, Informatik und Anwendungskompetenzen (MIA)**.

**🆕 NEU (Dezember 2024):** Lehrpersonen können jetzt eigene Themen mit Lektionsplanung erstellen! PICTS-Admins können diese Themen prüfen und freigeben. Genehmigte Themen werden systemweit für alle Schulen sichtbar.

## 🎯 Features

### Basis-Features
- **Lehrer-Authentifizierung**: Firebase Authentication für sichere Anmeldung
- **Profil-Verwaltung**: Stufe ändern für nächstes Schuljahr
- **Jahresplan-Kanban**: Interaktives Board mit Zeitraum-Bildern und Stufe-Auswahl
- **Klickbare Kompetenzen**: Detail-Dialoge mit Lehrplan-Codes und Unterrichtsideen
- **Lektionsplanung mit Export** (für Airtable-Themen):
  - Strukturierte Darstellung aller Lektionen eines Themas
  - KI-Zusammenfassungen, Aufgaben, Material, Websites & Tools
  - 3-Phasen-Modell (Einstieg, Hauptteil, Abschluss)
  - Stolpersteine-Hinweise
  - **PDF-Export** mit professionellem Layout
  - **Markdown-Export** für einfache Bearbeitung
- **Lehrmittel-Übersicht**: Gruppierung aller Themen nach Lehrmittel
- **Schulspezifische PICTS-Links**: Direkter Zugriff auf Schulbuchungen
- **Responsive Design**: Optimiert für Desktop und Mobile mit Tailwind CSS

### 🆕 Neue Features: Custom Themes & Lektionen

#### Für Lehrpersonen
- **Eigene Themen erstellen** (`/dashboard/thema-erstellen`):
  - Vollständiges Formular mit allen Thema-Feldern
  - Bild-Upload mit Drag & Drop (max 10MB)
  - Multi-Select für Klassenstufen
  - Kompetenzen-Auswahl aus Airtable
  - Als Entwurf speichern oder direkt zur Prüfung einreichen
- **Themen verwalten** (`/dashboard/meine-themen`):
  - Übersicht aller eigenen Themen
  - Status-Badges (Draft, Pending, Approved, Rejected)
  - Bearbeiten, Löschen, Lektionen verwalten
  - Feedback bei Ablehnung einsehen
- **Lektionen erstellen**:
  - Eigene Lektionsplanung für Custom Themes
  - 3-Phasen-Modell: Einstieg, Hauptteil, Abschluss
  - Material als Tags, Websites & Tools
  - Stolpersteine-Hinweise

#### Für PICTS-Admins
- **Admin Dashboard** (`/dashboard/admin`):
  - Nur für PICTS-Admins und Super-Admins
  - Tabs: "Zu prüfen" | "Freigegeben" | "Abgelehnt"
  - Filtert Themen nach eigener Schule
- **Review-Workflow**:
  - Themen freigeben → Systemweit sichtbar
  - Themen ablehnen → Mit Feedback an Teacher
  - Vollständige Thema-Details anzeigen
- **Notification System**:
  - Bell-Icon im Header mit Badge
  - Automatische Benachrichtigungen bei neuen Einreichungen
  - In-App Notifications mit Klick-Navigation

#### Integration
- **Automatische Zusammenführung**:
  - Custom Themes erscheinen im Jahresplan-Kanban
  - Nur genehmigte Themen werden angezeigt
  - Gleiche Darstellung wie Airtable-Themen
  - Kompetenzen automatisch aufgelöst

## 🛠 Tech Stack

- **Framework**: Next.js 15 mit App Router
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentifizierung**: Firebase Auth (Client & Admin SDK)
- **Datenbank**:
  - **Airtable**: System-Themen, Schulen, Kompetenzen, Lektionsplanung
  - **Firebase Firestore**: Lehrerprofile, Custom Themes, Custom Lektionen, Notifications
- **Storage**: Firebase Storage (Bilder für Custom Themes)
- **UI-Bibliothek**: shadcn/ui mit Radix UI Primitives, Lucide Icons
- **UI-Komponenten**:
  - @radix-ui/react-select für Dropdown-Menüs
  - @radix-ui/react-accordion für Lektionsplanung
  - Native HTML Checkboxes (ohne Radix UI)
- **Export**: jsPDF für PDF-Generierung
- **Drag & Drop**: @dnd-kit (ready to implement)
- **Permissions**: Rollen-basiertes System (teacher, picts_admin, super_admin)

## 📋 Voraussetzungen

- Node.js 18+ und npm
- Firebase Projekt mit Authentication und Firestore
- Airtable Base mit Themen und Schulen

## 🚀 Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd MIA-App
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren**

   Erstellen Sie eine `.env.local` Datei im Root-Verzeichnis:

   ```env
   # Firebase Client Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin SDK (Server-side only)
   FIREBASE_ADMIN_PROJECT_ID=your_project_id
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"

   # Airtable Configuration
   AIRTABLE_API_KEY=your_airtable_api_key
   AIRTABLE_BASE_ID=your_base_id
   AIRTABLE_THEMEN_TABLE=Themen
   AIRTABLE_SCHULEN_TABLE=Schulen
   AIRTABLE_KOMPETENZEN_TABLE=Kompetenzen Lehrplan
   AIRTABLE_UNTERRICHTSIDEEN_TABLE=Themen
   AIRTABLE_LEKTIONSPLANUNG_TABLE=Lektionsplanung
   ```

4. **Firebase Setup**

   - Erstellen Sie ein Firebase-Projekt in der [Firebase Console](https://console.firebase.google.com/)
   - Aktivieren Sie **Email/Password Authentication**
   - Erstellen Sie eine **Firestore-Datenbank**
   - Laden Sie das **Service Account JSON** für das Admin SDK herunter
   - Kopieren Sie die Werte in die `.env.local`

5. **Airtable Setup**

   - Ihre Airtable-Base sollte folgende Tabellen enthalten:
     - **Themen**: Mit den Feldern aus `airtableinhalte/Themen-Grid view.csv`
     - **Schulen**: Mit Feldern `Name`, `Ort`, `PICTS buchen`, `Created`
     - **Kompetenzen Lehrplan**: LP-Codes, Beschreibungen, Unterrichtsideen
     - **Lektionsplanung**: Lektionen mit Aufgaben, Material, Einstieg/Hauptteil/Abschluss
   - Erstellen Sie einen API-Key in Ihren [Airtable Account Settings](https://airtable.com/account)
   - Finden Sie die Base-ID in der URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`

## 🎮 Entwicklung starten

```bash
npm run dev
```

Die Anwendung ist dann verfügbar unter `http://localhost:3000`

## 📦 Build für Produktion

```bash
npm run build
npm start
```

## 📁 Projektstruktur

```
MIA-App/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Auth-Endpunkte (check-admin)
│   │   │   ├── custom-themes/ # Custom Theme CRUD + Review
│   │   │   ├── custom-lektionen/ # Custom Lektionen CRUD
│   │   │   ├── notifications/ # Notifications
│   │   │   ├── upload-image/  # Firebase Storage Upload
│   │   │   ├── schulen/       # Schulen CRUD
│   │   │   ├── teachers/      # Lehrer-Profile (GET, POST, PUT)
│   │   │   ├── themen/        # Themen (Airtable + Firestore)
│   │   │   └── lektionsplanung/ # Lektionsplanung (Airtable)
│   │   ├── dashboard/         # Lehrer-Dashboard
│   │   │   ├── admin/         # Admin Dashboard (Review)
│   │   │   ├── jahresplan/    # Kanban-Board mit Stufe-Auswahl
│   │   │   ├── lehrmittel/    # Lehrmittel-Übersicht
│   │   │   ├── thema-erstellen/ # Custom Theme erstellen
│   │   │   ├── thema-bearbeiten/[id]/ # Custom Theme bearbeiten
│   │   │   ├── meine-themen/  # Übersicht Custom Themes
│   │   │   ├── thema/[id]/lektionen/ # Lektionen-Verwaltung
│   │   │   └── page.tsx       # Dashboard mit Profil-Bearbeitung
│   │   ├── auth/              # Auth-Seiten
│   │   │   ├── login/
│   │   │   └── register/
│   │   └── page.tsx           # Landing Page
│   ├── components/            # React Komponenten
│   │   ├── ui/               # shadcn/ui Komponenten
│   │   │   ├── badge.tsx     # Kompetenzen-Badges
│   │   │   ├── checkbox.tsx  # Native HTML Checkbox
│   │   │   ├── dialog.tsx    # Detail-Dialoge (inkl. DialogFooter)
│   │   │   ├── select.tsx    # Radix UI Select
│   │   │   ├── textarea.tsx  # Textarea
│   │   │   └── ...           # Weitere UI-Komponenten
│   │   ├── AdminThemeReview.tsx # Admin Review Dialog
│   │   ├── CustomThemeForm.tsx  # Formular für Custom Themes
│   │   ├── DashboardLayout.tsx  # Layout mit Logo & Notifications
│   │   ├── KanbanBoard.tsx      # Kanban mit Roboter-Bildern
│   │   ├── LektionEditor.tsx    # Editor für Custom Lektionen
│   │   ├── NotificationBell.tsx # Notification Bell mit Badge
│   │   ├── ProtectedRoute.tsx   # Auth-Schutz
│   │   └── ThemeStatusBadge.tsx # Status Badge
│   ├── contexts/             # React Contexts
│   │   └── AuthContext.tsx   # Firebase Auth State
│   ├── lib/                  # Utilities & Config
│   │   ├── airtable/        # Airtable Integration
│   │   │   ├── config.ts
│   │   │   ├── schulen.ts
│   │   │   ├── themen.ts
│   │   │   ├── kompetenzen.ts        # Batch-Loading
│   │   │   ├── unterrichtsideen.ts   # Nested Resolution
│   │   │   └── lektionsplanung.ts    # Lektionsplanung CRUD
│   │   ├── firebase/        # Firebase Config
│   │   │   ├── admin.ts
│   │   │   └── config.ts
│   │   ├── firestore/       # Firestore Helper Functions
│   │   │   ├── permissions.ts       # Rollen-basierte Permissions
│   │   │   ├── custom-themes.ts     # Custom Themes CRUD
│   │   │   ├── custom-lektionen.ts  # Custom Lektionen CRUD
│   │   │   └── notifications.ts     # Notifications CRUD
│   │   ├── storage/         # Firebase Storage
│   │   │   └── upload.ts    # Image Upload & Validation
│   │   └── utils.ts         # Helper Functions
│   └── types/               # TypeScript Types
│       └── index.ts         # Typen für Thema, Kompetenz, Custom Theme, etc.
├── public/                  # Static Assets
│   ├── logo.png             # MIA-App Logo
│   ├── roboter_sommer.png   # Zeitraum-Bild Sommer
│   ├── roboter_herbst.png   # Zeitraum-Bild Herbst
│   ├── roboter_winter.png   # Zeitraum-Bild Winter
│   └── roboter_weihnachten.png  # Zeitraum-Bild Weihnachten
├── firebase.json            # Firebase Config (Rules Deployment)
├── .firebaserc              # Firebase Project ID
├── firestore.rules          # Firestore Security Rules
└── storage.rules            # Firebase Storage Security Rules
```

## 🔐 Authentifizierung

### Lehrer-Registrierung

1. Benutzer registriert sich mit E-Mail und Passwort
2. Wählt Schule und Stufe aus
3. Firebase Auth erstellt den Account
4. Lehrer-Profil wird in Firestore gespeichert
5. Automatische Weiterleitung zum Dashboard

### Login

1. Benutzer meldet sich mit E-Mail und Passwort an
2. Firebase Auth validiert die Credentials
3. Protected Routes prüfen den Auth-Status
4. Zugriff auf Dashboard und Jahresplan

## 📊 Datenmodell

### Firestore Collections

- **teachers**: Lehrer-Profile
  - `userId` (Firebase UID)
  - `email`
  - `name`
  - `schuleId` (Referenz zu Airtable)
  - `stufe` (KiGa, 1.-9. Klasse)
  - `role` (teacher | picts_admin | super_admin)
  - `createdAt`

- **custom_themes**: Benutzerdefinierte Themen
  - `thema`, `beschreibung`, `lehrmittel`
  - `bildLehrmittel` (Firebase Storage URL)
  - `anzahlLektionen`, `schuljahr`, `zeitraum`
  - `kompetenzenIds` (Airtable Record IDs)
  - `status` (draft | pending_review | approved | rejected)
  - `isSystemWide` (true wenn approved)
  - `createdBy`, `createdByName`, `schuleId`
  - `reviewedBy`, `reviewedByName`, `reviewedAt`, `reviewNotes`
  - `createdAt`, `updatedAt`

- **custom_lektionen**: Benutzerdefinierte Lektionen
  - `customThemeId` (Referenz zu Custom Theme)
  - `lektionNummer`, `aufgaben`, `vorwissen`
  - `material` (Array), `websiteTools` (Array)
  - `einstieg`, `hauptteil`, `abschluss`, `stolpersteine`
  - `createdAt`, `updatedAt`

- **notifications**: In-App Benachrichtigungen
  - `recipientId`, `recipientName`
  - `type` (theme_submitted | theme_approved | theme_rejected)
  - `title`, `message`, `actionUrl`
  - `relatedThemeId`, `relatedThemeName`
  - `isRead`, `createdAt`

### Airtable Tables

- **Themen**: System-MIA-Unterrichtsthemen
  - Alle Felder aus `Themen-Grid view.csv`
  - Zuordnung zu Stufen und Zeiträumen
  - Kompetenzen, Lektionsplanung

- **Schulen**: Registrierte Schulen
  - `Name`, `Ort`, `PICTS buchen`, `Created`

- **Kompetenzen Lehrplan**: Lehrplan-Kompetenzen
  - LP-Codes, Beschreibungen, Unterrichtsideen

- **Lektionsplanung**: Systemweite Lektionen
  - Aufgaben, Material, 3-Phasen-Modell, Stolpersteine

## 🎨 UI-Komponenten

Die App verwendet **shadcn/ui** - eine moderne, accessible Komponenten-Bibliothek:

- Button, Card, Input, Label, Select
- Voll customizable mit Tailwind CSS
- TypeScript support
- Accessibility features

## ✅ Implementierte Features

### Basis-Features
- [x] Lehrer-Authentifizierung mit Firebase
- [x] Jahresplan Kanban-Board mit Zeitraum-Bildern
- [x] Klickbare Kompetenzen mit Detail-Dialogen
- [x] Unterrichtsideen-Auflösung
- [x] Lehrmittel-Übersicht
- [x] Schulspezifische PICTS-Links
- [x] Profil-Bearbeitung (Stufe ändern)
- [x] Temporäre Stufe-Auswahl im Jahresplan
- [x] Logo-Integration
- [x] Lektionsplanung mit PDF/Markdown Export (Airtable-Themen)

### Custom Themes & Lektionen (NEU ✨)
- [x] Rollen-System (teacher, picts_admin, super_admin)
- [x] Custom Themes erstellen & bearbeiten
- [x] Image Upload zu Firebase Storage
- [x] Custom Lektionen Editor
- [x] Status-Management (draft → pending_review → approved/rejected)
- [x] Admin Dashboard mit Review-Workflow
- [x] In-App Notifications System
- [x] Integration Custom Themes in Jahresplan
- [x] Permission System für Zugriffskontrolle
- [x] Firebase Security Rules (Firestore + Storage)

## 🔜 Nächste Schritte

### UI/UX Verbesserungen
- [ ] Hintergrund für Startseite erstellen
- [ ] Navigation im Dashboard erweitern (Sidebar/Menu)
- [ ] Custom Theme Badge im Kanban-Board
- [ ] Dark Mode

### Funktionale Erweiterungen
- [ ] Lektionsplanung-Viewer für Custom Lektionen
- [ ] Export-Funktionen (PDF, Markdown) für Custom Lektionen
- [ ] Batch-Operations für Custom Lektionen
- [ ] Benutzer-Verwaltung für Super Admins
- [ ] Airtable Export für genehmigte Custom Themes
- [ ] Drag & Drop im Kanban-Board für Themen-Verschiebung
- [ ] Kalenderansicht des Jahresplans
- [ ] Persönliche Notizen zu Themen

### Performance & Qualität
- [ ] React Query für API-Caching
- [ ] Toast Notifications für Errors
- [ ] Skeleton Screens statt Spinner
- [ ] Unit & E2E Tests
- [ ] Monitoring & Analytics

## 🔧 Troubleshooting

### Dev-Server findet @radix-ui/react-select nicht

Wenn nach Installation die Fehlermeldung "Module not found: Can't resolve '@radix-ui/react-select'" erscheint:

```bash
# 1. Dev-Server stoppen (Ctrl+C im Terminal)
# 2. Cache und node_modules löschen
rm -rf .next node_modules
# 3. Dependencies neu installieren
npm install
# 4. Dev-Server neu starten
npm run dev
```

### Codespace startet nicht

- Browser-Cache leeren mit `Ctrl+Shift+R` (Windows/Linux) oder `Cmd+Shift+R` (Mac)
- Über GitHub.com → Codespaces → Codespace "Restart"
- Falls nicht hilft: Codespace "Stop" → 30 Sekunden warten → "Start"

### Build funktioniert, aber Dev-Server zeigt Fehler

Dies ist ein Caching-Problem. Lösung:
```bash
rm -rf .next
npm run dev
```

## 📝 Lizenz

Proprietär - Alle Rechte vorbehalten