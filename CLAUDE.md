# MIA-App - Dokumentation für Claude Code

## Projektübersicht

Die MIA-App ist eine Webanwendung für Lehrpersonen zur Verwaltung ihres Jahresplans für "Medien, Informatik und Anwendungskompetenzen (MIA)". Die App ermöglicht es Lehrern, sich anzumelden, ihre Schule und Klassenstufe auszuwählen und einen personalisierten Jahresplan in einem Kanban-Board-Format anzuzeigen.

**NEU (2024-12)**:
- Lehrpersonen können eigene Themen mit Lektionsplanung erstellen
- PICTS-Admins können diese Themen prüfen und freigeben
- Genehmigte Themen werden systemweit für alle Schulen sichtbar
- **Hybrid Airtable-Firestore Architektur** für 5-7x schnellere Performance
- **Collapsible Sidebar Navigation** für bessere UX
- **Lehrplan-Kompetenzen Seite** mit Kachel-Layout und klickbaren Unterrichtsideen

**NEU (2026-01)**:
- **Schul-Dateien**: Dateien schulintern teilen (rechtssicher)
- **Themen-Verknüpfungen**: Dateien mit Themen verknüpfen
- **FAQ-Seite**: Häufig gestellte Fragen im Dashboard (34 Standard-Einträge inkl. Kompetenzenpass)
- **FAQ-Verwaltung**: Admins können FAQ-Einträge erstellen, bearbeiten, löschen
- **Schulverwaltung**: Super-Admins können Schulen erstellen und PICTS-Links bearbeiten
- **Erweitertes Lehrerprofil**: Schule und Kanton im Dashboard bearbeitbar
- **Favicon**: SVG-Favicon mit Code-Klammern-Design
- **Kompetenzenpass**: Schüler-Selbstbewertung mit Lehrer-Bestätigung
- **Kompetenz-Indikatoren**: Verständliche Beschreibungen für Stern-Bewertungen
- **Schüler-Artefakte**: Belege (Bilder, PDFs, Links) für Kompetenzen hochladen
- **Gruppierte Menüstruktur**: Übersichtliche Kategorien in der Sidebar
- **Scrollbare Dialoge**: Dialoge auf kleinen Bildschirmen scrollbar
- **DiceBear Avatare**: Schüler können personalisierte Avatare erstellen
- **PDF-Export mit @react-pdf/renderer**: Verbesserter Kompetenzenpass-Export mit Logo, Avatar, SVG-Sternen
- **Klickbare Dashboard-Kacheln**: Schüler-Dashboard navigiert direkt zu den Bereichen
- **Badge-Vergabe**: Lehrpersonen können eigene Badges erstellen und an Schüler vergeben
- **Lehrmittel-Sortierung**: Themen innerhalb der Lehrmittel alphabetisch sortiert

**NEU (2026-02)**:
- **Jahresplanung**: Fächerübergreifende Jahresplanung mit Quartals- und Wochenansicht
- **Ferienverwaltung**: Manuelle Anpassung der Schulferien pro Schuljahr
- **MIA-Themen-Verknüpfung**: Einheiten mit MIA-Themen verknüpfen
- **Beurteilungen mit KW-Zuordnung**: Mehrere Beurteilungen pro Einheit, mit Wochen-Zuweisung
- **PDF-Export Jahresplanung**: Quartals-, Wochen- und Jahresplanung als PDF exportieren
- **PDF mit Lehrperson**: Name und Klasse der Lehrperson im PDF-Header
- **Schuljahr kopieren**: Einheiten aus beliebigem vergangenen Schuljahr kopieren
- **Jahresplan MIA**: Umbenennung für Klarheit (Menü, Dashboard)
- **Konfigurierbare Dashboard-Kacheln**: Lehrpersonen wählen ihre Dashboard-Kacheln selbst

**NEU (2026-03)**:
- **LP21 KompetenzPicker**: Hierarchische Kompetenz-Auswahl (Fachbereich → Kompetenzbereich → Kompetenz → Kompetenzstufe)
- **LP21 API Sync**: Kompetenzen direkt von der LP21-API laden und in Firestore cachen
- **Fachbereich-Splitting**: SPR → D, DaZ, FS1F, FS2E, FS3I; GES → BG, TTG
- **Kanton-Aliase**: MI ↔ IB Mapping für Solothurn
- **Anwendungskompetenzen**: MI.3 / IB.3 aus Airtable-Daten integriert
- **Responsive Dropdowns**: Kompetenz-Auswahl auf schmalen Bildschirmen nicht mehr abgeschnitten

**NEU (2026-04)**:
- **Jahresplan-Pool**: System-Themen + systemweit freigegebene Custom Themes bilden einen gemeinsamen Pool
- **Kuratierter Schul-Jahresplan**: PICTS-/Super-Admin ordnet Pool-Themen per Checkbox der eigenen Schule zu
- **Override-Pattern**: Schul-Anpassungen (Thema, Beschreibung, Lehrmittel, Zeitraum, Stufe, Materialien, Notizen, Unterlagen) werden als Overrides gespeichert; System-Updates propagieren automatisch
- **Modus-Umschaltung pro Schule**: `open` (bisheriges Verhalten, Default) oder `curated` (nur zugeordnete Themen sichtbar)
- **Initial-Befüllung**: Ein-Klick-Zuordnung aller Pool-Themen inkl. nachträglicher Entfernungsmöglichkeit
- **Abwärtskompatibel**: Schulen ohne gesetzten Modus bleiben auf `open`; Lehrer-Jahresplan funktioniert unverändert

## Tech Stack

