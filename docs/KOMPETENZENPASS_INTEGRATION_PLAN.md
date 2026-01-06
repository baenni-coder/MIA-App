# Kompetenzenpass Integration in MIA-App

## Übersicht

Integration des Kompetenzenpasses als Schüler-Bereich in die MIA-App. Lehrpersonen und Schüler nutzen dieselbe App mit unterschiedlichen Dashboards.

**Ziel**: Eine App für Lehrer (Jahresplan, Themen) und Schüler (Kompetenzbewertung, Badges)

---

## Phase 1: Grundstruktur & Authentifizierung

### 1.1 Erweiterung des Rollen-Systems

**Datei**: `src/types/index.ts`

```typescript
// Bestehend erweitern
export type UserRole = "student" | "teacher" | "picts_admin" | "super_admin";

// Neue Typen
export interface Student {
  id: string;                    // Firebase UID
  email: string;
  name: string;
  role: "student";
  classId: string;               // Zugehörige Klasse
  className?: string;            // Aufgelöster Klassenname
  schoolId: string;              // Schule (für Zugriffskontrolle)
  teacherId: string;             // Hauptverantwortliche Lehrperson
  createdAt: Date;
  lastActive?: Date;
}

export interface SchoolClass {
  id: string;
  name: string;                  // z.B. "5a", "6b"
  displayName?: string;          // z.B. "5. Klasse A"
  grade: Stufe;                  // Klassenstufe für Kompetenz-Filterung
  schoolId: string;
  teacherId: string;             // Klassenlehrer
  teacherName?: string;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type Stufe =
  | "KiGa"
  | "1. Klasse" | "2. Klasse" | "3. Klasse"
  | "4. Klasse" | "5. Klasse" | "6. Klasse"
  | "7. Klasse" | "8. Klasse" | "9. Klasse";
```

### 1.2 Neue Firestore Collections

**Collection**: `students`
```typescript
{
  id: string,           // Firebase UID
  email: string,
  name: string,
  role: "student",
  classId: string,
  schoolId: string,
  teacherId: string,
  createdAt: Timestamp,
  lastActive: Timestamp
}
```

**Collection**: `classes`
```typescript
{
  id: string,
  name: string,
  displayName: string,
  grade: string,
  schoolId: string,
  teacherId: string,
  teacherName: string,
  studentCount: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 1.3 Landing Page mit Rollen-Auswahl

**Datei**: `src/app/page.tsx` (anpassen)

- Zwei Karten: "Lehrer-Login" und "Schüler-Login"
- Lehrer → `/login` (bestehend)
- Schüler → `/schueler/login` (neu)

### 1.4 Schüler-Authentifizierung

**Neue Dateien**:
- `src/app/schueler/login/page.tsx` - Schüler-Login
- `src/app/schueler/register/page.tsx` - Schüler-Registrierung (optional, für Selbstregistrierung)

**Anpassung**: `src/contexts/AuthContext.tsx`
- `user` Objekt erweitern um `role` Check
- Redirect-Logik: Student → `/schueler/dashboard`, Teacher → `/dashboard`

### 1.5 Schüler-geschützte Routen

**Neue Datei**: `src/components/StudentProtectedRoute.tsx`

```typescript
// Prüft ob User eingeloggt UND role === "student"
// Redirected zu /schueler/login wenn nicht
```

### 1.6 Schüler-Layout

**Neue Datei**: `src/components/StudentDashboardLayout.tsx`

- Vereinfachte Sidebar für Schüler
- Menüpunkte: Dashboard, Kompetenzen, Meine Themen, Profil
- Badge-Anzeige im Header
- Mobile-optimiert

### 1.7 API-Endpunkte Phase 1

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/students` | GET | Schüler der eigenen Klasse (Lehrer) |
| `/api/students` | POST | Schüler erstellen (Lehrer) |
| `/api/students/[id]` | GET, PUT, DELETE | Einzelner Schüler |
| `/api/students/bulk` | POST | Bulk-Import (Lehrer) |
| `/api/classes` | GET, POST | Klassen auflisten/erstellen |
| `/api/classes/[id]` | GET, PUT, DELETE | Einzelne Klasse |
| `/api/classes/[id]/students` | GET | Schüler einer Klasse |

### 1.8 Firestore Security Rules

