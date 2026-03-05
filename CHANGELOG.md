# Änderungsprotokoll

Alle wichtigen Änderungen an der MIA-App werden hier dokumentiert.

## [2026-03] - Airtable API-Limit Fixes & Performance

### Behoben
- **Login nicht mehr durch Airtable API-Limits blockiert**: Schulen werden aus Firestore-Cache geladen statt direkt aus Airtable
- **Jahresplan MIA nicht mehr durch API-Limits blockiert**: Themen und Kompetenzen nutzen Firestore-Cache
- **Lehrplan-Kompetenzen nutzen Firestore-Cache**: Keine direkten Airtable-Calls mehr für Kompetenzen-Seite
- **Lehrmittel-Bilder permanent in Firebase Storage**: Bilder werden beim Sync von Airtable nach Firebase Storage kopiert, damit sie nicht nach ~2h ablaufen
- **Expired Airtable Image URLs**: Sync überschreibt keine bestehenden Firebase Storage URLs mehr mit temporären Airtable URLs
- **Reliable Image Sync**: Fire-and-forget Pattern durch await ersetzt, Vercel beendet Function nicht mehr vorzeitig
- **Theme-Löschung erweitert**: Custom Themes können korrekt gelöscht werden, automatischer Sync nach Löschung entfernt

### Hinzugefügt
- **Bilder-Sync Endpoint** (`/api/admin/sync-images`): Dedizierter Endpoint für Bilder-Synchronisation mit Status-Anzeige
- **Bilder-Sync Card** auf Admin Sync-Seite: Zeigt Status (Firebase Storage vs. Airtable), separater Sync-Button
- **Step 5 "Bilder"** im Sync-Flow: Bilder werden automatisch als 5. Schritt im normalen Sync mitverarbeitet
- **maxDuration=300s** auf allen Sync-Endpoints für ausreichend Zeit auf Vercel

### Geändert
- **TypeScript gepinnt auf 5.9.3**: Vermeidet Build-Fehler durch inkompatible neuere Versionen

## [2026-02] - Jahresplanung, Kollaboration & Datenschutz

### Hinzugefügt
- **Fächerübergreifende Jahresplanung**: Komplettes Planungstool mit Quartals- und Wochenansicht
- **LP21-Fachbereiche**: Einheiten mit Fachbereichen und Kompetenzbereichen aus dem Lehrplan 21
- **Manuelle Ferienverwaltung**: Schulferien pro Schuljahr anpassen, Preset-Ferien nach Kanton
- **MIA-Themen-Verknüpfung**: Jahresplanungs-Einheiten mit MIA-Themen verknüpfen
- **Beurteilungen mit KW-Zuordnung**: Mehrere formative/summative Beurteilungen pro Einheit, jeweils einer KW zugewiesen
- **PDF-Export Jahresplanung**: Quartals-, Wochen- und Jahresplanung als PDF mit Lehrperson und Klasse
- **Wochennavigation**: Vor/Zurück-Buttons in Wochenansicht
- **Schuljahr kopieren**: Einheiten aus beliebigem vergangenen Schuljahr (6 Jahre) übernehmen
- **Konfigurierbare Dashboard-Kacheln**: Lehrpersonen wählen ihre 12 verfügbaren Kacheln selbst
- **Hover-Tooltips**: Beurteilungsmarker in Quartalsübersicht zeigen Details bei Hover
- **LP21-Kompetenzfilter**: Filter für Kompetenzen in der Jahresplanung
- **Ferien-zu-Ferien Kacheln**: Quartale orientieren sich an Ferienzeiten
- **Kanban-Quartalsansicht**: Alternative Ansicht mit Fachbereich-Spalten
- **Kollaborative Jahresplanung**: Einheiten mit Kolleg:innen teilen, geteilte Einheiten anzeigen
- **Planungsteams**: Teams für gemeinsame Jahresplanung erstellen und verwalten
- **Schul-Dateien mit Einheiten verknüpfen**: Dateien können auch mit Jahresplanungs-Einheiten verlinkt werden
- **Datenschutz-Audit revDSG**: Compliance-Verbesserungen für Schweizer Datenschutzgesetz
- **Elterneinwilligungs-Vorlage**: Link in Schülererfassung und Datenschutzseite
- **Startseite überarbeitet**: Neues Design mit Feature-Übersicht
- **FAQ Bild/GIF-Upload**: FAQ-Antworten können Bilder und GIFs enthalten