- **Framework**: Next.js 15 mit App Router
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui Komponenten
- **Authentifizierung**: Firebase Authentication (Client + Admin SDK)
- **Datenbank (Hybrid Architektur)**:
  - **Airtable** (Source of Truth): System-Themen, Schulen, Kompetenzen, Lektionsplanung
  - **Firestore (Primary)**:
    - User Data: Lehrerprofile, Custom Themes, Custom Lektionen, Notifications
    - Performance Cache: system_themes, system_schulen, system_kompetenzen, system_lektionen
    - Sync Metadata: sync_metadata, sync_logs
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
│   │   ├── school-files/        # Schul-Dateien
│   │   │   ├── [id]/           # Single File (GET, PUT, DELETE)
│   │   │   ├── metadata/        # Metadata nach Client-Upload
│   │   │   └── route.ts         # List & Create
│   │   ├── faq/                 # FAQ-Endpunkte
│   │   │   ├── [id]/           # Single FAQ (GET, PUT, DELETE, PATCH)
│   │   │   └── route.ts         # List, Create, Initialize
│   │   ├── student-artifacts/   # Schüler-Artefakte (NEU)
│   │   │   ├── [id]/           # Single Artifact (GET, PUT, DELETE)
│   │   │   │   └── comment/    # Lehrer-Kommentare
│   │   │   └── route.ts         # List & Create
│   │   ├── jahresplanung/       # Jahresplanung-Endpunkte (NEU)
│   │   │   ├── [id]/           # Single Einheit (GET, PUT, DELETE)
│   │   │   ├── kopieren/       # Schuljahr kopieren (POST)
│   │   │   ├── ferien/         # Custom-Ferien (GET, POST, PUT, DELETE)
│   │   │   └── route.ts         # List & Create Einheiten
│   │   ├── admin/               # Admin-Endpunkte
│   │   │   ├── schools/         # Schulverwaltung
│   │   │   │   ├── [id]/       # PUT, DELETE einzelne Schule
│   │   │   │   │   └── jahresplan-mode/ # GET, PUT Modus open|curated (NEU)
│   │   │   │   └── route.ts     # GET, POST alle Schulen
│   │   │   ├── users/           # Benutzerverwaltung
│   │   │   │   └── [id]/       # PUT, GET einzelner User
│   │   │   └── sync/            # Sync-Endpunkte
│   │   │       └── lp21/       # LP21 API Sync (NEU)
│   │   │           ├── route.ts # POST: Fachbereich synchronisieren
│   │   │           └── fachbereiche/ # GET: Verfügbare Fachbereiche
│   │   ├── school-jahresplan/   # Schul-Jahresplan Assignments (NEU)
│   │   │   ├── [id]/           # PUT (Overrides), DELETE (Soft-Delete)
│   │   │   ├── initial-populate/ # POST: Alle Pool-Themen zuordnen
│   │   │   └── route.ts         # GET/POST Assignments (bulk-fähig)
│   │   ├── kompetenzen/         # Kompetenz-Endpunkte (NEU)
│   │   │   └── lp21/           # LP21-Kompetenzen
│   │   │       ├── route.ts     # GET: Kompetenzstufen laden
│   │   │       └── struktur/   # GET: Fachbereich-Struktur
│   │   ├── upload-image/        # Image Upload zu Firebase Storage
│   │   ├── schulen/             # Schulen-Endpunkte (öffentlich)
│   │   ├── teachers/            # Lehrer-Endpunkte (GET, POST, PUT)
│   │   ├── themen/              # Themen-Endpunkte (Airtable + Firestore)
│   │   └── lektionsplanung/     # Lektionsplanung (Airtable)
│   ├── login/                    # Login-Seite
│   ├── register/                 # Registrierungs-Seite
│   │   ├── kompetenzen/         # API für Lehrplan-Kompetenzen
│   ├── dashboard/                # Dashboard-Seiten
│   │   ├── admin/               # Admin Dashboard (Review Workflow)
│   │   │   ├── schools/         # Schulverwaltung (Super-Admin) (NEU)
│   │   │   ├── jahresplan-pool/ # Jahresplan-Pool Verwaltung (NEU)
│   │   │   └── sync/            # Daten-Synchronisation
│   │   ├── jahresplan/          # Jahresplan MIA mit Stufe-Auswahl & Search
│   │   ├── jahresplanung/       # Fächerübergreifende Jahresplanung (NEU)
│   │   │   ├── quartal/[q]/    # Quartalsansicht mit Wochen-Raster
│   │   │   ├── woche/[kw]/     # Wochenansicht mit Einheiten
│   │   │   ├── einheit/[id]/   # Einheit bearbeiten/erstellen
│   │   │   └── ferien/          # Ferienverwaltung
│   │   ├── lehrmittel/          # Lehrmittel-Übersicht (Akkordeon)
│   │   ├── lehrplan/            # Lehrplan-Kompetenzen (Kachel-Layout)
│   │   ├── thema-erstellen/     # Custom Theme erstellen (mit Inline-Lektionen)
│   │   ├── thema-bearbeiten/[id]/ # Custom Theme bearbeiten
│   │   ├── meine-themen/        # Übersicht eigene Custom Themes
│   │   ├── thema/[id]/lektionen/ # Lektionen-Verwaltung
│   │   ├── dateien/             # Schul-Dateien Übersicht (NEU)
│   │   ├── faq/                 # FAQ-Seite (NEU)
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
│   ├── CustomThemeForm.tsx      # Formular für Custom Themes (mit Inline-Lektionen)
│   ├── JahresplanungPDF.tsx     # PDF-Export: Quartals-, Wochen-, Jahresplanung (NEU)
│   ├── jahresplanung/           # Jahresplanung-Komponenten (NEU)
│   │   └── KompetenzPicker.tsx  # LP21 Kompetenz-Auswahl (Hierarchisch)
│   ├── DashboardLayout.tsx      # Dashboard Layout mit Collapsible Sidebar
│   ├── InlineLektionEditor.tsx  # Kompakter Lektion-Editor für Akkordeon
│   ├── KanbanBoard.tsx          # Kanban-Board mit Roboter-Bildern & Search
│   ├── LektionEditor.tsx        # Editor für Custom Lektionen
│   ├── NotificationBell.tsx     # Notification Bell mit Badge
│   ├── ProtectedRoute.tsx       # Auth-Schutz
│   ├── ThemeStatusBadge.tsx     # Status Badge (draft, pending, approved, rejected)
│   ├── SchoolFileUpload.tsx     # Datei-Upload mit Themen-Verknüpfung
│   ├── ThemeSelector.tsx        # Themen-Auswahl mit Suche
│   ├── LinkedFilesViewer.tsx    # Verknüpfte Dateien im Thema-Dialog
│   ├── StudentArtifactUpload.tsx # Artefakt-Upload für Schüler (NEU)
│   └── TeacherArtifactViewer.tsx # Artefakt-Ansicht für Lehrer (NEU)
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
│   │   ├── notifications.ts     # Notifications CRUD
│   │   ├── school-files.ts      # School Files CRUD
│   │   ├── faq.ts               # FAQ CRUD
│   │   ├── student-artifacts.ts # Schüler-Artefakte CRUD (NEU)
│   │   ├── jahresplanung.ts    # Jahresplanung CRUD (NEU)
│   │   ├── school-jahresplan.ts # Schul-Jahresplan Assignments CRUD (NEU)
│   │   └── system-cache.ts     # LP21 Struktur & System-Cache (Alias/Exclude/Fallback)
│   ├── data/                    # Statische Daten (NEU)
│   │   ├── lp21-data.ts        # LP21-Fachbereiche, Schulkalender, Ferienpresets
│   │   ├── schulkalender.json  # Ferien-Daten nach Kanton
│   │   └── lehrplan21-fachbereiche.json # LP21-Fachbereiche mit Kompetenzbereichen
│   ├── lp21/                    # LP21 API Integration (NEU)
│   │   ├── crawler.ts          # LP21 Kompetenzbaum-Crawler
│   │   ├── client.ts           # LP21 API Client
│   │   ├── config.ts           # Kanton-Mapping, Fachbereich-Config
│   │   └── types.ts            # LP21-spezifische TypeScript-Typen
│   └── storage/                 # Firebase Storage
│       ├── upload.ts            # Image Upload & Validation
│       └── school-files.ts      # School Files Storage (NEU)
├── middleware.ts                 # Next.js Middleware
└── types/                        # TypeScript Typen
    └── index.ts                 # Zentrale Type Definitions
```

### Hybrid Airtable-Firestore Architektur

**Status:** ✅ Aktiv seit Dezember 2024

Die App nutzt eine **hybride Datenbank-Architektur** für optimale Performance:

#### Prinzip: "Airtable als Source of Truth, Firestore als Performance-Cache"

```
┌─────────────┐         Sync (manuell/cron)         ┌──────────────┐
│  Airtable   │  ───────────────────────────────>   │  Firestore   │
│             │                                       │              │
│ - Themen    │  <────── Read via Adapter ──────    │ - Cached:    │
│ - Schulen   │                                       │   * themes   │
│ - Kompetenzen│                                      │   * schulen  │
│ - Lektionen │                                       │   * komp.    │
│             │                                       │   * lekt.    │
└─────────────┘                                       └──────────────┘
 Source of Truth                                      Performance Cache
 (Admin-edited)                                       (5-7x faster)