```javascript
// students Collection
match /students/{studentId} {
  // Schüler kann eigenes Profil lesen
  allow read: if request.auth.uid == studentId;
  // Lehrer kann Schüler seiner Schule lesen
  allow read: if isTeacher() &&
    get(/databases/$(database)/documents/students/$(studentId)).data.schoolId ==
    get(/databases/$(database)/documents/teachers/$(request.auth.uid)).data.schuleId;
  // Nur Lehrer können Schüler erstellen/bearbeiten
  allow write: if isTeacher();
}

// classes Collection
match /classes/{classId} {
  allow read: if isAuthenticated();
  allow write: if isTeacher();
}
```

### 1.9 Klassen-Management für Lehrer

**Neue Datei**: `src/app/dashboard/klassen/page.tsx`

- Liste aller eigenen Klassen
- Klasse erstellen (Name, Stufe)
- Schüler zur Klasse hinzufügen
- Bulk-Import via CSV/Excel

### 1.10 Schüler-Dashboard (Basis)

**Neue Datei**: `src/app/schueler/dashboard/page.tsx`

- Willkommens-Nachricht mit Name
- Klassen-Info
- Fortschritts-Übersicht (Platzhalter)
- Quick-Links zu Kompetenzen

---

## Phase 2: Schüler-Kompetenzbewertung

### 2.1 Neue Collections

**Collection**: `student_progress`
```typescript
{
  id: string,              // = odertId
  odertId: string,
  classId: string,
  ratings: {
    [competencyId: string]: number  // 0-5 Sterne
  },
  comments: {
    [competencyId: string]: string  // Lehrer-Kommentare
  },
  pendingReviews: {
    [competencyId: string]: string  // Review-Request IDs
  },
  lastUpdated: Timestamp
}
```

**Collection**: `progress_history`
```typescript
{
  id: string,
  studentId: string,
  competencyId: string,
  oldRating: number,
  newRating: number,
  changedBy: string,       // "student" oder odertId
  timestamp: Timestamp
}
```

### 2.2 Kompetenz-Bewertungs-Seite

**Neue Datei**: `src/app/schueler/kompetenzen/page.tsx`

- Kompetenzen gruppiert nach Bereich (Medien, Informatik, Anwendungen)
- Akkordeon-Layout wie Lehrplan-Seite
- 5-Sterne-Bewertung pro Kompetenz
- Nur Kompetenzen der eigenen Klassenstufe anzeigen
- Echtzeit-Speicherung bei Änderung

### 2.3 Stern-Bewertungs-Komponente

**Neue Datei**: `src/components/StarRating.tsx`

```typescript
interface StarRatingProps {
  value: number;           // 0-5
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}
```

### 2.4 API-Endpunkte Phase 2

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/student-progress` | GET | Eigener Fortschritt (Schüler) |
| `/api/student-progress` | PUT | Bewertung speichern |
| `/api/student-progress/[studentId]` | GET | Fortschritt eines Schülers (Lehrer) |
| `/api/student-progress/[studentId]` | PUT | Lehrer-Kommentar hinzufügen |
| `/api/progress-history` | GET | Verlauf der Bewertungen |

### 2.5 Lehrer: Schüler-Übersicht

**Neue Datei**: `src/app/dashboard/schueler/page.tsx`

- Dropdown: Klasse auswählen
- Liste aller Schüler mit Fortschritts-Balken
- Klick auf Schüler → Detail-Ansicht
- Bulk-Bewertung möglich

### 2.6 Lehrer: Schüler-Detail

**Neue Datei**: `src/app/dashboard/schueler/[id]/page.tsx`

- Alle Bewertungen des Schülers
- Kommentare hinzufügen
- Direktes Bewerten durch Lehrer
- Verlauf anzeigen

---

## Phase 3: Themen-Verknüpfung

### 3.1 Neue Collection

**Collection**: `class_theme_progress`
```typescript
{
  id: string,
  classId: string,
  className: string,
  themeId: string,
  themeName: string,
  themeDescription: string,
  competencyIds: string[],     // Verknüpfte Kompetenzen
  competencyNames: string[],
  zeitraum: string,
  markedCompletedBy: string,   // Lehrer UID
  markedCompletedByName: string,
  markedCompletedAt: Timestamp,
  createdAt: Timestamp
}
```

### 3.2 Jahresplan: "Als bearbeitet markieren"

**Anpassung**: `src/components/KanbanBoard.tsx`

- Neuer Button im Thema-Dialog: "Für Klasse als bearbeitet markieren"
- Dialog: Klasse auswählen
- Speichert in `class_theme_progress`
- Visual Feedback: Häkchen bei bearbeiteten Themen

### 3.3 API-Endpunkte Phase 3

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/class-theme-progress` | GET | Bearbeitete Themen einer Klasse |
| `/api/class-theme-progress` | POST | Thema als bearbeitet markieren |
| `/api/class-theme-progress/[id]` | DELETE | Markierung entfernen |

