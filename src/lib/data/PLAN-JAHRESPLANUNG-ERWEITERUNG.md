# Jahresplanung-Modul: Erweiterung der MIA-App

## Projektübersicht

Die bestehende MIA-App (https://github.com/baenni-coder/MIA-App) soll um ein **Jahresplanungstool** erweitert werden, das Lehrpersonen eine strukturierte Planung über alle Fachbereiche des Lehrplan 21 ermöglicht – nicht nur für Informatische Bildung, sondern für den gesamten Unterricht.

### Bestehendes Projekt
- **Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Firebase (Auth, Firestore, Storage), Airtable
- **Hosting:** Vercel (mia-app-peach.vercel.app)
- **Auth:** Firebase Auth mit Rollen (teacher, picts_admin, super_admin)
- **Bestehende Features:** Kanban-Board für MIA-Jahresplan, LP21-Kompetenzen (Informatische Bildung via Airtable), Custom Themes, Lektionsplanung, Schulverwaltung

### Ziel
Ein neues Modul "Jahresplanung" neben dem bestehenden MIA-Jahresplan, das alle Fachbereiche abdeckt und eine Zoom-Funktion (Jahr → Quartal → Woche) bietet.

---

## Phase 1: Jahresplanung-Grundstruktur

### 1.1 Neue Firestore-Collection `jahresplanung`

```typescript
interface JahresplanEinheit {
  id: string;
  teacherId: string;          // Firebase UID
  schuljahr: string;          // z.B. "2025/2026"
  fachbereichId: string;      // z.B. "D", "MA", "NMG" (aus lehrplan21-fachbereiche.json)
  titel: string;              // z.B. "Märchen lesen und schreiben"
  lernziele: string;          // Freitext
  kompetenzenIds: string[];   // LP21-Kompetenz-IDs, z.B. ["D.2.B", "D.4.B"]
  zeitraumStart: number;      // Kalenderwoche Start (1-52)
  zeitraumEnde: number;       // Kalenderwoche Ende (1-52)
  quartal: number;            // 1-4 (automatisch berechnet aus KW)
  status: 'geplant' | 'durchgefuehrt' | 'reflektiert';
  notizen: string;            // Reflexionsnotizen
  beurteilungstyp: 'keine' | 'formativ' | 'summativ';
  beurteilungsNotiz: string;  // Details zur Beurteilung
  materialien: string[];      // Links, Lehrmittelseiten etc.
  istPufferwoche: boolean;    // Markierung als Pufferwoche
  farbe: string;              // Wird vom Fachbereich übernommen
  sortOrder: number;          // Reihenfolge innerhalb einer Woche
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.2 Neue Firestore-Collection `schulferien_custom`

Für benutzerdefinierte Ferienanpassungen:

```typescript
interface SchulferienCustom {
  id: string;
  teacherId: string;       // oder schuleId für schulweite Ferien
  schuljahr: string;
  ferienName: string;      // z.B. "Herbstferien"
  start: string;           // ISO-Datum
  ende: string;            // ISO-Datum
  isCustom: boolean;       // true = manuell angepasst
  createdAt: Timestamp;
}
```

### 1.3 Neue Routen und Seiten

```
/dashboard/jahresplanung                 → Hauptansicht (Jahresübersicht)
/dashboard/jahresplanung/quartal/[q]     → Quartalsansicht
/dashboard/jahresplanung/woche/[kw]      → Wochenansicht
/dashboard/jahresplanung/einheit/[id]    → Detail/Bearbeitungsformular
/dashboard/jahresplanung/ferien          → Ferienverwaltung
```

### 1.4 Jahresansicht-Komponente

Die Jahresansicht zeigt 4 Spalten (Quartale) mit:
- Farbcodierte Blöcke pro Fachbereich
- Graue Blöcke für Ferienwochen (automatisch aus schulkalender.json, anpassbar)
- Klick auf Quartal → navigiert zur Quartalsansicht
- Klick auf Block → öffnet Bearbeitungsdialog
- "Neue Einheit erstellen"-Button pro Quartal

**Didaktische Grundlage:** Die Jahresansicht soll auf einen Blick zeigen, ob die Verteilung der Fächer und Kompetenzen über das Jahr ausgewogen ist (Spiralprinzip sichtbar machen).

### 1.5 Quartalsansicht

Zeigt die einzelnen Schulwochen des Quartals als Zeilen:
- Pro Zeile: Kalenderwoche, Datum (Mo–Fr), zugeordnete Einheiten
- Ferienwochen grau hinterlegt, nicht bearbeitbar
- Beurteilungs-Marker (⬤ formativ, ◆ summativ) sichtbar
- Warnung bei Häufung (z.B. >2 summative in einer Woche)
- Pufferwochen visuell gekennzeichnet

### 1.6 Wochenansicht

Detailansicht einer einzelnen Woche:
- Stundenraster (optional, basierend auf Lektionentafel Kanton SO)
- Zugeordnete Einheiten mit Lernzielen, Materialien
- Reflexionsfeld (Textfeld für Notizen)
- Status-Toggle: geplant → durchgeführt → reflektiert

### 1.7 Statische Datendateien

Folgende JSON-Dateien werden im Projekt unter `src/lib/data/` abgelegt:

1. **`schulkalender.json`** – Feriendaten BeLoSe + Solothurn + Custom-Template (beigelegt)
2. **`lehrplan21-fachbereiche.json`** – Alle Fachbereiche mit Kompetenzbereichen und Kompetenzen (beigelegt)

---

## Phase 2: LP21-Kompetenz-Integration

### 2.1 Kompetenzen-Picker-Komponente

Wiederverwendbare Komponente `KompetenzPicker.tsx`:

1. Dropdown: Fachbereich auswählen (Deutsch, Mathematik, NMG, ...)
2. Dropdown: Kompetenzbereich auswählen (z.B. D.2 Lesen)
3. Checkbox-Liste: Konkrete Kompetenzen auswählen (z.B. D.2.B.1 Verstehen von Sachtexten)
4. Ausgewählte Kompetenzen als Tags/Badges anzeigen

Die Daten kommen aus `lehrplan21-fachbereiche.json`. Für Informatische Bildung (MI) können optional die bestehenden Airtable-Kompetenzen genutzt werden.

### 2.2 Kompetenz-Abdeckungsübersicht

Eine Übersicht, die pro Fachbereich zeigt, welche Kompetenzbereiche im Schuljahr abgedeckt sind:
- Grün = Kompetenz zugeordnet und durchgeführt
- Gelb = Kompetenz zugeordnet, noch geplant
- Rot = Kompetenz nicht zugeordnet
- Dies macht das Spiralprinzip sichtbar

---

## Phase 3: Beurteilungsplanung & Reflexion

### 3.1 Beurteilungs-Overlay

In der Jahres- und Quartalsansicht:
- Marker für formative (●) und summative (◆) Beurteilungen
- Kalenderansicht: Wochen mit Beurteilungen hervorheben
- Warnung: "Achtung: In KW 12 sind 3 summative Beurteilungen geplant"

### 3.2 Reflexionsfelder

Pro Woche ein Textfeld mit:
- Freitext für Reflexion
- Status-Toggle mit Farbwechsel:
  - 🔵 geplant (Standard)
  - 🟡 durchgeführt
  - 🟢 reflektiert

### 3.3 Pufferwochen

- Wochen können als "Pufferwoche" markiert werden
- Visuell anders dargestellt (gestrichelte Umrandung)
- Zweck: Vertiefung, Repetition, Projekte

---

## Phase 4: Sharing & Export

### 4.1 PDF-Export

Ähnlich wie bei der bestehenden Lektionsplanung (jsPDF bereits im Projekt):
- Jahresübersicht als PDF (Querformat, farbcodiert)
- Quartalsplan als PDF
- Wochenplan als PDF

### 4.2 Vorjahres-Vorlage

- Button "Vorjahr kopieren": Übernimmt alle Einheiten des vorherigen Schuljahres
- Status wird auf "geplant" zurückgesetzt
- Kalenderwoche-Zuordnung wird auf neue Feriendaten angepasst
- Lehrperson kann dann anpassen

### 4.3 Kollegiale Einsicht

- Toggle "Für Kolleg:innen freigeben" in der Jahresplanung
- Freigegebene Planungen sind für Lehrpersonen derselben Schule sichtbar (nur Lesen)
- Filtermöglichkeit: "Planungen meiner Kolleg:innen anzeigen"

---

## Technische Umsetzungshinweise

### Bestehende Patterns beibehalten

- **API-Routes:** Neue Endpunkte unter `src/app/api/jahresplanung/`
- **Firestore-Helpers:** Neue Datei `src/lib/firestore/jahresplanung.ts`
- **Komponenten:** Neue Komponenten unter `src/components/jahresplanung/`
- **Types:** Erweitere `src/types/index.ts` mit den neuen Interfaces

### Navigation erweitern

In `DashboardLayout.tsx` neuen Menüpunkt hinzufügen:
```
📅 Jahresplanung  (neben dem bestehenden "Jahresplan" für MIA)
```

### Firestore Security Rules erweitern

```
match /jahresplanung/{docId} {
  allow read: if request.auth != null && 
    (resource.data.teacherId == request.auth.uid || 
     resource.data.isShared == true);
  allow write: if request.auth != null && 
    resource.data.teacherId == request.auth.uid;
}

match /schulferien_custom/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    resource.data.teacherId == request.auth.uid;
}
```

### Empfohlene Reihenfolge der Implementierung

1. JSON-Datendateien ins Projekt kopieren (`src/lib/data/`)
2. TypeScript-Types definieren
3. Firestore-Helper-Funktionen erstellen
4. API-Routes erstellen
5. KompetenzPicker-Komponente bauen
6. Jahresansicht (Hauptseite) bauen
7. Quartalsansicht bauen
8. Wochenansicht bauen
9. Einheit-Formular (erstellen/bearbeiten)
10. Ferienverwaltung
11. Navigation erweitern
12. Firestore Rules anpassen
13. PDF-Export
14. Vorjahres-Kopie
15. Kollegiale Freigabe

---

## Beigelieferte Dateien

1. **`schulkalender.json`** – Feriendaten für BeLoSe und Solothurn (SJ 2025/26 + 2026/27), Schweizer Feiertage, Quartal-Schema
2. **`lehrplan21-fachbereiche.json`** – Vollständige LP21-Fachbereichsstruktur mit allen Kompetenzbereichen und Kompetenzen für Zyklus 1+2 (Deutsch, Französisch, Englisch, Mathematik, NMG, BG, TTG, Musik, Bewegung und Sport, Informatische Bildung), inkl. überfachliche Kompetenzen und Farbcodes