```

**Vorteile:**
- ⚡ **5-7x schnellere Ladezeiten** (~700ms statt 3-5s)
- 📊 **Airtable bleibt editierbar** (Formeln, Relations, UI)
- 💾 **Firestore für User Data** (Custom Themes, Profile)
- 🔄 **Automatische Synchronisation** (manuell + optional Cron)

**Aktivierung:**
```bash
# Vercel Environment Variable
ENABLE_FIRESTORE_CACHE=true
```

**Datenfluss:**
1. **Read:** API prüft `ENABLE_FIRESTORE_CACHE` → Firestore (schnell) oder Airtable (langsam)
2. **Write:** Änderungen in Airtable → Manueller Sync triggern oder Cron abwarten
3. **Sync:** `/api/admin/sync` lädt Airtable-Daten → schreibt in Firestore Cache

**Wichtige Dateien:**
- `src/lib/data-sources/themes-adapter.ts` - Intelligenter Daten-Adapter
- `src/lib/sync/airtable-firestore-sync.ts` - Sync-Logik
- `src/lib/firestore/system-cache.ts` - Firestore Cache CRUD
- `src/app/dashboard/admin/sync/page.tsx` - Admin UI für Sync

**Performance-Vergleich:**
| Metrik | Airtable direkt | Firestore Cache | Verbesserung |
|--------|----------------|-----------------|--------------|
| API Response | 3-5 Sekunden | 0.6-0.8 Sek | **5-7x** ⚡ |
| Airtable API Calls | Bei jedem Request | Nur beim Sync | -95% 📉 |
| Jahresplan Load | Langsam | Instant | UX++ 🎯 |

## Datenmodell

### Firebase Firestore

**Collection: `teachers`**
```typescript
{
  email: string
  name: string
  schuleId: string          // Airtable Record ID oder Firestore ID
  stufe: Stufe              // z.B. "1. Klasse", "5. Klasse"
  kanton?: Kanton           // Schweizer Kanton (z.B. "ZH", "BE", "SG")
  role: UserRole            // "teacher" | "picts_admin" | "super_admin"
  dashboardTiles?: string[] // Benutzerdefinierte Dashboard-Kacheln (Pfade)
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

**Collection: `school_files`**
```typescript
{
  name: string              // Dateiname
  storagePath: string       // Pfad in Firebase Storage
  storageUrl: string        // Download-URL
  contentType: string       // MIME-Type (z.B. "application/pdf")
  size: number              // Dateigröße in Bytes
  schuleId: string          // Schul-ID (für Zugriffskontrolle)
  schuleName?: string       // Schulname (optional)
  uploadedBy: string        // User ID des Uploaders
  uploadedByName: string    // Name des Uploaders
  sharedWith: FileShareLevel // "private" | "school"
  linkedThemeIds?: string[] // Verknüpfte Themen-IDs
  linkedThemeNames?: string[] // Verknüpfte Themen-Namen
  description?: string      // Beschreibung
  createdAt: Date
  updatedAt: Date
}
```

**Collection: `faq_items`**
```typescript
{
  question: string          // Die Frage
  answer: string            // Die Antwort (kann Markdown enthalten)
  category: FAQCategory     // "allgemein" | "jahresplan" | "themen" | "dateien" | "admin"
  order: number             // Sortierreihenfolge innerhalb der Kategorie
  isActive: boolean         // Ob der FAQ-Eintrag aktiv/sichtbar ist
  createdBy: string         // User ID des Erstellers
  createdByName: string     // Name des Erstellers
  createdAt: Date
  updatedAt: Date
}
```

**Collection: `student_artifacts`** (NEU - Kompetenzenpass)
```typescript
{
  studentId: string         // Firebase UID des Schülers
  studentName: string       // Name des Schülers
  classId: string           // Klassen-ID
  competencyId: string      // Kompetenz-ID (Airtable)
  competencyName: string    // Name der Kompetenz
  type: ArtifactType        // "image" | "pdf" | "link"
  title: string             // Titel des Artefakts
  description?: string      // Optionale Beschreibung
  storagePath?: string      // Pfad in Firebase Storage (für Dateien)
  storageUrl?: string       // Download-URL (für Dateien)
  contentType?: string      // MIME-Type (für Dateien)
  size?: number             // Dateigröße in Bytes
  url?: string              // URL (für Links)
  linkedThemeIds?: string[] // Verknüpfte Themen
  linkedThemeNames?: string[]
  teacherComment?: string   // Kommentar der Lehrperson
  teacherCommentBy?: string // User ID der Lehrperson
  teacherCommentByName?: string
  teacherCommentAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

**Collection: `jahresplan_einheiten`** (NEU - Jahresplanung)
```typescript
{
  userId: string            // Firebase UID der Lehrperson
  schuljahr: string         // z.B. "2025/2026"
  quartal: number           // 1-4
  titel: string             // Titel der Einheit
  fachbereichId: string     // LP21-Fachbereich-ID
  fachbereichName: string   // Fachbereich-Name (z.B. "Deutsch")
  fachbereichFarbe: string  // Farbe des Fachbereichs
  kompetenzbereichId?: string // Optional: Kompetenzbereich-ID
  kompetenzbereichName?: string
  kompetenzenIds?: string[] // Verlinkte Kompetenz-IDs
  kompetenzenNamen?: string[] // Kompetenz-Namen
  zeitraumStart: number     // Startwoche (KW)
  zeitraumEnde: number      // Endwoche (KW)
  wochenstunden: number     // Stunden pro Woche
  status: JahresplanStatus  // "geplant" | "durchgefuehrt" | "reflektiert"
  beurteilungstyp: string   // Legacy: "formativ" | "summativ" | "keine"
  beurteilungsNotiz: string // Legacy: Notiz
  beurteilungen: Beurteilung[] // Array mit KW-Zuordnung
  notizen: string           // Freitext-Notizen
  linkedMiaThemeId?: string // Optional: Verknüpftes MIA-Thema
  linkedMiaThemeName?: string
  isShared: boolean         // Für Kolleg:innen sichtbar
  createdAt: Date
  updatedAt: Date
}
```

**Collection: `schulferien_custom`** (NEU - Benutzerdefinierte Ferien)
```typescript
{
  userId: string            // Firebase UID
  schuljahr: string         // z.B. "2025/2026"
  name: string              // z.B. "Herbstferien"
  start: string             // ISO-Datum "2025-10-06"
  ende: string              // ISO-Datum "2025-10-17"
  createdAt: Date
  updatedAt: Date
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

### 2. Dashboard mit Collapsible Sidebar
- **Collapsible Sidebar** (Desktop):
  - Ein-/Ausklappbar mit Chevron-Button
  - Zustand wird in localStorage gespeichert
  - Zeigt Icons + Labels (erweitert) oder nur Icons (eingeklappt)
- **Mobile Navigation**: Sheet/Drawer für kleine Bildschirme
- **Gruppierte Menüstruktur** (NEU):
  - **Übersicht**: Dashboard, Jahresplan MIA, Jahresplanung
  - **Unterricht**: Lehrmittel, Lehrplan, Regelstandards (nur SO)
  - **Eigene Inhalte**: Thema erstellen, Meine Themen, Schul-Dateien
  - **Kompetenzenpass**: Meine Klassen, Indikatoren, Badges, Statistiken
  - **Hilfe**: FAQ
  - **Administration** (nur Admins): Themen-Prüfung, Schulen, Schulanfragen, Daten-Sync
- **Profil-Übersicht**: Anzeige von Name, E-Mail, Schule, Kanton, Stufe
- **Profil-Bearbeitung**: Lehrpersonen können bearbeiten:
  - Schule (Dropdown mit allen verfügbaren Schulen)
  - Kanton (Dropdown mit allen Schweizer Kantonen)
  - Stufe (KiGa bis 9. Klasse)
- **Konfigurierbare Dashboard-Kacheln** (NEU):
  - Lehrpersonen wählen selbst, welche Kacheln auf dem Dashboard erscheinen
  - 12 verfügbare Kacheln: Jahresplan MIA, Jahresplanung, Lehrmittel, Lehrplan, Thema erstellen, Meine Themen, Schul-Dateien, Meine Klassen, Badges, Statistiken, FAQ, PICTS Buchungen
  - Standard-Kacheln: Jahresplan MIA, Lehrmittel, PICTS Buchungen
  - Einstellungen werden im Firestore-Profil gespeichert (`dashboardTiles`)
  - Dialog zum Anpassen mit Checkboxen und "Standard wiederherstellen" Option

### 3. Jahresplan MIA (Kanban-Board)
- **6 Spalten für Zeiträume** mit Roboter-Bildern:
  - Sommerferien - Herbstferien (roboter_herbst.png)
  - Herbstferien - Weihnachtsferien (roboter_weihnachten.png)
  - Weihnachtsferien - Winterferien (roboter_winter.png)
  - Winterferien - Frühlingsferien (roboter_frühling.png)
  - Frühlingsferien - Sommerferien (roboter_sommer.png)
  - Zusatz
- **Temporäre Stufe-Auswahl**: Dropdown zum Anschauen anderer Klassenstufen
- **Search-Parameter** (`?search=...&allStufen=true`):
  - Automatisches Öffnen des gesuchten Themas
  - Lädt alle Stufen wenn `allStufen=true`
  - Hinweis-Banner wenn Thema für andere Stufe vorgesehen
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

### 5. Lehrmittel-Übersicht (Akkordeon)
- **Akkordeon-Layout** gruppiert nach Lehrmittel
- Alphabetische Sortierung
- Für jedes Lehrmittel:
  - Lehrmittel-Bild
  - Ausklappbare Themen-Liste
  - **Klickbare Themen-Namen** mit Link zur Lektionsplanung
  - Beschreibung und Lektionenanzahl
- Optimiert für schnelle Navigation

### 5a. Lehrplan-Kompetenzen Seite (NEU)
- **Kachel-Layout** ähnlich wie Airtable
- **Sortierung**: Medien → Informatik → Anwendungskompetenzen
- **Akkordeon** pro Kompetenzbereich (alle standardmässig offen)
- **Kompetenz-Kacheln** zeigen:
  - LP-Code (z.B. "MI.1.1.a") prominent
  - Kompetenzbereich als farbiger Badge
  - Kompetenz und Kompetenzstufe
  - Grundanspruch (Ja/Nein mit grün/rot Badge)
  - Zyklus-Badges (farbcodiert)
  - Klassenstufen-Badges
  - **Querverweis LP** als klickbare Badges (Link zum Lehrplan)
  - **Klickbare Unterrichtsideen** → Navigiert zum Jahresplan
- **Filter**: Suche + Zyklus-Filter
- **Detail-Dialog** mit allen Kompetenz-Informationen
- **Statistik-Karte** am Ende der Seite

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
  - **Inline-Lektionen** (NEU):
    - Akkordeon-basierter Editor direkt im Formular
    - Button "Lektion zum Thema erfassen"
    - Automatische Nummerierung (Lektion 1, 2, 3...)
    - Drag & Ren-Nummerierung bei Löschung
    - Kompakter Editor mit allen Lektionsfeldern
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

### 16. Schul-Dateien (NEU)
Rechtssicheres Teilen von Dateien innerhalb einer Schule.

- **Datei-Upload** (`/dashboard/dateien`):
  - Drag & Drop oder File-Select
  - Unterstützte Formate: PDF, Word, Excel, PowerPoint, Bilder
  - Max. Dateigröße: 50MB
  - Client-seitiger Upload direkt zu Firebase Storage
  - Progress-Anzeige während Upload
- **Freigabe-Optionen**:
  - **Privat**: Nur für den Uploader sichtbar
  - **Schule**: Für alle Lehrpersonen derselben Schule sichtbar
- **Themen-Verknüpfung**:
  - Dateien können mit einem oder mehreren Themen verknüpft werden
  - ThemeSelector mit Suchfunktion
  - Verknüpfungen nachträglich bearbeitbar (Stift-Button)
  - Verknüpfte Dateien werden im Themen-Detail-Dialog angezeigt
- **Datei-Übersicht**:
  - Statistiken (Anzahl, Speicherplatz)
  - Filter: Alle / Meine / Von Kolleg:innen
  - Download, Teilen, Löschen Buttons
  - Verknüpfte Themen als Badges
- **Sicherheit**:
  - Firebase Storage Security Rules
  - Schulbasierte Zugriffskontrolle
  - CORS-Konfiguration erforderlich

### 17. FAQ-Seite
Häufig gestellte Fragen für Lehrpersonen.

- **Akkordeon-Layout**: Fragen klappbar
- **Kategorien**: Allgemein, Jahresplan, Themen, Dateien, Administration
- **Suchfunktion**: Schnelles Finden von Antworten
- **Navigation**: Über Dashboard-Sidebar erreichbar
- **Admin-Verwaltung** (NEU):
  - Toggle "Verwalten" für Admins
  - FAQ-Einträge erstellen mit Frage, Antwort, Kategorie
  - Bestehende Einträge bearbeiten
  - Einträge aktivieren/deaktivieren
  - Einträge löschen (mit Bestätigung)
  - Firestore-basiert statt hardcoded

### 18. Schulverwaltung (NEU)
Super-Admins können Schulen verwalten.

- **Schulen-Seite** (`/dashboard/admin/schools`):
  - Nur für `super_admin` zugänglich
  - Liste aller Schulen mit Benutzeranzahl
  - PICTS-Buchungslink anzeigen und bearbeiten
- **Schule erstellen**:
  - Button "Neue Schule"
  - Dialog mit Name, Ort, PICTS-Link
- **Schule bearbeiten**:
  - Name, Ort, PICTS-Link ändern
  - Direkt in der Übersicht
- **Schule löschen**:
  - Nur wenn keine Benutzer zugewiesen
  - Bestätigungsdialog
- **Benutzer-Übersicht**:
  - Anzahl Lehrpersonen pro Schule
  - Klickbar für Detailansicht

### 19. Favicon
SVG-basiertes Favicon für die MIA-App.

- **Design**: Code-Klammern `</>` mit farbigen Quadraten
- **Farben**: Blau (#1E5F8C), Grün (#4CAF50), Orange (#F39C12)
- **Dateien**:
  - `/public/icon.svg` - Standard Favicon
  - `/public/apple-icon.svg` - Apple Touch Icon
  - `/src/app/icon.svg` - Next.js App Router Icon
- **Metadata**: In `layout.tsx` konfiguriert

### 20. Kompetenzenpass (NEU)
Schüler können ihre Kompetenzen selbst bewerten, Lehrpersonen bestätigen diese.

- **Schüler-Selbstbewertung** (`/schueler/kompetenzen`):
  - Stern-Bewertung (1-3 Sterne) für jede Kompetenz
  - Bewertung wird als "ausstehend" markiert
  - Automatischer Zyklus-Filter basierend auf Klassenstufe
  - Möglichkeit, höhere Bewertungen anzufragen
- **Lehrer-Bestätigung** (`/dashboard/klassen/[id]`):
  - Tab "Bestätigungen" zeigt ausstehende Bewertungen
  - Bestätigen oder Anpassen der Schüler-Bewertung
  - Alle auf einmal bestätigen möglich
- **Kompetenz-Indikatoren** (`/dashboard/indikatoren`):
  - Verständliche Beschreibungen für Stern-Stufen
  - Admin kann Indikatoren pro Kompetenz erstellen
  - Schüler sehen Indikatoren bei der Bewertung

### 21. Schüler-Artefakte (NEU)
Schüler können Belege für ihre Kompetenzen hochladen.

- **Artefakt-Typen**:
  - **Bilder**: JPG, PNG, etc. (max. 20 MB)
  - **PDFs**: Dokumente (max. 20 MB)
  - **Links**: URLs zu externen Ressourcen
- **Upload** (in `/schueler/kompetenzen`):
  - Direkt beim Bewerten einer Kompetenz
  - Drag & Drop oder Datei-Auswahl
  - Progress-Anzeige während Upload
  - Titel und optionale Beschreibung
- **Lehrer-Ansicht**:
  - Artefakte bei ausstehenden Bestätigungen sichtbar
  - Kommentare zu Artefakten hinzufügen
  - Externe Links zum Anzeigen
- **Firebase Storage**:
  - Pfad: `student-artifacts/{studentId}/{filename}`
  - Security Rules: Nur eigene Artefakte hochladen/löschen

### 22. Scrollbare Dialoge (NEU)
Dialoge sind auf kleinen Bildschirmen scrollbar.

- **Dialog-Container**: `overflow-y-auto` für Scrollbarkeit
- **DialogContent**: `max-h-[calc(100vh-2rem)]` für Viewport-Begrenzung
- **Mobile**: `items-start` statt `items-center` für bessere Darstellung
- **Responsive**: Unterschiedliche max-height für Mobile/Desktop

### 23. DiceBear Avatare (NEU)
Schüler können personalisierte Avatare erstellen.

- **Avatar-Stile**: 6 verschiedene Stile (bottts, avataaars, lorelei, notionists, thumbs, funEmoji)
- **Anpassungen**: Hintergrundfarbe, Seed für Variation
- **Komponenten**:
  - `StudentAvatar.tsx` - Avatar-Anzeige mit DiceBear API
  - `AvatarEditor` - Dialog zum Bearbeiten des Avatars
- **Profilseite** (`/schueler/profil`): Schüler können ihr Profil und Avatar bearbeiten
- **Integration**: Avatar wird im Dashboard-Header und PDF-Export angezeigt
- **API**: DiceBear API (`api.dicebear.com`) in CSP-Whitelist

### 24. PDF-Export mit @react-pdf/renderer (NEU)
Verbesserter Kompetenzenpass-Export mit professionellem Layout.

- **Bibliothek**: `@react-pdf/renderer` statt jsPDF für bessere Unicode-Unterstützung
- **Komponente**: `KompetenzenpassPDF.tsx`
- **Features**:
  - **Deckblatt**: MIA-Logo, Titel, Schüler-Avatar, Name, Klasse, Datum
  - **Zusammenfassung**: Statistik-Karten, Fortschritts-Balken nach Bereich
  - **SVG-Sterne**: Korrekte Darstellung der Stern-Bewertungen
  - **Badges**: Farbige Buchstaben-Icons nach Seltenheit
  - **Kompetenzen**: Nach Bereich gruppiert (Medien, Informatik, Anwendungskompetenzen)
  - **Bearbeitete Themen**: Liste der abgeschlossenen Unterrichtsthemen
- **CSP**: `data:` und `blob:` in connect-src für WASM-Loading

### 25. Badge-System für Lehrpersonen (NEU)
Lehrpersonen können eigene Badges erstellen und vergeben.

- **Badge-Verwaltung** (`/dashboard/badges`):
  - Tab "Alle Badges": System-Badges und eigene Badges
  - Tab "Schüler-Badges": Übersicht nach Klasse
- **Eigene Badges erstellen**:
  - Emoji, Name, Beschreibung, Seltenheit (Gewöhnlich bis Legendär)
  - Badges sind schulweit verfügbar
- **Badges vergeben**:
  - Button "Badge vergeben" öffnet Dialog
  - Klasse → Schüler → Badge auswählen
  - Optionale Begründung
- **API**: `/api/student-badges` (POST für Vergabe, DELETE für Entfernen)

### 26. Fächerübergreifende Jahresplanung (NEU)
Lehrpersonen können ihren gesamten Unterricht über alle Fachbereiche hinweg planen.

- **Übersicht** (`/dashboard/jahresplanung`):
  - Schuljahr-Auswahl (aktuelles + vergangene/zukünftige)
  - 4 Quartalskarten mit Einheiten-Vorschau
  - Statistiken: Einheiten, Fachbereiche, Schulwochen
  - Fachbereich-Verteilung als farbige Badges
  - Schuljahr kopieren: Einheiten aus beliebigem Schuljahr übernehmen
  - Geteilte Einheiten von Kolleg:innen anzeigen
- **Quartalsansicht** (`/dashboard/jahresplanung/quartal/[q]`):
  - Wochen-Raster mit KW-Nummern und Daten
  - Farbige Balken für jede Einheit über die zugewiesenen Wochen
  - Beurteilungsmarker (blauer Kreis = formativ, orange Raute = summativ)
  - Kompetenzbereich-Label oberhalb des Titels
  - Ferienwochen grau markiert
  - PDF-Export mit Lehrperson und Klasse
- **Wochenansicht** (`/dashboard/jahresplanung/woche/[kw]`):
  - Detailansicht aller Einheiten in einer Woche
  - Status-Verwaltung (Geplant → Durchgeführt → Reflektiert)
  - Beurteilungsanzeige mit Typ und Notiz
  - Notizen-Feld pro Einheit
  - Navigation: Vor/Zurück-Buttons zwischen Wochen
  - PDF-Export mit Lehrperson und Klasse
- **Einheit bearbeiten** (`/dashboard/jahresplanung/einheit/[id]`):
  - Fachbereich und Kompetenzbereich aus LP21
  - Titel, Wochenstunden, Zeitraum (von KW bis KW)
  - Mehrere Beurteilungen pro Einheit (formativ + summativ)
  - Jede Beurteilung mit eigener KW-Zuordnung und Notiz
  - Verknüpfung mit MIA-Themen aus dem Jahresplan
  - Teilen mit Kolleg:innen
- **Ferienverwaltung** (`/dashboard/jahresplanung/ferien`):
  - Preset-Ferien nach Kanton laden
  - Individuelle Ferien hinzufügen/bearbeiten/löschen
  - Ferien pro Schuljahr verwalten
- **PDF-Export**:
  - Quartalsplanung, Wochenplanung und Jahresplanung als PDF
  - Name und Klasse der Lehrperson im Header
  - Beurteilungsmarker und Fachbereich-Farben
  - Erstellt mit `@react-pdf/renderer`
- **Schuljahr kopieren**:
  - Auswahl aus 6 vergangenen Schuljahren
  - Kopiert alle Einheiten mit KW-Zuordnung
  - Warnung bei bestehenden Einheiten im Ziel-Schuljahr

### 27. LP21 KompetenzPicker (NEU)
Hierarchische Kompetenz-Auswahl für die Jahresplanung mit LP21-API-Daten.

- **Hierarchie**: Fachbereich → Kompetenzbereich → Kompetenz → Kompetenzstufe
- **Datenquelle**: LP21-API via Firestore-Cache (`lp21_struktur` Collection)
- **Fachbereich-Splitting**:
  - SPR (Sprachen) → D, DaZ, FS1F, FS2E, FS3I
  - GES (Gestalten) → BG, TTG
- **Kanton-Aliase**: MI ↔ IB für Solothurn (`FACHBEREICH_ALIASES`)
- **Exclude-Filter**: DaZ aus D herausfiltern (`FACHBEREICH_EXCLUDES`)
- **Anwendungskompetenzen**: MI.3 / IB.3 aus `system_kompetenzen` integriert
- **Persistent Cache**: `kompetenzstufenCacheRef` (useRef) für Badge-Anzeige über Fachbereich-Wechsel hinweg
- **Responsive**: `max-w-[calc(100vw-2rem)]` auf SelectContent, `whitespace-normal` auf Items
- **Fallback-Suche**: 4-stufige Lookup-Strategie in `getLP21Struktur()`:
  1. Exakte Doc-ID + Aliase
  2. Sub-Fachbereich-Extraktion aus Umbrella-Kategorien
  3. Prefix-Match in allen Dokumenten
  4. Suche in allen Dokumenten nach passenden Kompetenzbereichen

**Wichtige Dateien:**
- `src/components/jahresplanung/KompetenzPicker.tsx` - UI-Komponente
- `src/lib/firestore/system-cache.ts` - Daten-Adapter mit Alias/Exclude/Fallback-Logik
- `src/app/api/kompetenzen/lp21/struktur/route.ts` - Struktur-API
- `src/app/api/kompetenzen/lp21/route.ts` - Kompetenzstufen-API
- `src/lib/data/lehrplan21-fachbereiche.json` - Statische Fachbereich-Definitionen
- `src/lib/lp21/crawler.ts` - LP21 API Crawler

### 28. LP21 API Sync
Kompetenzen direkt von der LP21-API synchronisieren.

- **Admin-UI**: `/dashboard/admin/sync` → "LP21 Lehrplan-API Sync"
- **Kanton-Auswahl**: Alle Schweizer Kantone
- **Fachbereich-Auswahl**: Dynamisch von LP21-API oder Fallback-Liste
- **Crawler**: Traversiert den LP21-Kompetenzbaum (Fachbereich → Fächer → Kompetenzbereiche → Kompetenzen → Kompetenzstufen → Aufzählungspunkte)
- **Speicherung**:
  - `lp21_struktur` Collection: Fachbereich-Strukturen (Kompetenzbereiche + Kompetenzen)
  - `system_kompetenzen` Collection: Einzelne Kompetenzstufen mit LP-Codes
- **Dauer**: 10-30 Sekunden pro Fachbereich

### 29. Jahresplan-Pool & kuratierter Schul-Jahresplan (NEU)
System-Themen (Airtable) und systemweit freigegebene Custom Themes bilden einen gemeinsamen Pool. PICTS-Admins (für ihre Schule) bzw. Super-Admins (für beliebige Schulen) ordnen daraus den Schul-Jahresplan per Checkbox zusammen und können einzelne Themen schulspezifisch anpassen.

**Konzept: Override-Pattern**
- Keine Kopie des Themas – es wird nur ein Assignment mit den geänderten Feldern gespeichert
- System-Updates (z.B. neue Version in Airtable) propagieren automatisch, sofern kein Override gesetzt ist
- Orphan-Assignments (Original gelöscht) werden beim Laden still übersprungen

**Modus pro Schule** (`jahresplanMode` auf `system_schulen`-Dokument):
- `open` (Default): Bisheriges Verhalten – alle Pool-Themen sichtbar (volle Abwärtskompatibilität)
- `curated`: Nur explizit zugeordnete Themen erscheinen im Jahresplan; Overrides wirken

**Admin-UI** (`/dashboard/admin/jahresplan-pool`):
- Super-Admin: Schul-Auswahl per Dropdown; PICTS-Admin sieht nur eigene Schule
- Mode-Toggle mit Bestätigungsdialog
- "Alle Pool-Themen zuordnen" (Initial-Populate mit Bulk-Upsert, Chunk-Size 450)
- Suche + Zeitraum-Filter über den Pool
- Pool gruppiert nach Zeitraum; Checkbox pro Thema zum (De-)Aktivieren
- Edit-Dialog für Overrides (Thema, Beschreibung, Lehrmittel, Anzahl Lektionen, Zeitraum, Stufe, File rouge, Unterlagen) und schulspezifische Ergänzungen (Materialien, Notizen, Unterlagen)
- "Anpassungen zurücksetzen" setzt alle Overrides auf `null` (FieldValue.delete())

**Lehrer-Sicht** (`/dashboard/jahresplan`):
- API fügt bei vorhandener `schuleId` automatisch `curated=true` hinzu
- Server prüft den Schul-Modus; bei `curated` wird der kuratierte Plan geliefert, sonst Fallback auf `open`
- Stufen-Filter wird NACH dem Merge angewandt, damit `stufeOverride` greift
- Response-Header `X-Jahresplan-Mode: curated` zum Debugging

**Wichtige Dateien:**
- `src/types/index.ts` – `JahresplanMode`, `SchoolJahresplanAssignment`, erweiterte `Thema`/`Schule`
- `src/lib/firestore/school-jahresplan.ts` – CRUD für Collection `school_jahresplan_assignments`
- `src/lib/firestore/permissions.ts` – `canManageSchoolJahresplan(userId, schuleId)`
- `src/app/api/school-jahresplan/route.ts` – List + Bulk-Upsert
- `src/app/api/school-jahresplan/[id]/route.ts` – PUT (Overrides, Validation gegen Zeitraum/Stufe-Enums) + DELETE (Soft-Delete via `isActive`)
- `src/app/api/school-jahresplan/initial-populate/route.ts` – Auto-Assign aller System-Themen + approved Custom Themes
- `src/app/api/admin/schools/[id]/jahresplan-mode/route.ts` – Modus lesen/setzen (Audit: changedBy/At)
- `src/app/api/themen/route.ts` – `applyAssignmentOverrides()`, `getCuratedThemen()`, Mode-Check, Orphan-Handling
- `src/app/dashboard/admin/jahresplan-pool/page.tsx` – Admin-UI inkl. `AssignmentEditDialog`

**Firestore-Collection `school_jahresplan_assignments`:**
```typescript
{
  schuleId: string
  sourceType: "system" | "custom"
  sourceThemeId: string          // Airtable-ID oder Firestore-ID des Custom Themes
  // Override-Felder (alle optional; undefined = vom Original übernehmen)
  themaOverride?: string
  beschreibungOverride?: string
  lehrmittelOverride?: string
  bildLehrmittelOverride?: string
  anzahlLektionenOverride?: number
  zeitraumOverride?: Zeitraum
  stufeOverride?: Stufe[]
  fileRougeOverride?: string
  unterlagenOverride?: string
  // Schulspezifische Ergänzungen (additiv zum Original)
  schulMaterialien?: string[]
  schulNotizen?: string
  schulUnterlagen?: string
  // Metadaten
  assignedBy: string
  assignedByName: string
  assignedAt: Date
  lastModifiedBy?: string
  lastModifiedByName?: string
  lastModifiedAt?: Date
  isActive: boolean              // Soft-Delete erhält Overrides bei Re-Aktivierung
  sortOrder?: number             // für zukünftige Reihenfolge-Steuerung
}
```

**Firestore-Rules:**
- Read: alle authentifizierten User (Filter auf eigene Schule auf API-Ebene)
- Write (Create/Update/Delete): Super-Admin oder PICTS-Admin der Schule

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
Aktualisiert Lehrerprofil (Stufe, Kanton, Schule ändern)

**Request Body:**
```json
{
  "userId": "firebase-uid",
  "stufe": "6. Klasse",        // optional
  "kanton": "ZH",              // optional
  "schuleId": "firestore-id"   // optional
}
```

### GET `/api/themen?stufe={stufe}&grouped=true`
Lädt Themen nach Stufe, gruppiert nach Zeiträumen

**Query Parameters:**
- `stufe` - Klassenstufe (optional, wenn nicht gesetzt werden alle Themen geladen)
- `grouped` - `true` für Gruppierung nach Zeitraum

**Response:**
```json
{
  "Sommerferien-Herbstferien": [
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

### GET `/api/kompetenzen`
Lädt alle Lehrplan-Kompetenzen mit Unterrichtsideen

**Response:**
```json
{
  "kompetenzen": [
    {
      "id": "recXXX",
      "lpCode": "MI.1.1.a",
      "name": "...",
      "kompetenzbereich": "Medien",
      "kompetenz": "...",
      "kompetenzstufe": "...",
      "zyklus": ["Zyklus 1", "Zyklus 2"],
      "klassenstufe": ["1./2.", "3./4."],
      "grundanspruch": "Ja",
      "querverweisLP": "[D.2.B.1.a](https://...)",
      "unterrichtsideen": [
        {
          "id": "recYYY",
          "name": "Thema Name",
          "lehrmittel": "Connected",
          "anzahl": 8
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

### GET `/api/school-files?themeId={themeId}`
Lädt Schul-Dateien für den aktuellen User (eigene + geteilte der Schule)

**Query Parameters:**
- `themeId` - Optional: Nur Dateien für ein bestimmtes Thema

**Response:**
```json
{
  "files": [
    {
      "id": "firestore-doc-id",
      "name": "Arbeitsblatt.pdf",
      "storagePath": "school-files/recXXX/shared/...",
      "storageUrl": "https://...",
      "contentType": "application/pdf",
      "size": 1024000,
      "schuleId": "recXXX",
      "uploadedBy": "user-id",
      "uploadedByName": "Max Mustermann",
      "sharedWith": "school",
      "linkedThemeIds": ["recYYY"],
      "linkedThemeNames": ["Thema Name"],
      "createdAt": "2025-01-02T..."
    }
  ]
}
```

### POST `/api/school-files/metadata`
Speichert Metadaten nach Client-seitigem Upload zu Firebase Storage

**Request Body:**
```json
{
  "name": "Arbeitsblatt.pdf",
  "storagePath": "school-files/recXXX/shared/...",
  "storageUrl": "https://...",
  "contentType": "application/pdf",
  "size": 1024000,
  "sharedWith": "school",
  "linkedThemeIds": ["recYYY"],
  "linkedThemeNames": ["Thema Name"],
  "description": "Optionale Beschreibung"
}
```

### PUT `/api/school-files/[id]`
Aktualisiert eine Datei (Name, Freigabe, Verknüpfungen)

**Request Body:**
```json
{
  "name": "Neuer Name.pdf",
  "sharedWith": "private",
  "linkedThemeIds": ["recYYY", "recZZZ"],
  "linkedThemeNames": ["Thema 1", "Thema 2"]
}
```

### DELETE `/api/school-files/[id]`
Löscht eine Datei (nur Uploader oder Admin der Schule)

### GET `/api/faq`
Lädt alle aktiven FAQ-Einträge (sortiert nach Kategorie und Order)

**Response:**
```json
{
  "items": [
    {
      "id": "firestore-doc-id",
      "question": "Was ist die MIA-App?",
      "answer": "Die MIA-App ist...",
      "category": "allgemein",
      "order": 1,
      "isActive": true,
      "createdAt": "2025-01-03T..."
    }
  ]
}
```

### POST `/api/faq`
Erstellt einen neuen FAQ-Eintrag (nur Admins)

**Request Body:**
```json
{
  "question": "Neue Frage?",
  "answer": "Die Antwort...",
  "category": "allgemein",
  "order": 1,
  "isActive": true
}
```

### PUT `/api/faq/[id]`
Aktualisiert einen FAQ-Eintrag (nur Admins)

### DELETE `/api/faq/[id]`
Löscht einen FAQ-Eintrag (nur Admins)

### PATCH `/api/faq/[id]`
Togglet den Active-Status eines FAQ-Eintrags (nur Admins)

### GET `/api/admin/schools`
Lädt alle Schulen mit Benutzeranzahl (nur Super-Admins)

**Response:**
```json
{
  "schools": [
    {
      "id": "firestore-doc-id",
      "name": "Schule Beispiel",
      "ort": "Zürich",
      "pictsBuchen": "https://...",
      "userCount": 5,
      "createdAt": "2025-01-03T..."
    }
  ]
}
```

### POST `/api/admin/schools`
Erstellt eine neue Schule (nur Super-Admins)

**Request Body:**
```json
{
  "name": "Neue Schule",
  "ort": "Bern",
  "pictsBuchen": "https://..."
}
```

### PUT `/api/admin/schools/[id]`
Aktualisiert eine Schule (nur Super-Admins)

**Request Body:**
```json
{
  "name": "Neuer Name",
  "ort": "Neuer Ort",
  "pictsBuchen": "https://neuer-link..."
}
```

### DELETE `/api/admin/schools/[id]`
Löscht eine Schule (nur Super-Admins, nur wenn keine Benutzer zugewiesen)

### GET `/api/student-artifacts?studentId={id}&competencyId={id}`
Lädt Artefakte für einen Schüler (optional gefiltert nach Kompetenz)

**Query Parameters:**
- `studentId` - Schüler-ID (Pflicht für Schüler, optional für Lehrer)
- `competencyId` - Optional: Nur Artefakte für eine Kompetenz
- `classId` - Optional: Alle Artefakte einer Klasse (nur Lehrer)

**Response:**
```json
{
  "artifacts": [
    {
      "id": "firestore-doc-id",
      "studentId": "firebase-uid",
      "studentName": "Max Mustermann",
      "competencyId": "recXXX",
      "competencyName": "MI.1.1.a",
      "type": "image",
      "title": "Mein Projekt",
      "storagePath": "student-artifacts/uid/...",
      "storageUrl": "https://...",
      "teacherComment": "Gut gemacht!",
      "createdAt": "2026-01-09T..."
    }
  ]
}
```

### POST `/api/student-artifacts`
Erstellt ein neues Artefakt (nur Schüler)

**Request Body:**
```json
{
  "competencyId": "recXXX",
  "competencyName": "MI.1.1.a",
  "type": "image",
  "title": "Mein Projekt",
  "description": "Optionale Beschreibung",
  "storagePath": "student-artifacts/uid/...",
  "storageUrl": "https://...",
  "contentType": "image/png",
  "size": 1024000
}
```

### PUT `/api/student-artifacts/[id]`
Aktualisiert ein Artefakt (nur eigene)

### DELETE `/api/student-artifacts/[id]`
Löscht ein Artefakt (Schüler: eigene, Lehrer: ihrer Klassen)

### PUT `/api/student-artifacts/[id]/comment`
Fügt Lehrer-Kommentar hinzu (nur Lehrer)

**Request Body:**
```json
{
  "comment": "Gut gemacht!"
}
```

### DELETE `/api/student-artifacts/[id]/comment`
Entfernt Lehrer-Kommentar (nur eigene Kommentare oder Admins)

### GET `/api/themen?schuleId={id}&curated=true&stufe={stufe}&grouped=true`
Erweiterte Themen-API mit curated-Modus für Schul-Jahresplan

**Query Parameters:**
- `schuleId` - Firestore-ID der Schule (Pflicht für curated-Modus)
- `curated` - `true` aktiviert den Schul-Jahresplan (nur wirksam, wenn Schule im Modus `curated` ist; sonst Fallback auf bisheriges Verhalten)
- `stufe`, `grouped` - wie bisher

**Response-Header:**
- `X-Jahresplan-Mode: curated` (nur bei aktivem curated-Modus)

### GET `/api/school-jahresplan?schuleId={id}&includeInactive={bool}`
Lädt alle aktiven Assignments einer Schule (Admin: inkl. deaktivierter)

### POST `/api/school-jahresplan`
Erstellt oder aktualisiert Assignments (Single oder Bulk)

**Request Body (Single):**
```json
{
  "schuleId": "firestore-id",
  "sourceType": "system" | "custom",
  "sourceThemeId": "recXXX" | "firestore-id",
  "themaOverride": "Optional",
  ...
}
```

**Request Body (Bulk):**
```json
{
  "schuleId": "firestore-id",
  "assignments": [{ "sourceType": "...", "sourceThemeId": "..." }, ...]
}
```

### PUT `/api/school-jahresplan/[id]`
Aktualisiert Overrides eines Assignments. `null` als Wert löscht das Override-Feld (FieldValue.delete()) und stellt das Original wieder her. Zeitraum und Stufe werden gegen die bekannten Enums validiert.

### DELETE `/api/school-jahresplan/[id]`
Soft-Delete (setzt `isActive=false`, erhält Overrides für Re-Aktivierung)

### POST `/api/school-jahresplan/initial-populate`
Weist alle System-Themen + approved Custom Themes (isSystemWide=true) der Schule zu (Bulk-Upsert, Chunk-Size 450)

**Request Body:**
```json
{ "schuleId": "firestore-id" }
```

### GET `/api/admin/schools/[id]/jahresplan-mode`
Liest aktuellen Modus (Default: `open`)

### PUT `/api/admin/schools/[id]/jahresplan-mode`
Setzt den Modus (Super-Admin oder PICTS-Admin der Schule)

**Request Body:**
```json
{ "mode": "open" | "curated" }
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

### ✅ Abgeschlossen (Dezember 2024)

- [x] **Hybrid Airtable-Firestore Architektur** - 5-7x Performance-Boost
- [x] **Firestore Cache System** - system_themes, system_schulen, system_kompetenzen, system_lektionen
- [x] **Admin Sync Page** - Manueller Sync-Trigger mit Status-Monitoring
- [x] **Cache-Debug Headers** - X-Data-Source und X-Cache-Enabled für Debugging
- [x] **Custom Themes System** - Eigene Themen mit Lektionsplanung erstellen
- [x] **Theme Review Workflow** - PICTS-Admin kann Themen freigeben/ablehnen
- [x] **In-App Notifications** - Bell mit Badge für Review-Status
- [x] **Roboter-Bilder im Kanban** - Saisonale Roboter für Zeiträume
- [x] **Collapsible Sidebar Navigation** - Ein-/ausklappbar mit localStorage
- [x] **Lehrplan-Kompetenzen Seite** - Kachel-Layout mit klickbaren Unterrichtsideen
- [x] **Lehrmittel Akkordeon-Layout** - Bessere UX für Themen-Übersicht
- [x] **Inline-Lektionen Editor** - Lektionen direkt beim Thema erstellen
- [x] **Querverweis LP Formatierung** - Als klickbare Badges statt Raw-Text
- [x] **AllStufen-Modus im Jahresplan** - Unterrichtsideen für alle Stufen klickbar

### ✅ Abgeschlossen (Januar 2026)

- [x] **Schul-Dateien System** - Dateien schulintern teilen
  - Client-seitiger Upload zu Firebase Storage
  - Schulbasierte Zugriffskontrolle
  - Private und geteilte Dateien
- [x] **Themen-Verknüpfungen** - Dateien mit Themen verknüpfen
  - ThemeSelector Komponente mit Suche
  - Nachträgliches Bearbeiten der Verknüpfungen
  - LinkedFilesViewer im Themen-Dialog
- [x] **FAQ-Seite** - Häufig gestellte Fragen für Lehrpersonen
- [x] **FAQ-Verwaltung** - Admin-Interface für FAQ-Einträge
  - CRUD-Operationen via Firestore
  - Aktivieren/Deaktivieren von Einträgen
  - Kategorien: Allgemein, Jahresplan, Themen, Dateien, Admin
- [x] **Schulverwaltung** - Super-Admin Schulen-Management
  - Neue Schulen erstellen
  - PICTS-Buchungslinks bearbeiten
  - Schulen löschen (nur ohne Benutzer)
  - Benutzeranzahl pro Schule anzeigen
- [x] **Erweitertes Lehrerprofil** - Mehr Profilfelder bearbeitbar
  - Schule ändern (Dropdown)
  - Kanton hinzufügen/ändern (alle CH-Kantone)
  - Verbesserte API mit schuleId-Support
- [x] **Favicon** - SVG-basiertes App-Icon
  - Code-Klammern Design
  - Passend zum Logo
  - Apple Touch Icon
- [x] **Kompetenzenpass Phase 1** - Lehrer-Bestätigung für Schülerbewertungen
  - Schüler bewerten sich selbst (1-3 Sterne)
  - Lehrer bestätigen oder passen an
  - Ausstehende Bewertungen in Klassen-Ansicht
- [x] **Kompetenzenpass Phase 2** - Kompetenz-Indikatoren
  - Verständliche Beschreibungen für Stern-Stufen
  - Admin-Interface zum Verwalten
  - Anzeige bei Schüler-Bewertung
- [x] **Kompetenzenpass Phase 3** - Schüler-Artefakte
  - Upload von Bildern, PDFs, Links als Belege
  - Lehrer können Artefakte kommentieren
  - Firebase Storage Integration
- [x] **Gruppierte Menüstruktur** - Übersichtliche Navigation
  - 6 Kategorien: Übersicht, Unterricht, Eigene Inhalte, Kompetenzenpass, Hilfe, Admin
  - Kategorie-Überschriften in der Sidebar
  - Responsive für Mobile und Desktop
- [x] **Scrollbare Dialoge** - Bessere UX auf kleinen Bildschirmen
  - max-height mit viewport-basierter Berechnung
  - overflow-y-auto für lange Inhalte

### ✅ Abgeschlossen (Februar 2026)

- [x] **Fächerübergreifende Jahresplanung** - Komplettes Planungstool
  - Quartals- und Wochenansicht mit Wochen-Raster
  - LP21-Fachbereiche und Kompetenzbereiche
  - Einheiten erstellen, bearbeiten, löschen
  - Farbige Darstellung nach Fachbereich
- [x] **Manuelle Ferienverwaltung** - Schulferien pro Schuljahr anpassen
  - Preset-Ferien nach Kanton laden
  - Individuelle Ferien erstellen/bearbeiten/löschen
  - Timezone-sichere Datumserkennung
- [x] **MIA-Themen-Verknüpfung** - Einheiten mit MIA-Themen verknüpfen
- [x] **Beurteilungen mit KW-Zuordnung** - Mehrere Beurteilungen pro Einheit
  - Formative und summative Beurteilungen
  - Jede Beurteilung einer spezifischen KW zugewiesen
  - Marker in Quartalsübersicht nur in zugewiesener Woche
  - Abwärtskompatible Migration von Einzel-Beurteilungen
- [x] **PDF-Export Jahresplanung** - Quartals-, Wochen- und Jahresplanung
  - Name und Klasse der Lehrperson im Header
  - Fachbereich-Farben und Beurteilungsmarker
  - Kompetenzbereich-Label in Quartalsübersicht
- [x] **Wochennavigation** - Vor/Zurück-Buttons in Wochenansicht
- [x] **Schuljahr kopieren** - Einheiten aus beliebigem vergangenen Schuljahr übernehmen
  - Auswahl aus 6 vergangenen Schuljahren (statt nur Vorjahr)
- [x] **Jahresplan MIA** - Umbenennung im Menü und Dashboard
- [x] **Konfigurierbare Dashboard-Kacheln** - Lehrpersonen wählen ihre Kacheln
  - 12 verfügbare Kacheln
  - Einstellungen in Firestore-Profil gespeichert
  - Standard-Kacheln wiederherstellbar

### ✅ Abgeschlossen (März 2026)

- [x] **LP21 KompetenzPicker** - Hierarchische Kompetenz-Auswahl
  - Fachbereich → Kompetenzbereich → Kompetenz → Kompetenzstufe
  - LP21-API-Daten aus Firestore-Cache
  - Persistent Cache für Badge-Anzeige über Fachbereich-Wechsel
- [x] **LP21 API Sync** - Kompetenzen direkt von der LP21-API
  - Admin-UI zum Syncing pro Kanton und Fachbereich
  - Crawler traversiert LP21-Kompetenzbaum
- [x] **Fachbereich-Splitting** - SPR → D/DaZ/FS, GES → BG/TTG
  - DaZ als eigener Fachbereich (aus D herausgefiltert)
  - TTG und BG als separate Fachbereiche
- [x] **Kanton-Aliase** - MI ↔ IB Mapping für Solothurn
- [x] **Anwendungskompetenzen** - MI.3 / IB.3 aus Airtable-Daten
- [x] **Responsive Dropdowns** - Kompetenz-Auswahl auf schmalen Bildschirmen

### ✅ Abgeschlossen (April 2026)

- [x] **Jahresplan-Pool & kuratierter Schul-Jahresplan** - Schul-interne Zuordnung
  - Gemeinsamer Pool aus System-Themen + systemweit freigegebenen Custom Themes
  - Override-Pattern statt Kopie (System-Updates propagieren automatisch)
  - Schul-Modus `open` (Default, abwärtskompatibel) oder `curated`
  - Admin-UI `/dashboard/admin/jahresplan-pool` mit Checkbox-Zuordnung und Edit-Dialog
  - Bulk-Upsert für Initial-Befüllung (Chunk-Size 450)
  - Soft-Delete via `isActive`-Flag
  - Orphan-Handling (gelöschte Originale werden still übersprungen)
  - Validierung von Zeitraum/Stufe gegen bekannte Enums
  - Firestore-Rules für neue Collection `school_jahresplan_assignments`

### 🚧 In Arbeit / Geplant

#### Jahresplan-Pool Phase 2

- [ ] **Auto-Assignment bei Theme-Approval** - Neu freigegebene Custom Themes automatisch in Pool der Schul-Jahrespläne einordnen
- [ ] **Orphan-Cleanup-UI** - Hinweis im Pool, wenn Assignment auf gelöschtes Original zeigt
- [ ] **Override-Badge im KanbanBoard** - Visuelle Kennzeichnung `isSchoolOverridden=true`
- [ ] **Reihenfolge-Steuerung** - `sortOrder`-Feld zur UI hinzufügen
- [ ] **Kompetenzen-Override** - aktuell kommen Kompetenzen immer vom Original
- [ ] **Datei-Upload für schulUnterlagen/schulMaterialien** - statt nur Text/URLs
- [ ] **Audit-Log-Ansicht** - `lastModifiedBy/At` im UI anzeigen
- [ ] **Notifications** bei Plan-Umstrukturierung an Schul-Lehrer

#### Infrastructure & Performance

- [ ] **Automatischer Daily Sync (Cron Job)** - PRIORITÄT: MEDIUM
  - Vercel Cron Job für täglich automatischen Sync
  - Konfigurierbare Sync-Zeit (z.B. 2:00 Uhr morgens)
  - Email-Benachrichtigung bei Sync-Fehlern
  - Incremental Sync (nur geänderte Daten)

  **Implementierung:**
  ```json
  // vercel.json
  {
    "crons": [{
      "path": "/api/admin/cron/sync",
      "schedule": "0 2 * * *"
    }]
  }
  ```

- [ ] **Cache Invalidierung Strategie**
  - TTL (Time-to-Live) für Cache-Einträge
  - Selective Cache Refresh (einzelne Collections)
  - Cache-Status Dashboard

#### UI/UX Verbesserungen
- [ ] **Landing Page Hero-Section**
  - MIA-App Branding
  - Features-Übersicht
  - Call-to-Action für Login/Registrierung

- [ ] **Custom Theme Badge im Kanban-Board**
  - Badge "Eigenes Thema" für Custom Themes
  - Visuell von Airtable-Themen unterscheidbar

### Funktionale Erweiterungen
- [ ] **Lektionsplanung-Viewer für Custom Themes**
  - Viewer auch für Custom Lektionen
  - Export-Funktionen (Markdown, PDF) für Custom Lektionen
  - Integration in Thema-Detail-Dialog

- [ ] **Erweiterte Admin-Features**
  - ~~Benutzer-Verwaltung für Super Admins~~ ✅ (Schulverwaltung implementiert)
  - PICTS-Admin Ernennung direkt in der App
  - Statistiken (Anzahl Themen, Reviews, etc.)

### Performance & Qualität
- [ ] **React Query Integration**
  - Caching für API-Calls
  - Optimistic Updates
  - Background Refresh

- [ ] **Error Handling verbessern**
  - Toast Notifications für Errors
  - Bessere Error Messages
  - Retry-Mechanismus

- [ ] **Loading States**
  - Skeleton Screens statt Spinner
  - Progressive Loading

### Testing & Monitoring
- [ ] **Unit Tests** für kritische Funktionen
- [ ] **E2E Tests** für User Workflows
- [ ] **Monitoring & Analytics** (Firebase Analytics, Sentry)

## Kontakt & Support

Bei Fragen oder Problemen:
- Check die Konsole für detaillierte Error-Logs
- Firebase Admin Logs in Vercel Function Logs
- Airtable API Limits beachten (5 requests/second)

## Lizenz

Privates Projekt für Schulen
