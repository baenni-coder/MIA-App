# Phase 1: Grundlagen - Abgeschlossen ✅

## Übersicht

Phase 1 hat die Grundlagen für das Custom-Themen-Feature implementiert:
- Datenmodelle & TypeScript Interfaces
- Firestore Helper-Funktionen (CRUD)
- Permission-System
- Firebase Storage Integration
- Security Rules

## Was wurde implementiert?

### 1. TypeScript Interfaces (`src/types/index.ts`)

**Neue Types:**
- `UserRole`: "teacher" | "picts_admin" | "super_admin"
- `ThemeStatus`: "draft" | "pending_review" | "approved" | "rejected"
- `NotificationType`: "theme_submitted" | "theme_approved" | "theme_rejected" | "theme_updated"

**Neue Interfaces:**
- `CustomTheme`: Benutzerdefinierte Themen
- `CustomLektion`: Lektionsplanung für Custom Themen
- `Notification`: In-App Benachrichtigungen

**Erweitert:**
- `Teacher.role`: Jetzt mit UserRole-Feld

### 2. Firestore Helper-Funktionen

#### **Custom Themes** (`src/lib/firestore/custom-themes.ts`)
- `createCustomTheme()`: Erstellt neues Thema
- `getCustomThemeById()`: Lädt Thema nach ID
- `getCustomThemes()`: Lädt Themen mit Filtern
- `updateCustomTheme()`: Aktualisiert Thema
- `deleteCustomTheme()`: Löscht Thema
- `updateThemeStatus()`: Ändert Status (für Review)
- `getCustomThemesByStufe()`: Lädt Themen nach Klassenstufe

#### **Custom Lektionen** (`src/lib/firestore/custom-lektionen.ts`)
- `createCustomLektion()`: Erstellt Lektion
- `getCustomLektionById()`: Lädt Lektion nach ID
- `getCustomLektionenByThemeId()`: Lädt alle Lektionen eines Themas
- `updateCustomLektion()`: Aktualisiert Lektion
- `deleteCustomLektion()`: Löscht Lektion
- `deleteCustomLektionenByThemeId()`: Löscht alle Lektionen eines Themas
- `createMultipleCustomLektionen()`: Batch-Create

#### **Notifications** (`src/lib/firestore/notifications.ts`)
- `createNotification()`: Erstellt Notification
- `notifyPICTSAdmins()`: Benachrichtigt alle Admins einer Schule
- `getNotificationsByRecipient()`: Lädt Notifications eines Users
- `markNotificationAsRead()`: Markiert als gelesen
- `markAllNotificationsAsRead()`: Alle als gelesen
- `deleteNotification()`: Löscht Notification
- `getUnreadCount()`: Zählt ungelesene Notifications
- `notifyThemeSubmitted()`: Helper für Theme-Submission
- `notifyThemeApproved()`: Helper für Theme-Approval
- `notifyThemeRejected()`: Helper für Theme-Rejection

### 3. Permission System (`src/lib/firestore/permissions.ts`)

**Funktionen:**
- `getTeacherProfile()`: Lädt Teacher-Profil
- `hasRole()`: Prüft Rolle
- `isPICTSAdmin()`: Prüft PICTS-Admin
- `isSuperAdmin()`: Prüft Super-Admin
- `isPICTSAdminOfSchule()`: Prüft Admin einer Schule
- `canReadCustomTheme()`: Leseberechtigung
- `canEditCustomTheme()`: Bearbeitungsberechtigung
- `canDeleteCustomTheme()`: Löschberechtigung
- `canReviewCustomTheme()`: Review-Berechtigung

### 4. Firebase Storage (`src/lib/storage/upload.ts`)

**Funktionen:**
- `uploadImage()`: Lädt Bild hoch
- `deleteImage()`: Löscht Bild
- `extractPathFromUrl()`: Extrahiert Pfad aus URL
- `validateImage()`: Validiert Bild (Format, Größe)
- `generateImagePath()`: Generiert eindeutigen Pfad
- `compressImage()`: Komprimiert Bild (optional mit sharp)

**Validierung:**
- Erlaubte Formate: JPEG, PNG, WEBP
- Max. Größe: 10MB
- Automatische Kompression (wenn sharp installiert)

### 5. API Updates

#### **Teachers API** (`src/app/api/teachers/route.ts`)
- POST: Unterstützt jetzt `role`-Parameter
- PUT: Kann jetzt `role` aktualisieren (für Super-Admins)