### 3.4 Schüler: Bearbeitete Themen

**Neue Datei**: `src/app/schueler/themen/page.tsx`

- Liste der bearbeiteten Themen der eigenen Klasse
- Pro Thema: Verknüpfte Kompetenzen anzeigen
- Quick-Link zur Bewertung der Kompetenzen
- Zeitraum/Datum wann bearbeitet

### 3.5 Lehrer: Themen-Fortschritt

**Erweiterung**: `src/app/dashboard/klassen/[id]/page.tsx`

- Übersicht: Welche Themen wurden bearbeitet
- Statistik: X von Y Themen abgeschlossen
- Schnellzugriff zum Markieren weiterer Themen

---

## Phase 4: Badge-System (Gamification)

### 4.1 Neue Collections

**Collection**: `badges`
```typescript
{
  id: string,
  name: string,
  emoji: string,
  description: string,
  rarity: "common" | "rare" | "epic" | "legendary",
  color: string,
  criteria: {
    type: "competency_count" | "star_count" | "area_complete" | "streak" | "manual",
    threshold?: number,
    areaId?: string,
    minStars?: number
  },
  isSystem: boolean,        // true = automatisch, false = manuell
  createdBy?: string,       // Bei Custom Badges
  createdAt: Timestamp
}
```

**Collection**: `student_badges`
```typescript
{
  id: string,
  studentId: string,
  badgeId: string,
  badgeName: string,
  badgeEmoji: string,
  awardedAt: Timestamp,
  awardedBy: string,        // "system" oder odertId
  awardedByName?: string,
  reason?: string,
  notified: boolean
}
```

### 4.2 System-Badges (16 automatische)

| Badge | Emoji | Kriterium | Seltenheit |
|-------|-------|-----------|------------|
| Erste Schritte | 🎯 | 1 Kompetenz bewertet | Common |
| Bronze-Sammler | 🥉 | 10 Kompetenzen ≥3★ | Common |
| Silber-Sammler | 🥈 | 25 Kompetenzen ≥3★ | Rare |
| Gold-Sammler | 🥇 | 50 Kompetenzen ≥3★ | Epic |
| Perfektionist | ⭐ | 10 Kompetenzen = 5★ | Rare |
| Vollständigkeit | ✅ | Alle Kompetenzen bewertet | Epic |
| Medien-Experte | 📱 | Alle Medien ≥4★ | Epic |
| Informatik-Profi | 💻 | Alle Informatik ≥4★ | Epic |
| Anwendungs-Champion | 🎯 | Alle Anwendungen ≥4★ | Epic |
| Meister | 🏆 | Ein Bereich komplett ≥4★ | Legendary |
| 5-Sterne-Sammler | 🌟 | 5 Kompetenzen = 5★ | Common |
| Sternen-Profi | ✨ | 20 Kompetenzen = 5★ | Epic |
| Früher Vogel | 🌅 | Bewertung vor 8 Uhr | Rare |
| Wochenend-Lerner | 🎮 | 5 Bewertungen am Wochenende | Rare |
| Regelmässigkeit | 📅 | 7 Tage hintereinander aktiv | Epic |
| Themen-Held | 📚 | 5 Themen abgeschlossen | Rare |

### 4.3 Badge-Check-Logik

**Neue Datei**: `src/lib/badges/badge-checker.ts`

```typescript
export async function checkAndAwardBadges(studentId: string): Promise<Badge[]> {
  // Nach jeder Bewertungs-Änderung aufrufen
  // Prüft alle Kriterien
  // Vergibt neue Badges
  // Returned neu vergebene Badges für Notification
}
```

### 4.4 Schüler: Badge-Anzeige

**Erweiterung**: `src/app/schueler/dashboard/page.tsx`

- Badge-Showcase (Top 3 + "X weitere")
- Modal mit allen Badges (Erhalten / Gesperrt)
- Animation bei neuem Badge
- Fortschritts-Anzeige für gesperrte Badges

**Neue Komponente**: `src/components/BadgeShowcase.tsx`
**Neue Komponente**: `src/components/BadgeCollection.tsx`

### 4.5 Lehrer: Badge-Verwaltung

**Neue Datei**: `src/app/dashboard/badges/page.tsx`

- Alle System-Badges anzeigen
- Custom Badges erstellen
- Badge manuell an Schüler vergeben
- Kürzlich vergebene Badges

