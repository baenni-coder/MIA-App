# Planungsdokument: Jahresplanung-Erweiterungen (Lehrer-Feedback)

## Übersicht der Features

| # | Feature | Komplexität | Abhängigkeiten |
|---|---------|-------------|----------------|
| 1 | Hover-Tooltips Beurteilungsmarker | Einfach | - | ✅ Erledigt |
| 2 | Klassenbezeichnung im PDF | Mittel | Feature 3 |
| 3 | Kollaborative Jahresplanung (Unterrichtsteams) | Hoch | - |
| 4 | Fächergruppierung + Kanban-Spalten in Quartalsansicht | Hoch | Feature 5 |
| 5 | Ferien-zu-Ferien Kacheln (Q2 aufteilen) | Mittel | - |
| 6 | LP21-Kompetenzfilter nach Fachbereich | Einfach | - |
| 7 | Material-Upload mit Schul-Dateien-Verknüpfung | Mittel | - |

---

## Feature 5: Ferien-zu-Ferien Kacheln

**Problem:** Die Lehrpersonen planen von Ferien zu Ferien. Q2 (Herbst–Weihnachten) und Q3 (Weihnachten–Frühling) sind zu grob. Der Zeitraum Weihnachten–Sportferien gehört gemäss Lehrpersonen zu Q2, nicht zu Q3.

**Ist-Zustand:** 4 fixe Quartale (Q1-Q4) in `schulkalender.json`:
- Q1: Sommer → Herbstferien (KW 33–39)
- Q2: Herbstferien → Weihnachtsferien (KW 42–51)
- Q3: Weihnachtsferien → Frühlingsferien (KW 2–14)
- Q4: Frühlingsferien → Sommerferien (KW 17–27)

**Soll-Zustand:** 5 Planungsperioden, wobei Q2 aus 2 Teilen besteht:
- Q1: Sommerferien → Herbstferien (KW 33–39)
- Q2a: Herbstferien → Weihnachtsferien (KW 42–51)
- Q2b: Weihnachtsferien → Sportferien (KW 2–~7)
- Q3: Sportferien → Frühlingsferien (KW ~10–14)
- Q4: Frühlingsferien → Sommerferien (KW 17–27)

**Umsetzungsschritte:**

1. **`schulkalender.json` erweitern** – 5 Perioden statt 4:
   - Neues Schema mit `perioden` statt starrer Quartale
   - Jede Periode hat: `id`, `quartal` (1-4), `teil` (optional "a"/"b"), `label`, `typischeWochen`
   - Q2 bekommt zwei Perioden, beide mit `quartal: 2`

2. **`QuartalSchema`-Type erweitern** (`types/index.ts`):
   ```typescript
   export interface PlanungsPeriode {
     id: string;           // z.B. "q2a", "q2b"
     quartal: number;      // 1-4 (Q2a und Q2b haben beide quartal=2)
     teil?: string;        // "a" oder "b" (nur bei Q2)
     label: string;        // z.B. "Herbst – Weihnachten"
     typischeWochen: string;
     beschreibung: string;
   }
   ```

3. **`lp21-data.ts` anpassen**:
   - Neue Funktion `getPlanungsperioden()` → gibt 5 Perioden zurück
   - `getSchulwochenFuerSchuljahr()` bekommt die Sportferien-Grenze über die Custom-Ferien (oder Default-Werte)
   - Woche-zu-Periode-Mapping dynamisch berechnen (basierend auf tatsächlichen Ferien)

4. **Dashboard-Kacheln anpassen** (`jahresplanung/page.tsx`):
   - 5 Kacheln statt 4 (Q1, Q2a, Q2b, Q3, Q4)
   - Routing: `/dashboard/jahresplanung/quartal/q2a`, `/quartal/q2b`
   - Einheiten korrekt zuordnen (basierend auf `zeitraumStart` KW)

5. **Quartalsansicht anpassen** (`quartal/[q]/page.tsx`):
   - Parameter `q` kann jetzt "1", "2a", "2b", "3", "4" sein
   - Wochen-Filter anpassen