### 6. Security Rules

#### **Firestore Rules** (`firestore.rules`)
- Teachers: Nur eigenes Profil lesen/schreiben
- Custom Themes: Ersteller + Admins der Schule
- Custom Lektionen: Ersteller + wer Theme lesen darf
- Notifications: Nur Empfänger

#### **Storage Rules** (`storage.rules`)
- Theme-Bilder: Nur eigener User hochladen
- Max 10MB, nur Bilder (JPEG, PNG, WEBP)
- Öffentlich lesbar

## Firestore Collections

### `custom_themes`
```
{
  thema: string
  beschreibung: string
  lehrmittel?: string
  bildLehrmittel?: string
  anzahlLektionen: number
  schuljahr: Stufe[]
  zeitraum: Zeitraum
  kompetenzenIds: string[]
  createdBy: string
  createdByName: string
  schuleId: string
  status: ThemeStatus
  isSystemWide: boolean
  reviewedBy?: string
  reviewedByName?: string
  reviewedAt?: Date
  reviewNotes?: string
  airtableId?: string
  createdAt: Date
  updatedAt: Date
}
```

### `custom_lektionen`
```
{
  themeId: string
  lektion: string
  eindeutigeBezeichnung: string
  aufgaben?: string
  vorwissen?: string
  material?: string[]
  websiteTools?: WebsiteTool[]
  einstieg?: string
  hauptteil?: string
  abschluss?: string
  stolpersteine?: string
  kiZusammenfassung?: string
  createdBy: string
  order: number
  createdAt: Date
  updatedAt: Date
}
```

### `notifications`
```
{
  recipientId: string
  recipientRole: UserRole
  type: NotificationType
  themeId: string
  themeTitle: string
  createdBy: string
  createdByName: string
  createdByEmail: string
  schuleId: string
  message: string
  actionUrl?: string
  read: boolean
  readAt?: Date
  createdAt: Date
}
```

## Nächste Schritte

### Phase 2: Lehrer-Funktionen
1. API Routes für Custom Themes
2. UI: Thema-Erstellungs-Formular
3. UI: Lektionen-Editor
4. UI: "Meine Themen" Seite
5. Jahresplan Integration

### Deployment-Schritte
1. Security Rules deployen:
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only storage:rules
   ```

2. Optional: sharp installieren für Bild-Kompression:
   ```bash
   npm install sharp
   ```

3. Firebase Storage Bucket konfigurieren (falls noch nicht geschehen)

4. Ersten Super-Admin in Firestore markieren:
   ```javascript
   // In Firebase Console oder via Script
   db.collection('teachers').doc(YOUR_USER_ID).update({
     role: 'super_admin'
   })
   ```

## Wichtige Hinweise

### Admin-Rollen
- **teacher**: Standard-Rolle, kann eigene Themen erstellen
- **picts_admin**: Kann Themen seiner Schule reviewen
- **super_admin**: Kann alles (Sie)

### Workflow
1. Lehrer erstellt Thema (status: "draft")
2. Lehrer reicht Thema ein (status: "pending_review")
3. PICTS-Admin reviewed (status: "approved" oder "rejected")
4. Bei "approved": isSystemWide = true → für alle sichtbar

### Berechtigungen
- Lehrer kann eigene Themen immer lesen/bearbeiten
- PICTS-Admin kann Themen seiner Schule lesen/reviewen
- Alle können freigegebene (isSystemWide) Themen lesen
- Lehrer kann auch freigegebene eigene Themen bearbeiten

## Testing

Nach Phase 1 sollten folgende Tests durchgeführt werden:
- [ ] Security Rules lokal testen
- [ ] Teacher-Profil mit role erstellen
- [ ] Ersten Super-Admin markieren
- [ ] Firestore Collections manuell testen
- [ ] Storage Upload testen

## Dateien erstellt/geändert

**Neu erstellt:**
- `src/lib/firestore/custom-themes.ts`
- `src/lib/firestore/custom-lektionen.ts`
- `src/lib/firestore/notifications.ts`
- `src/lib/firestore/permissions.ts`
- `src/lib/storage/upload.ts`
- `firestore.rules`
- `storage.rules`
- `PHASE_1_DOCUMENTATION.md`

**Geändert:**
- `src/types/index.ts`
- `src/app/api/teachers/route.ts`