### Geändert
- **Jahresplan MIA**: Umbenennung im Menü und Dashboard für Klarheit
- **Klassenbezeichnung im PDF**: DisplayName aus Meine Klassen statt nur Stufe
- **Repo-Struktur bereinigt**: Veraltete Dokumente entfernt

## [2026-01] - Kompetenzenpass, Schul-Dateien & FAQ

### Hinzugefügt
- **Kompetenzenpass**: Schüler-Selbstbewertung (1-3 Sterne) mit Lehrer-Bestätigung
- **Kompetenz-Indikatoren**: Verständliche Beschreibungen für jede Stern-Stufe
- **Schüler-Artefakte**: Belege (Bilder, PDFs, Links) für Kompetenzen hochladen
- **Schul-Dateien**: Dateien schulintern teilen mit Drag & Drop Upload
- **Themen-Verknüpfungen**: Dateien mit Themen verknüpfen, Anzeige im Themen-Dialog
- **FAQ-Seite**: Häufig gestellte Fragen mit Kategorien und Suchfunktion
- **FAQ-Verwaltung**: Admin-Interface zum Erstellen, Bearbeiten, Löschen von FAQ-Einträgen
- **Schulverwaltung**: Super-Admins können Schulen erstellen und PICTS-Links bearbeiten
- **Erweitertes Lehrerprofil**: Schule und Kanton im Dashboard bearbeitbar
- **DiceBear Avatare**: Schüler können personalisierte Avatare erstellen (6 Stile)
- **PDF-Export mit @react-pdf/renderer**: Verbesserter Kompetenzenpass-Export mit Logo, Avatar, SVG-Sternen
- **Badge-System**: Lehrpersonen können eigene Badges erstellen und an Schüler vergeben
- **Klickbare Dashboard-Kacheln**: Schüler-Dashboard navigiert direkt zu den Bereichen

### Geändert
- **Gruppierte Menüstruktur**: Sidebar mit übersichtlichen Kategorien (Übersicht, Unterricht, Eigene Inhalte, Kompetenzenpass, Hilfe, Admin)
- **Scrollbare Dialoge**: Dialoge auf kleinen Bildschirmen jetzt scrollbar
- **Lehrmittel-Sortierung**: Themen innerhalb der Lehrmittel alphabetisch sortiert
- **SVG-Favicon**: Neues Icon im Code-Klammern-Design

## [2024-12] - Erstveröffentlichung mit Custom Themes

### Hinzugefügt
- **Lehrer-Authentifizierung**: Firebase Authentication mit E-Mail/Passwort
- **Jahresplan Kanban-Board**: 6 Zeiträume mit saisonalen Roboter-Bildern
- **Klickbare Kompetenzen**: Detail-Dialoge mit LP-Codes und Unterrichtsideen
- **Lektionsplanung**: Strukturierte Darstellung mit PDF- und Markdown-Export
- **Lehrmittel-Übersicht**: Akkordeon-Layout gruppiert nach Lehrmittel
- **Lehrplan-Kompetenzen Seite**: Kachel-Layout mit klickbaren Unterrichtsideen
- **Custom Themes**: Lehrpersonen können eigene Themen mit Lektionsplanung erstellen
- **Inline-Lektionen Editor**: Lektionen direkt beim Thema erstellen im Akkordeon
- **Admin Review Workflow**: PICTS-Admins können Themen freigeben oder ablehnen
- **In-App Notifications**: Bell-Icon mit Badge für Review-Status
- **Rollen-System**: teacher, picts_admin, super_admin mit Berechtigungen
- **Hybrid Airtable-Firestore Architektur**: 5-7x schnellere Ladezeiten durch Cache
- **Collapsible Sidebar Navigation**: Ein-/ausklappbar mit localStorage-Speicherung
- **Firebase Storage Integration**: Bild-Upload mit Drag & Drop (max 10MB)
- **Firebase Security Rules**: Firestore und Storage Regeln für Zugriffskontrolle