6. **Migration bestehender Daten:**
   - `quartal: 2`-Einheiten bleiben kompatibel (werden anhand KW zugeordnet)
   - `quartal: 3`-Einheiten mit KW 2-7 werden zu Q2b zugeordnet
   - Keine Datenbank-Migration nötig, da die Zuordnung zur Laufzeit über KW erfolgt

**Risiko:** Mittel – ändert die grundlegende Periodenstruktur, aber bestehende Daten bleiben kompatibel, da die KW-Zuordnung dynamisch erfolgt.

---

## Feature 4: Fächergruppierung + Kanban-Spalten in Quartalsansicht

**Problem:** Die aktuelle Quartalsansicht zeigt Wochen als Zeilen mit allen Einheiten inline. Lehrpersonen wünschen sich eine Kanban-ähnliche Darstellung mit Spalten pro Fach.

**Ist-Zustand:** Wochenbasiertes Raster – jede Woche eine Zeile, Einheiten als farbige Chips.

**Soll-Zustand:** Kanban-Layout mit Fachbereich-Spalten:
```
| Deutsch         | Mathematik      | NMG            | MI              |
|-----------------|-----------------|----------------|-----------------|
| [Erzählen +]    | [Addition  +]   |                | [Robotik   +]   |
| KW 42-45        | KW 42-48        |                | KW 44-46        |
|                 |                 | [Wetter   +]   |                 |
|                 |                 | KW 46-50       |                 |
```

**Umsetzungsschritte:**

1. **Neues Layout-Konzept für Quartalsansicht:**
   - Spalten = Fachbereiche (nur solche, die Einheiten haben + leere Spalte für neue)
   - Zeilen = Kalenderwochen (als Y-Achse im Hintergrund)
   - Einheiten als Karten, die sich über ihre KW-Spanne erstrecken
   - **Fallback:** Bisherige Listenansicht als Umschalt-Option behalten ("Listenansicht" / "Kanban-Ansicht")

2. **Kanban-Spalten-Komponente** (neue Datei `KanbanQuartal.tsx`):
   - Eingabe: `einheiten`, `quartalWochen`, `fachbereiche`
   - Dynamische Spalten basierend auf vorhandenen Fachbereichen
   - Plus-Button pro Spalte → erstellt Einheit mit vorausgewähltem Fachbereich
   - Vertikale KW-Skala als Referenzraster

3. **Einheiten-Karten:**
   - Zeigen Titel, KW-Spanne, Status-Badge
   - Beurteilungsmarker (Kreis/Raute) innerhalb der Karte
   - Klickbar → öffnet Einheit-Detail
   - Höhe proportional zur KW-Spanne (visuell)

4. **Plus-Button pro Fachbereich:**
   - Link zu `/jahresplanung/einheit/neu?fachbereichId=XX&quartal=Y`
   - Fachbereich im Formular vorausgewählt

5. **Responsive:**
   - Desktop: Spaltenansicht
   - Mobile: Zurück zur Listenansicht oder horizontal scrollbar

**Abhängigkeit:** Sollte nach Feature 5 (Ferien-zu-Ferien) umgesetzt werden, damit die Perioden korrekt sind.

**Risiko:** Hoch – vollständig neues Layout, erfordert sorgfältige UX-Planung.

---

## Feature 3: Kollaborative Jahresplanung (Unterrichtsteams)

**Problem:** Lehrpersonen arbeiten in Unterrichtsteams und möchten gemeinsam planen. Aktuell ist jede Jahresplanung einer Person zugeordnet.

**Ist-Zustand:**
- Jede Einheit hat `userId` (Owner) und `isShared` (boolean, global sichtbar)
- Kein `schuleId`-Feld in Einheiten
- Keine Differenzierung zwischen "ich teile mit meiner Schule" und "alle können lesen"

**Soll-Zustand:** Unterrichtsteams können gemeinsam an einer Jahresplanung arbeiten:
- Lehrpersonen können ihre Planung gezielt mit Kolleg:innen teilen
- Geteilte Einheiten sind bearbeitbar (nicht nur lesbar)
- Jedes Mitglied sieht den gleichen Stand

