# MIA-App

Eine Webanwendung für Lehrpersonen zur Verwaltung von Jahresplänen für **Medien, Informatik und Anwendungskompetenzen (MIA)**.

**🆕 NEU (Dezember 2024):** Lehrpersonen können jetzt eigene Themen mit Lektionsplanung erstellen! PICTS-Admins können diese Themen prüfen und freigeben. Genehmigte Themen werden systemweit für alle Schulen sichtbar.

**🆕 NEU (Januar 2026):**
- **Schul-Dateien**: Rechtssicheres Teilen von Dateien innerhalb der Schule
- **FAQ-System**: Häufig gestellte Fragen mit Admin-Verwaltung
- **Schulverwaltung**: Super-Admins können Schulen erstellen und PICTS-Links bearbeiten
- **Erweitertes Profil**: Lehrpersonen können Schule und Kanton im Dashboard ändern
- **Favicon**: Neues SVG-Icon im Code-Klammern-Design

## 🎯 Features

### Basis-Features
- **Lehrer-Authentifizierung**: Firebase Authentication für sichere Anmeldung
- **Profil-Verwaltung**: Stufe, Schule und Kanton im Dashboard änderbar
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

### 🆕 Schul-Dateien & FAQ (Januar 2026)

#### Schul-Dateien
- **Datei-Upload** mit Drag & Drop
- **Freigabe-Optionen**: Privat oder für die ganze Schule
- **Themen-Verknüpfung**: Dateien mit Themen verlinken
- **Schulbasierte Zugriffskontrolle**: Nur Kolleg:innen der eigenen Schule

#### FAQ-System
- **Häufig gestellte Fragen** mit Kategorien
- **Suchfunktion** für schnelles Finden
- **Admin-Verwaltung**: FAQ-Einträge erstellen, bearbeiten, löschen

#### Schulverwaltung (Super-Admin)
- **Neue Schulen erstellen**
- **PICTS-Links bearbeiten**
- **Benutzerübersicht** pro Schule

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

## Voraussetzungen

Bevor du starten kannst, müssen folgende Programme auf deinem Computer installiert sein:

