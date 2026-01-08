# Umsetzungsplan: Kompetenzenpass-Erweiterung

## Übersicht

Drei neue Features für den Kompetenzenpass:
1. **Lehrer-Bestätigung** - Schülerbewertungen müssen bestätigt werden
2. **Indikatoren** - Kindgerechte Beschreibungen pro Kompetenz und Stern
3. **Artefakte** - Belege für Fortschritte (Bilder, PDFs, Links)

---

## Feature 1: Lehrer-Bestätigung

### Anforderungen
- Schüler sieht Bewertung erst nach Bestätigung
- Lehrer kann Bewertung bestätigen oder anpassen
- Benachrichtigung bei Bestätigung/Anpassung

### Datenmodell

**Collection: `pending_ratings`**
```typescript
interface PendingRating {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  competencyId: string;
  competencyName: string;
  studentRating: number;        // Vom Schüler vorgeschlagen
  status: "pending" | "confirmed" | "adjusted";
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewedByName?: string;
  teacherRating?: number;       // Falls angepasst
}
```

**Erweiterung `StudentProgress`:**
- `confirmedRatings`: Nur bestätigte Bewertungen
- `pendingRatings`: Noch nicht bestätigte (für Schüler sichtbar als "wartend")

### Implementierung

#### Backend
- [ ] Types erweitern (`src/types/index.ts`)
- [ ] `src/lib/firestore/pending-ratings.ts` erstellen
- [ ] `src/app/api/pending-ratings/route.ts` (GET, POST)
- [ ] `src/app/api/pending-ratings/[id]/route.ts` (PUT für confirm/adjust)
- [ ] `src/app/api/student-progress/route.ts` anpassen (pending statt direkt)

#### Frontend Schüler
- [ ] Bewertungs-Dialog: "Zur Bestätigung eingereicht" Status
- [ ] Badge "Warten auf Bestätigung" bei pending Ratings
- [ ] Unterscheidung bestätigt vs. pending in der Anzeige

#### Frontend Lehrer
- [ ] Neuer Tab "Offene Bestätigungen" in Klassen-Ansicht
- [ ] Bestätigungs-Dialog mit Schüler-Vorschlag
- [ ] Möglichkeit zur Anpassung
- [ ] Batch-Bestätigung mehrerer Ratings

---

## Feature 2: Indikatoren

### Anforderungen
- Indikatoren pro Kompetenz unterschiedlich
- Lehrer können eigene Indikatoren erstellen
- PICTS-Admin kann sie systemweit freischalten

### Datenmodell

**Collection: `competency_indicators`**
```typescript
interface CompetencyIndicator {
  id: string;
  competencyId: string;
  competencyName: string;
  indicators: {
    star1: string;  // z.B. "Ich habe davon gehört"
    star2: string;  // z.B. "Ich kann es mit Hilfe"
    star3: string;  // z.B. "Ich kann es selbständig"
    star4: string;  // z.B. "Ich kann es gut erklären"
    star5: string;  // z.B. "Ich bin Experte darin"
  };
  isSystemWide: boolean;        // true = für alle sichtbar
  schoolId?: string;            // Bei schulspezifischen
  createdBy: string;
  createdByName: string;
  approvedBy?: string;          // PICTS-Admin der freigeschaltet hat
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Implementierung

#### Backend
- [ ] Types erweitern (`src/types/index.ts`)
- [ ] `src/lib/firestore/competency-indicators.ts` erstellen
- [ ] `src/app/api/competency-indicators/route.ts` (GET, POST)
- [ ] `src/app/api/competency-indicators/[id]/route.ts` (PUT, DELETE)
- [ ] `src/app/api/competency-indicators/[id]/approve/route.ts` (PICTS-Admin)

#### Frontend Schüler
- [ ] Indikatoren im Bewertungs-Dialog anzeigen
- [ ] Hover/Tooltip bei Sternen zeigt Indikator

#### Frontend Lehrer
- [ ] Neue Seite: `/lehrer/indikatoren`
- [ ] Indikatoren pro Kompetenz erstellen/bearbeiten
- [ ] Status: Entwurf / Systemweit

#### Frontend Admin
- [ ] Indikatoren-Freigabe in Admin-Dashboard

---

## Feature 3: Artefakte

### Anforderungen
- Erlaubt: Bilder, PDFs, Links
- Max. Dateigrösse: 20MB
- Lehrer kann kommentieren/bewerten
- Verknüpfung mit Themen möglich

### Datenmodell

**Collection: `student_artifacts`**
```typescript
interface StudentArtifact {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  competencyId: string;
  competencyName: string;
  linkedThemeIds?: string[];
  linkedThemeNames?: string[];
  type: "image" | "pdf" | "link";
  title: string;
  description?: string;
  // Für Dateien (image, pdf):
  storagePath?: string;
  storageUrl?: string;
  contentType?: string;
  size?: number;
  // Für Links:
  url?: string;
  // Lehrer-Feedback:
  teacherComment?: string;
  teacherCommentBy?: string;
  teacherCommentByName?: string;
  teacherCommentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Firebase Storage Struktur
```
student-artifacts/
  └── {classId}/
      └── {studentId}/
          └── {timestamp}-{filename}
```

### Implementierung

#### Backend
- [ ] Types erweitern (`src/types/index.ts`)
- [ ] `src/lib/firestore/student-artifacts.ts` erstellen
- [ ] `src/lib/storage/student-artifacts.ts` erstellen
- [ ] `src/app/api/student-artifacts/route.ts` (GET, POST)
- [ ] `src/app/api/student-artifacts/[id]/route.ts` (GET, PUT, DELETE)
- [ ] `src/app/api/student-artifacts/[id]/comment/route.ts` (Lehrer-Kommentar)
- [ ] `storage.rules` erweitern

#### Frontend Schüler
- [ ] `ArtifactUpload.tsx` Komponente
- [ ] "Beleg hinzufügen" Button bei Kompetenz
- [ ] Artefakt-Galerie im Kompetenz-Dialog
- [ ] Neue Seite: `/schueler/artefakte` (Übersicht)

#### Frontend Lehrer
- [ ] Artefakte in Schüler-Detail-Ansicht
- [ ] Kommentar-Funktion
- [ ] Filter nach Kompetenz/Thema

---

## Umsetzungsreihenfolge

### Phase 1: Lehrer-Bestätigung (Priorität: Hoch)
Grundlage für das Bewertungssystem

### Phase 2: Indikatoren (Priorität: Mittel)
Verbessert das Verständnis für Schüler

### Phase 3: Artefakte (Priorität: Mittel)
Ermöglicht Dokumentation der Fortschritte

---

## Aktueller Status

- [x] Plan erstellt
- [ ] Phase 1: Lehrer-Bestätigung
- [ ] Phase 2: Indikatoren
- [ ] Phase 3: Artefakte
