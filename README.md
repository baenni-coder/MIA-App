# MIA-App

Eine Webanwendung für Lehrpersonen zur Verwaltung von Jahresplänen für **Medien, Informatik und Anwendungskompetenzen (MIA)**.

## 🎯 Features

- **Lehrer-Authentifizierung**: Firebase Authentication für sichere Anmeldung
- **Schulverwaltung**: Admin-Dashboard zur Verwaltung von Schulen
- **Jahresplan-Kanban**: Interaktives Kanban-Board mit Airtable-Integration
- **Stufen-Filter**: Automatische Filterung der Themen nach Schulstufe
- **Responsive Design**: Optimiert für Desktop und Mobile mit Tailwind CSS

## 🛠 Tech Stack

- **Framework**: Next.js 15 mit App Router
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentifizierung**: Firebase Auth (Client & Admin SDK)
- **Datenbank**:
  - Airtable (Themen & Schulen)
  - Firebase Firestore (Lehrer-Profile)
- **UI-Bibliothek**: shadcn/ui, Lucide Icons
- **Drag & Drop**: @dnd-kit (ready to implement)

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
   ```

4. **Firebase Setup**

   - Erstellen Sie ein Firebase-Projekt in der [Firebase Console](https://console.firebase.google.com/)
   - Aktivieren Sie **Email/Password Authentication**
   - Erstellen Sie eine **Firestore-Datenbank**
   - Laden Sie das **Service Account JSON** für das Admin SDK herunter
   - Kopieren Sie die Werte in die `.env.local`

5. **Airtable Setup**

   - Ihre Airtable-Base sollte folgende Tabellen enthalten:
     - **Themen**: Mit den Feldern aus `Themen-Grid view.csv`
     - **Schulen**: Mit Feldern `Name`, `Ort`, `Created`
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
│   │   │   ├── schulen/       # Schulen CRUD
│   │   │   ├── teachers/      # Lehrer-Profile
│   │   │   └── themen/        # Themen aus Airtable
│   │   ├── dashboard/         # Lehrer-Dashboard
│   │   │   ├── jahresplan/   # Kanban-Ansicht
│   │   │   └── page.tsx      # Dashboard Übersicht
│   │   ├── login/             # Login-Seite
│   │   ├── register/          # Registrierung
│   │   └── page.tsx           # Landing Page
│   ├── components/            # React Komponenten
│   │   ├── ui/               # shadcn/ui Komponenten
│   │   ├── DashboardLayout.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── providers/        # Context Provider
│   ├── contexts/             # React Contexts
│   │   └── AuthContext.tsx   # Firebase Auth State
│   ├── lib/                  # Utilities & Config
│   │   ├── airtable/        # Airtable Integration
│   │   │   ├── config.ts
│   │   │   ├── schulen.ts
│   │   │   └── themen.ts
│   │   ├── firebase/        # Firebase Config
│   │   │   ├── admin.ts
│   │   │   ├── auth.ts
│   │   │   └── config.ts
│   │   └── utils.ts         # Helper Functions
│   └── types/               # TypeScript Types
│       └── index.ts
└── public/                  # Static Assets
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
  - `role` (teacher)
  - `createdAt`

### Airtable Tables

- **Themen**: MIA-Unterrichtsthemen
  - Alle Felder aus `Themen-Grid view.csv`
  - Zuordnung zu Stufen und Zeiträumen

- **Schulen**: Registrierte Schulen
  - `Name`
  - `Ort`
  - `Created`

## 🎨 UI-Komponenten

Die App verwendet **shadcn/ui** - eine moderne, accessible Komponenten-Bibliothek:

- Button, Card, Input, Label, Select
- Voll customizable mit Tailwind CSS
- TypeScript support
- Accessibility features

## 🔜 Nächste Schritte

- [ ] Drag & Drop im Kanban-Board implementieren
- [ ] Admin-Dashboard für Schulverwaltung
- [ ] PICTS Buchungs-Feature
- [ ] Lehrmittel-Bibliothek
- [ ] Export-Funktionen (PDF, CSV)
- [ ] Dark Mode
- [ ] Multi-Tenancy für verschiedene Schulen

## 📝 Lizenz

Proprietär - Alle Rechte vorbehalten