| Programm | Wofür? | Download |
|----------|--------|----------|
| **Node.js 18+** | Laufzeitumgebung (= das "Betriebssystem" für die App) | [nodejs.org](https://nodejs.org/) |
| **npm** | Paketmanager (wird mit Node.js mitinstalliert) | Kommt automatisch mit Node.js |
| **Git** | Versionsverwaltung (= speichert alle Änderungen am Code) | [git-scm.com](https://git-scm.com/) |

Zusätzlich brauchst du Zugang zu:
- **Firebase Projekt** mit Authentication und Firestore (= die Datenbank und Login-System)
- **Airtable Base** mit den MIA-Themen (= die Datenquelle für Lehrplan-Inhalte)

## Installation - Schritt für Schritt

### Schritt 1: Repository klonen

```bash
git clone https://github.com/baenni-coder/MIA-App.git
```
> Was passiert hier: Du lädst eine vollständige Kopie des Projekts von GitHub auf deinen Computer herunter.

### Schritt 2: In den Projektordner wechseln

```bash
cd MIA-App
```
> Was passiert hier: Du navigierst in den Ordner, der gerade heruntergeladen wurde.

### Schritt 3: Abhängigkeiten installieren

```bash
npm install
```
> Was passiert hier: Alle benötigten Zusatzpakete (ca. 200 Stück) werden aus dem Internet heruntergeladen und im Ordner `node_modules` gespeichert. Das kann 1-3 Minuten dauern.

### Schritt 4: Umgebungsvariablen einrichten

Die App braucht geheime Schlüssel, um sich mit Firebase und Airtable zu verbinden. Diese werden in einer speziellen Datei gespeichert, die **nie** auf GitHub hochgeladen wird.

1. Erstelle eine neue Datei namens `.env.local` im Hauptordner des Projekts (dort wo auch `package.json` liegt)
2. Kopiere folgenden Inhalt hinein und ersetze die Platzhalter mit deinen echten Werten:

```env
# Firebase Client Configuration
# Diese Werte findest du in der Firebase Console unter Projekteinstellungen > Allgemein
NEXT_PUBLIC_FIREBASE_API_KEY=dein_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dein_projekt.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dein_projekt_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dein_projekt.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=dein_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=dein_app_id

# Firebase Admin SDK (nur serverseitig - für API-Routen)
# Diese Werte findest du im heruntergeladenen Service Account JSON
FIREBASE_ADMIN_PROJECT_ID=dein_projekt_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@dein_projekt.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ndein_private_key\n-----END PRIVATE KEY-----\n"

# Airtable Configuration
# API Key: https://airtable.com/account > API > Personal access token
# Base ID: Steht in der URL deiner Airtable-Base nach "app"
AIRTABLE_API_KEY=dein_airtable_api_key
AIRTABLE_BASE_ID=dein_base_id
AIRTABLE_THEMEN_TABLE=Themen
AIRTABLE_SCHULEN_TABLE=Schulen
AIRTABLE_KOMPETENZEN_TABLE=Kompetenzen Lehrplan
AIRTABLE_UNTERRICHTSIDEEN_TABLE=Themen
AIRTABLE_LEKTIONSPLANUNG_TABLE=Lektionsplanung
```

> Was passiert hier: Du sagst der App, wie sie sich mit den externen Diensten (Firebase, Airtable) verbinden soll. Ohne diese Datei kann die App nicht starten.

### Schritt 5: Firebase einrichten

Falls du noch kein Firebase-Projekt hast, folge diesen Schritten:

1. Öffne die [Firebase Console](https://console.firebase.google.com/) und erstelle ein neues Projekt
2. Gehe zu **Authentication** > **Sign-in method** > Aktiviere **Email/Password**
3. Gehe zu **Firestore Database** > **Datenbank erstellen** (Produktionsmodus)
4. Gehe zu **Projekteinstellungen** > **Dienstkonten** > **Neuen privaten Schlüssel generieren**
   > Was passiert hier: Du lädst eine JSON-Datei herunter, die die Admin-Zugangsdaten enthält. Die Werte daraus kommen in die `.env.local`.
5. Kopiere die Werte aus der JSON-Datei in deine `.env.local`

### Schritt 6: Airtable einrichten

1. Deine Airtable-Base sollte folgende Tabellen enthalten:
   - **Themen**: Mit den Feldern aus `airtableinhalte/Themen-Grid view.csv`
   - **Schulen**: Mit Feldern `Name`, `Ort`, `PICTS buchen`, `Created`
   - **Kompetenzen Lehrplan**: LP-Codes, Beschreibungen, Unterrichtsideen
   - **Lektionsplanung**: Lektionen mit Aufgaben, Material, Einstieg/Hauptteil/Abschluss
2. Erstelle einen Personal Access Token unter [airtable.com/create/tokens](https://airtable.com/create/tokens)
3. Finde die Base-ID in der URL: `https://airtable.com/appXXXXXXXXXXXXXX/...` (der Teil nach `airtable.com/`)

## Projekt starten - Schritt für Schritt

### Entwicklungsmodus (zum Arbeiten an der App)

1. **Öffne ein Terminal** im Projektordner `MIA-App`

2. **Starte den Entwicklungsserver:**
   ```bash
   npm run dev
   ```
   > Was passiert hier: Die App wird gestartet und ist unter `http://localhost:3000` im Browser erreichbar. Änderungen am Code werden automatisch im Browser angezeigt (sogenanntes "Hot Reload").

3. **Öffne den Browser** und navigiere zu: [http://localhost:3000](http://localhost:3000)

4. **Zum Stoppen** drücke `Ctrl+C` im Terminal

### Produktions-Build (für Deployment)

1. **Build erstellen:**
   ```bash
   npm run build
   ```
   > Was passiert hier: Der Code wird optimiert und in eine produktionsreife Version umgewandelt. Das dauert ca. 1-2 Minuten.

2. **Produktionsserver starten:**
   ```bash
   npm start
   ```
   > Was passiert hier: Die optimierte Version der App wird gestartet. Diese ist schneller als der Entwicklungsmodus.

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

### Custom Themes & Lektionen
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

### Schul-Dateien, FAQ & Admin (Januar 2026 ✨)
- [x] Schul-Dateien System mit Firebase Storage
- [x] Themen-Verknüpfungen für Dateien
- [x] FAQ-Seite mit Kategorien und Suche
- [x] FAQ-Verwaltung für Admins
- [x] Schulverwaltung für Super-Admins
- [x] Erweitertes Lehrerprofil (Schule, Kanton)
- [x] SVG-Favicon

## 🔜 Nächste Schritte

### UI/UX Verbesserungen
- [ ] Hintergrund für Startseite erstellen
- [ ] Custom Theme Badge im Kanban-Board
- [ ] Dark Mode

### Funktionale Erweiterungen
- [ ] Lektionsplanung-Viewer für Custom Lektionen
- [ ] Export-Funktionen (PDF, Markdown) für Custom Lektionen
- [ ] PICTS-Admin Ernennung direkt in der App
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

## Häufige Probleme und Lösungen

### Problem: "Module not found: Can't resolve '@radix-ui/react-select'"

**Wann tritt das auf?** Nach der Installation oder nach Updates von Paketen.

**Lösung - Schritt für Schritt:**

1. **Dev-Server stoppen** - Drücke `Ctrl+C` im Terminal
2. **Cache und Pakete löschen:**
   ```bash
   rm -rf .next node_modules
   ```
   > Was passiert hier: Der Build-Cache (`.next`) und alle installierten Pakete (`node_modules`) werden gelöscht, damit alles frisch neu aufgebaut werden kann.
3. **Pakete neu installieren:**
   ```bash
   npm install
   ```
4. **Dev-Server neu starten:**
   ```bash
   npm run dev
   ```

### Problem: Dev-Server zeigt Fehler, aber Build funktioniert

**Wann tritt das auf?** Wenn der Entwicklungsserver nach Code-Änderungen seltsame Fehler zeigt.

**Ursache:** Der lokale Cache ist veraltet.

**Lösung:**
```bash
rm -rf .next
npm run dev
```
> Was passiert hier: Nur der Build-Cache wird gelöscht. Der Server erstellt dann alles neu.

### Problem: Codespace startet nicht

**Lösung - der Reihe nach ausprobieren:**

1. Browser-Cache leeren: `Ctrl+Shift+R` (Windows/Linux) oder `Cmd+Shift+R` (Mac)
2. Über GitHub.com > Codespaces > "Restart" klicken
3. Falls das nicht hilft: "Stop" klicken > 30 Sekunden warten > "Start" klicken

### Problem: Firebase Private Key Fehler auf Vercel

**Wann tritt das auf?** Nach dem Deployment auf Vercel.

**Ursache:** Der Private Key muss korrekt formatiert sein.

**Lösung:** Im Vercel Dashboard den Private Key mit doppelten Anführungszeichen eingeben und `\n` für Zeilenumbrüche verwenden:
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

## 📝 Lizenz

Proprietär - Alle Rechte vorbehalten