**Umsetzungs-Option A: Geteilte Einheiten (einfacher)**
Team-Mitglieder können Einheiten lesen UND bearbeiten:

1. **Datenmodell erweitern:**
   ```typescript
   // In JahresplanEinheit:
   schuleId: string;              // Schule der Einheit
   sharedWith: string[];          // Array von User-IDs mit Schreibzugriff
   // isShared bleibt: boolean für "gesamte Schule lesen"
   ```

2. **Berechtigungsmodell:**
   - **Owner** (`userId`): Voller Zugriff, kann Einheit löschen und Sharing verwalten
   - **Shared Users** (`sharedWith[]`): Können lesen UND bearbeiten, aber nicht löschen/Sharing ändern
   - **Schul-Mitglieder** (wenn `isShared=true`): Nur Lesen (wie bisher, aber schulbegrenzt)

3. **API-Anpassungen:**
   - `GET /api/jahresplanung`: Auch Einheiten laden, wo `sharedWith` den User enthält
   - `PUT /api/jahresplanung/[id]`: Bearbeitung erlauben wenn User in `sharedWith`
   - Neuer Endpunkt: `PUT /api/jahresplanung/[id]/sharing` – Team-Mitglieder verwalten

4. **UI: Sharing-Dialog im Einheit-Formular:**
   - "Mit Kolleg:innen teilen"-Button
   - Dialog: Lehrer der gleichen Schule auflisten (via `/api/teachers?schuleId=X`)
   - Checkboxen zum Auswählen
   - Anzeige der aktuell geteilten Personen

**Umsetzungs-Option B: Team-Planung (umfassender)**
Gemeinsame Jahresplanung als eigenständiges Konzept:

1. **Neues Konzept "Planungs-Team":**
   ```typescript
   export interface PlanungsTeam {
     id: string;
     name: string;              // z.B. "Team 1./2. Klasse"
     schuleId: string;
     schuljahr: string;
     members: TeamMember[];     // Alle Team-Mitglieder
     createdBy: string;
     createdAt: Date;
   }

   export interface TeamMember {
     userId: string;
     name: string;
     role: "owner" | "editor";
   }
   ```

2. Einheiten gehören zu einem Team (statt zu einem User)
3. Alle Team-Mitglieder sehen und bearbeiten alle Einheiten
4. Team-Verwaltung als eigene Seite

**Empfehlung:** Start mit **Option A** (geteilte Einheiten), da:
- Weniger Datenmodell-Änderungen
- Rückwärtskompatibel
- Spätere Erweiterung zu Option B möglich
- Schneller umsetzbar

---

## Feature 2: Klassenbezeichnung im PDF

**Problem:** Im PDF steht nur "1. Klasse" statt z.B. "1. Klasse 1c".

**Ist-Zustand:**
- PDF bekommt `klasse` prop aus `userProfile.stufe` (z.B. "1. Klasse")
- "Meine Klassen" hat Klassen mit `name`/`displayName` (z.B. "1c")
- Keine Verknüpfung zwischen Klasse und Jahresplanung

**Umsetzungsschritte:**

1. **Klassenbezeichnung im Lehrer-Profil speichern** (einfachster Ansatz):
   - Neues Feld `klassenBezeichnung?: string` im Teacher-Profil
   - Im Dashboard editierbar (wie Stufe/Kanton)
   - PDF zeigt: `stufe + " " + klassenBezeichnung` (z.B. "1. Klasse 1c")
   - **Fallback:** Nur `stufe` wenn keine Bezeichnung gesetzt

2. **Alternativ: Aus "Meine Klassen" automatisch ableiten:**
   - Beim PDF-Export die aktive Klasse des Users laden
   - Problem: Ein User kann mehrere Klassen haben
   - Lösung: Dropdown im Export-Dialog "Für welche Klasse?"

3. **Im Kontext der Kollaboration (Feature 3):**
   - Wenn ein Team die Planung teilt, kann jeder User seine eigene Klasse wählen
   - PDF zeigt dann die Klasse des exportierenden Users

**Empfehlung:** Kombination aus 1 (Feld im Profil) und 2 (Klassen-Dropdown beim Export, wenn mehrere Klassen vorhanden).