### 4.6 API-Endpunkte Phase 4

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/badges` | GET | Alle Badges |
| `/api/badges` | POST | Custom Badge erstellen (Lehrer) |
| `/api/badges/[id]` | PUT, DELETE | Badge bearbeiten/löschen |
| `/api/student-badges` | GET | Badges eines Schülers |
| `/api/student-badges` | POST | Badge vergeben |
| `/api/student-badges/check` | POST | Badge-Kriterien prüfen |

---

## Phase 5: Erweiterte Features

### 5.1 PDF-Export für Schüler

**Neue Datei**: `src/app/schueler/export/page.tsx`

- Kompetenz-Report als PDF
- Enthält: Name, Klasse, alle Bewertungen, Badges
- Schönes Layout mit Schul-Logo

### 5.2 Review-Workflow (Optional)

Schüler beantragt Höherstufung → Lehrer bestätigt/lehnt ab

**Collection**: `competency_reviews`
```typescript
{
  id: string,
  studentId: string,
  competencyId: string,
  oldRating: number,
  requestedRating: number,
  status: "pending" | "approved" | "rejected",
  reviewedBy?: string,
  reviewedAt?: Timestamp,
  feedback?: string,
  createdAt: Timestamp
}
```

### 5.3 Notifications für Schüler

Erweiterung des bestehenden Notification-Systems:
- Neues Badge erhalten
- Lehrer hat Kommentar hinzugefügt
- Review wurde beantwortet

### 5.4 Statistiken für Lehrer

**Neue Datei**: `src/app/dashboard/statistiken/page.tsx`

- Klassen-Vergleich
- Fortschritt über Zeit
- Meist/wenigst bewertete Kompetenzen
- Export als CSV/PDF

---

## Technische Details

### Ordnerstruktur (Neu)

```
src/
├── app/
│   ├── schueler/                    # NEU: Schüler-Bereich
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── kompetenzen/page.tsx
│   │   ├── themen/page.tsx
│   │   └── profil/page.tsx
│   ├── dashboard/
│   │   ├── klassen/                 # NEU
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── schueler/                # NEU
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── badges/page.tsx          # NEU
│   │   └── statistiken/page.tsx     # NEU
│   └── api/
│       ├── students/                # NEU
│       ├── classes/                 # NEU
│       ├── student-progress/        # NEU
│       ├── class-theme-progress/    # NEU
│       ├── badges/                  # NEU
│       └── student-badges/          # NEU
├── components/
│   ├── StudentProtectedRoute.tsx    # NEU
│   ├── StudentDashboardLayout.tsx   # NEU
│   ├── StarRating.tsx               # NEU
│   ├── BadgeShowcase.tsx            # NEU
│   ├── BadgeCollection.tsx          # NEU
│   └── ClassSelector.tsx            # NEU
├── lib/
│   ├── firestore/
│   │   ├── students.ts              # NEU
│   │   ├── classes.ts               # NEU
│   │   ├── student-progress.ts      # NEU
│   │   └── badges.ts                # NEU
│   └── badges/
│       └── badge-checker.ts         # NEU
└── types/
    └── index.ts                     # Erweitert
```

### Migration bestehender Daten

Keine Migration nötig - neue Collections werden parallel erstellt.

### Performance-Überlegungen

- Schüler-Progress als einzelnes Dokument (nicht pro Kompetenz)
- Badges werden gecacht im User-Objekt
- Lazy Loading für Badge-Collection Modal

---

## Zeitplan

| Phase | Inhalt | Geschätzte Dauer |
|-------|--------|------------------|
| **Phase 1** | Grundstruktur, Auth, Klassen | 1-2 Wochen |
| **Phase 2** | Kompetenzbewertung | 1-2 Wochen |
| **Phase 3** | Themen-Verknüpfung | 1 Woche |
| **Phase 4** | Badge-System | 1 Woche |
| **Phase 5** | Extras (optional) | 1 Woche |
| **Total** | | **4-7 Wochen** |

---

## Nächste Schritte (Phase 1 Start)

1. ✅ Plan erstellen
2. [ ] Types erweitern (`UserRole`, `Student`, `SchoolClass`)
3. [ ] Landing Page anpassen (Rollen-Auswahl)
4. [ ] Schüler-Login Seite erstellen
5. [ ] AuthContext erweitern
6. [ ] StudentProtectedRoute Komponente
7. [ ] StudentDashboardLayout Komponente
8. [ ] API: `/api/classes` CRUD
9. [ ] API: `/api/students` CRUD
10. [ ] Lehrer: Klassen-Management Seite
11. [ ] Schüler: Basis-Dashboard
12. [ ] Firestore Security Rules erweitern
