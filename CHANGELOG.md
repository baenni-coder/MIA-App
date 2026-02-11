# Änderungsprotokoll

Alle wichtigen Änderungen an der MIA-App werden hier dokumentiert.

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