---

## Feature 6: LP21-Kompetenzfilter nach Fachbereich

**Problem:** Im `KompetenzPicker` muss der Fachbereich nochmals manuell gewählt werden, obwohl er bereits im Formular ausgewählt wurde.

**Ist-Zustand:**
- `KompetenzPicker` hat einen eigenen Fachbereich-Dropdown (`selectedFachbereich`)
- Unabhängig vom Fachbereich im Einheit-Formular

**Umsetzungsschritte:**

1. **Prop `defaultFachbereich` an `KompetenzPicker` übergeben:**
   ```tsx
   <KompetenzPicker
     selectedKompetenzen={kompetenzenIds}
     onKompetenzenChange={(ids, namen) => { ... }}
     defaultFachbereich={fachbereichId}  // NEU
   />
   ```

2. **`KompetenzPicker` anpassen:**
   - Wenn `defaultFachbereich` gesetzt, automatisch als `selectedFachbereich` verwenden
   - Fachbereich-Dropdown wird vorausgewählt (aber änderbar)
   - Bei Änderung des Fachbereichs im Formular → `KompetenzPicker` aktualisieren

3. **Kein neues UI nötig** – nur Props-Verbindung und useEffect für Sync.

**Risiko:** Niedrig – reine UI-Verbesserung ohne Datenmodell-Änderung.

---

## Feature 7: Material-Upload mit Schul-Dateien-Verknüpfung

**Problem:** Materialien sind aktuell nur Textstrings. Lehrpersonen möchten Dateien direkt hochladen können.

**Ist-Zustand:**
- `materialien: string[]` – nur Namen/Beschreibungen als Text
- Schul-Dateien-Modul existiert (`/dashboard/dateien`) mit Upload, Speicherung in Firebase Storage
- Keine Verbindung zwischen Einheiten und Schul-Dateien

**Umsetzungsschritte:**

1. **Datenmodell erweitern:**
   ```typescript
   // In JahresplanEinheit:
   materialien: string[];              // Bestehend: Textuelle Materialien
   linkedFileIds?: string[];           // NEU: Verknüpfte Schul-Dateien IDs
   linkedFileNames?: string[];         // NEU: Dateinamen (für Anzeige)
   ```

2. **Einheit-Formular erweitern:**
   - Bestehende Material-Tags (Text) bleiben
   - Neuer Button: "Datei verknüpfen" → öffnet File-Picker-Dialog
   - Dialog zeigt eigene + Schul-Dateien (wie bereits im Dateien-Modul)
   - Optional: "Neue Datei hochladen" → nutzt `SchoolFileUpload`-Komponente
   - Verknüpfte Dateien werden als Chips mit Download-Icon angezeigt

3. **Bestehende `SchoolFileUpload`-Komponente wiederverwenden:**
   - Import und Integration in den Einheit-Editor
   - Nach Upload: Automatische Verknüpfung der Datei-ID mit der Einheit
   - Dateien werden automatisch als "school"-Freigabe erstellt

4. **Anzeige in Wochenansicht:**
   - Verknüpfte Dateien als Download-Links in der Einheit-Karte
   - Trennung: Textuelle Materialien vs. verknüpfte Dateien

**Risiko:** Mittel – nutzt bestehende Infrastruktur, aber braucht neue Verknüpfungslogik.

---

## Empfohlene Umsetzungsreihenfolge

| Priorität | Feature | Aufwand | Begründung |
|-----------|---------|---------|------------|
| 1 | Feature 6: LP21-Kompetenzfilter | Klein | Schnell, hoher UX-Gewinn |
| 2 | Feature 5: Ferien-zu-Ferien Kacheln | Mittel | Grundlage für Feature 4 |
| 3 | Feature 2: Klassenbezeichnung im PDF | Klein-Mittel | Schneller UX-Gewinn |
| 4 | Feature 7: Material-Upload | Mittel | Nutzt bestehende Infrastruktur |
| 5 | Feature 4: Kanban-Quartalsansicht | Hoch | Komplett neues Layout |
| 6 | Feature 3: Kollaborative Planung | Hoch | Grösste Architektur-Änderung |
