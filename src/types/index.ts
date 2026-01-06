// Schweizer Kantone (für kantonsspezifische Funktionen)
export type Kanton =
  | "AG" | "AI" | "AR" | "BE" | "BL" | "BS" | "FR" | "GE" | "GL" | "GR"
  | "JU" | "LU" | "NE" | "NW" | "OW" | "SG" | "SH" | "SO" | "SZ" | "TG"
  | "TI" | "UR" | "VD" | "VS" | "ZG" | "ZH";

export const KANTONE: { value: Kanton; label: string }[] = [
  { value: "AG", label: "Aargau" },
  { value: "AI", label: "Appenzell Innerrhoden" },
  { value: "AR", label: "Appenzell Ausserrhoden" },
  { value: "BE", label: "Bern" },
  { value: "BL", label: "Basel-Landschaft" },
  { value: "BS", label: "Basel-Stadt" },
  { value: "FR", label: "Freiburg" },
  { value: "GE", label: "Genf" },
  { value: "GL", label: "Glarus" },
  { value: "GR", label: "Graubünden" },
  { value: "JU", label: "Jura" },
  { value: "LU", label: "Luzern" },
  { value: "NE", label: "Neuenburg" },
  { value: "NW", label: "Nidwalden" },
  { value: "OW", label: "Obwalden" },
  { value: "SG", label: "St. Gallen" },
  { value: "SH", label: "Schaffhausen" },
  { value: "SO", label: "Solothurn" },
  { value: "SZ", label: "Schwyz" },
  { value: "TG", label: "Thurgau" },
  { value: "TI", label: "Tessin" },
  { value: "UR", label: "Uri" },
  { value: "VD", label: "Waadt" },
  { value: "VS", label: "Wallis" },
  { value: "ZG", label: "Zug" },
  { value: "ZH", label: "Zürich" },
];

// Schulstufen
export type Stufe =
  | "KiGa"
  | "1. Klasse"
  | "2. Klasse"
  | "3. Klasse"
  | "4. Klasse"
  | "5. Klasse"
  | "6. Klasse"
  | "7. Klasse"
  | "8. Klasse"
  | "9. Klasse";

// Kanban-Zeiträume
export type Zeitraum =
  | "Sommerferien-Herbstferien"
  | "Herbstferien-Weihnachtsferien"
  | "Weihnachtsferien-Winterferien"
  | "Winterferien-Frühlingsferien"
  | "Frühlingsferien-Sommerferien"
  | "Zusatz";

// Airtable Thema aus CSV
export interface Thema {
  id: string;
  thema: string;
  beschreibung?: string;
  lehrmittel?: string;
  bildLehrmittel?: string;
  anzahlLektionen?: number;
  kompetenzenLehrplan?: string; // String für Anzeige
  kompetenzen?: Kompetenz[]; // Array für klickbare Kompetenzen
  fileRouge?: string;
  unterlagen?: string;
  schuljahr: Stufe[];
  lektionsplanung?: string;
  zeitraum?: Zeitraum;
  startdatum?: string;
  uebersichtPICTS?: string;
  pictsBuchen?: string;
  // Custom Theme Felder (wenn aus Firestore)
  isCustom?: boolean;
  customThemeId?: string;
}

// Schule
export interface Schule {
  id: string;
  name: string;
  ort?: string;
  pictsBuchen?: string;
  createdAt: Date;
}

// Unterrichtsidee
export interface Unterrichtsidee {
  id: string;
  name: string;
  lehrmittel?: string;
  anzahl?: number;
}

// Kompetenz
export interface Kompetenz {
  id: string;
  name: string;
  lpCode?: string;
  kompetenzbereich?: string;
  kompetenz?: string;
  kompetenzstufe?: string;
  zyklus?: string[];
  klassenstufe?: string[];
  grundanspruch?: string;
  querverweisLP?: string;
  unterrichtsideen?: Unterrichtsidee[];
  // Verknüpfung zu Regelstandards (für bidirektionale Links)
  regelstandardCodes?: string[]; // z.B. ["RS.1.1.a", "RS.1.1.b"]
}

// Regelstandard (Kanton Solothurn)
export interface Regelstandard {
  rsCode: string; // z.B. "RS.1.1.a"
  handlungsfeld: string; // z.B. "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen"
  handlungsfeldNummer: number; // 1-7
  dimension: string; // z.B. "Dimension Zugang: Zugang finden, Handhaben, Anwenden"
  kompetenz: string; // z.B. "Datensicherheit"
  kompetenzenLehrplan: string[]; // LP-Codes z.B. ["IB.2.3.b", "IB.3.1.a"]
  kompetenzstufe: string; // Beschreibung der Kompetenzstufe
  zyklus: string; // z.B. "Zyklus 2"
  klassenstufe: string; // z.B. "3./4."
}

// Benutzer-Rollen (erweitert um student)
export type UserRole = "student" | "teacher" | "picts_admin" | "super_admin";

// Lehrer
export interface Teacher {
  id: string;
  email: string;
  name: string;
  schuleId: string;
  stufe: Stufe;
  kanton?: Kanton; // Unterrichtskanton (für kantonsspezifische Funktionen)
  role: UserRole; // Rolle des Benutzers
  schule?: Schule | null;
  schoolApproved: boolean; // true wenn Schulzugehörigkeit genehmigt wurde
  createdAt: Date;
}

// Admin (deprecated - verwende Teacher mit role)
export interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// Website/Tool für Lektionsplanung
export interface WebsiteTool {
  id: string;
  name: string;
  link?: string;
}

// Lektionsplanung
export interface Lektionsplanung {
  id: string;
  eindeutigeBezeichnung: string;
  lektion: string;
  themaId: string;
  themaName?: string;
  aufgaben?: string;
  vorwissen?: string;
  material?: string[];
  websiteTools?: WebsiteTool[];
  einstieg?: string;
  hauptteil?: string;
  abschluss?: string;
  stolpersteine?: string;
  kiZusammenfassung?: string;
}

// ============================================
// Custom Themen & Lektionen (User-Created)
// ============================================

// Status für Custom Themen
export type ThemeStatus = "draft" | "pending_review" | "approved" | "rejected";

// Custom Thema (von Lehrern erstellt)
export interface CustomTheme {
  id: string;

  // Basis-Informationen
  thema: string;
  beschreibung: string;
  lehrmittel?: string;
  bildLehrmittel?: string; // Firebase Storage URL
  anzahlLektionen: number;
  schuljahr: Stufe[];
  zeitraum: Zeitraum;

  // Kompetenzen (IDs aus Airtable)
  kompetenzenIds: string[]; // Airtable Record IDs
  kompetenzen?: Kompetenz[]; // Aufgelöste Kompetenzen (optional)

  // Optional wie Airtable Themen
  fileRouge?: string;
  unterlagen?: string;

  // Metadata
  createdBy: string; // Teacher userId
  createdByName: string; // Teacher Name für Anzeige
  schuleId: string; // Schule des Erstellers
  createdAt: Date;
  updatedAt: Date;

  // Freigabe-Workflow
  status: ThemeStatus;
  reviewedBy?: string; // Admin userId
  reviewedByName?: string; // Admin Name
  reviewedAt?: Date;
  reviewNotes?: string; // Feedback vom Admin

  // System-Integration
  airtableId?: string; // Falls zu Airtable exportiert
  isSystemWide: boolean; // true nach Freigabe
}

// Custom Lektion (gehört zu Custom Thema)
export interface CustomLektion {
  id: string;

  // Verknüpfung
  themeId: string; // Custom Theme ID
  lektion: string; // "Lektion 1", "Lektion 2"
  eindeutigeBezeichnung: string; // "Lektion 1 - Titel"

  // Lektions-Inhalt (wie Airtable Lektionsplanung)
  aufgaben?: string;
  vorwissen?: string;
  material?: string[];
  websiteTools?: WebsiteTool[];
  einstieg?: string;
  hauptteil?: string;
  abschluss?: string;
  stolpersteine?: string;
  kiZusammenfassung?: string;

  // Metadata
  createdBy: string; // Teacher userId
  createdAt: Date;
  updatedAt: Date;

  // Reihenfolge
  order: number; // Für Sortierung
}

// Notification Typen
export type NotificationType =
  | "theme_submitted"
  | "theme_approved"
  | "theme_rejected"
  | "theme_updated"
  | "school_change_requested"
  | "school_change_approved"
  | "school_change_rejected";

// Notification
export interface Notification {
  id: string;

  // Empfänger
  recipientId: string; // Admin userId
  recipientRole: UserRole; // Für Filter

  // Inhalt
  type: NotificationType;
  themeId: string;
  themeTitle: string;

  // Ersteller (wer hat die Aktion ausgelöst)
  createdBy: string; // userId
  createdByName: string; // Name für Anzeige
  createdByEmail: string;

  // Schul-Kontext
  schuleId: string; // Für Schul-Filter

  // Metadata
  createdAt: Date;
  read: boolean;
  readAt?: Date;

  // Anzeige
  message: string;
  actionUrl?: string; // Link zum Thema
}

// ============================================
// School Change Requests (Schulwechsel-Anfragen)
// ============================================

// Status für Schulwechsel-Anfragen
export type SchoolChangeStatus = "pending" | "approved" | "rejected";

// Typ der Schulanfrage
export type SchoolRequestType = "join" | "change"; // join = Neuregistrierung, change = Wechsel

// Schulwechsel-Anfrage
export interface SchoolChangeRequest {
  id: string;

  // Antragsteller
  teacherId: string; // User ID des Lehrers
  teacherName: string; // Name des Lehrers
  teacherEmail: string; // E-Mail des Lehrers

  // Typ der Anfrage
  requestType: SchoolRequestType; // "join" für Neuregistrierung, "change" für Wechsel

  // Aktuelle Schule (leer bei "join")
  currentSchuleId: string;
  currentSchuleName: string;

  // Neue Schule (beantragt)
  newSchuleId: string;
  newSchuleName: string;

  // Status
  status: SchoolChangeStatus;

  // Review-Informationen
  reviewedBy?: string; // Super Admin User ID
  reviewedByName?: string; // Super Admin Name
  reviewedAt?: Date;
  reviewNotes?: string; // Begründung bei Ablehnung

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// System Cache (Airtable → Firestore Mirror)
// ============================================

// System Theme (Cache von Airtable Themen)
export interface SystemTheme {
  id: string; // Firestore Doc ID (gleich wie airtableId)
  airtableId: string; // Original Airtable Record ID

  // Basis-Daten (wie Thema Interface)
  thema: string;
  beschreibung?: string;
  lehrmittel?: string;
  bildLehrmittel?: string;
  anzahlLektionen?: number;
  schuljahr: Stufe[];
  zeitraum?: Zeitraum;

  // Kompetenzen (als IDs, werden bei Bedarf aufgelöst)
  kompetenzenIds: string[]; // Airtable Record IDs

  // Optional
  fileRouge?: string;
  unterlagen?: string;
  lektionsplanung?: string;
  startdatum?: string;
  uebersichtPICTS?: string;
  pictsBuchen?: string;

  // Sync Metadata
  lastSyncedAt: Date;
  isActive: boolean; // false wenn in Airtable gelöscht
}

// System Schule (Cache von Airtable Schulen)
export interface SystemSchule {
  id: string; // Firestore Doc ID (gleich wie airtableId)
  airtableId: string; // Original Airtable Record ID

  name: string;
  ort?: string;
  pictsBuchen?: string;

  // Sync Metadata
  lastSyncedAt: Date;
  isActive: boolean;
}

// System Kompetenz (Cache von Airtable Kompetenzen)
export interface SystemKompetenz {
  id: string; // Firestore Doc ID (gleich wie airtableId)
  airtableId: string; // Original Airtable Record ID

  name: string;
  lpCode?: string;
  kompetenzbereich?: string;
  kompetenz?: string;
  kompetenzstufe?: string;
  zyklus?: string[];
  klassenstufe?: string[];
  grundanspruch?: string;
  querverweisLP?: string;

  // Unterrichtsideen (als IDs, werden bei Bedarf aufgelöst)
  unterrichtsideenIds: string[]; // Airtable Record IDs

  // Sync Metadata
  lastSyncedAt: Date;
  isActive: boolean;
}

// System Lektion (Cache von Airtable Lektionsplanung)
export interface SystemLektion {
  id: string; // Firestore Doc ID (gleich wie airtableId)
  airtableId: string; // Original Airtable Record ID

  eindeutigeBezeichnung: string;
  lektion: string;
  themaId: string; // Airtable Thema Record ID
  themaName?: string;

  // Lektions-Inhalt
  aufgaben?: string;
  vorwissen?: string;
  material?: string[];
  websiteTools?: WebsiteTool[];
  einstieg?: string;
  hauptteil?: string;
  abschluss?: string;
  stolpersteine?: string;
  kiZusammenfassung?: string;

  // Sync Metadata
  lastSyncedAt: Date;
  isActive: boolean;
}

// Sync Status
export type SyncStatus = "idle" | "syncing" | "error" | "success";

// Sync Metadata (global state)
export interface SyncMetadata {
  lastFullSync?: Date;
  lastIncrementalSync?: Date;
  syncStatus: SyncStatus;
  errorMessage?: string;
  recordCounts: {
    themes: number;
    schulen: number;
    kompetenzen: number;
    lektionen: number;
  };
  lastSyncDuration?: number; // in milliseconds
}

// Sync Log Entry
export interface SyncLog {
  id: string;
  timestamp: Date;
  type: "full_sync" | "incremental_sync" | "manual_sync";
  status: "success" | "error";
  duration: number; // milliseconds
  recordsProcessed: {
    themes: { added: number; updated: number; deleted: number };
    schulen: { added: number; updated: number; deleted: number };
    kompetenzen: { added: number; updated: number; deleted: number };
    lektionen: { added: number; updated: number; deleted: number };
  };
  errors?: string[];
  triggeredBy?: string; // User ID (bei manual sync)
}

// ============================================
// School Files (schulspezifische Dateien)
// ============================================

// Freigabe-Level für Dateien
export type FileShareLevel = "private" | "school";

// Erlaubte Dateitypen
export type AllowedFileType =
  | "application/pdf"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.ms-powerpoint"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

// School File Metadata (in Firestore gespeichert)
export interface SchoolFile {
  id: string;

  // Datei-Informationen
  name: string; // Original Dateiname
  storagePath: string; // Pfad in Firebase Storage
  storageUrl: string; // Download URL
  contentType: string; // MIME-Type
  size: number; // Größe in Bytes

  // Zugehörigkeit
  schuleId: string; // Airtable Schul-ID
  schuleName?: string; // Schulname für Anzeige
  uploadedBy: string; // User ID des Uploaders
  uploadedByName: string; // Name des Uploaders

  // Freigabe
  sharedWith: FileShareLevel; // "private" oder "school"

  // Optional: Verknüpfung zu Themen
  linkedThemeIds?: string[]; // Custom Theme IDs
  linkedThemeNames?: string[]; // Theme Namen für Anzeige

  // Beschreibung
  description?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Für File-Upload Request
export interface SchoolFileUploadRequest {
  name?: string; // Optional: Custom Name (sonst Original-Dateiname)
  sharedWith: FileShareLevel;
  linkedThemeIds?: string[];
  description?: string;
}

// ============================================
// FAQ System
// ============================================

// FAQ Kategorien
export type FAQCategory =
  | "allgemein"
  | "jahresplan"
  | "themen"
  | "dateien"
  | "admin";

// FAQ Eintrag (in Firestore gespeichert)
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  order: number; // Für Sortierung innerhalb der Kategorie
  isActive: boolean; // Zum Ausblenden ohne Löschen
  createdBy: string; // Admin User ID
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Für FAQ Create/Update Request
export interface FAQItemRequest {
  question: string;
  answer: string;
  category: FAQCategory;
  order?: number;
  isActive?: boolean;
}

// ============================================
// Temporäre Typen (für Formulare)
// ============================================

// Temporäre Lektion (noch nicht gespeichert, ohne ID)
export interface TempLektion {
  tempId: string; // Temporäre ID für React Keys
  lektion: string; // "Lektion 1", "Lektion 2"
  eindeutigeBezeichnung: string;
  aufgaben?: string;
  vorwissen?: string;
  material: string[];
  websiteTools: WebsiteTool[];
  einstieg?: string;
  hauptteil?: string;
  abschluss?: string;
  stolpersteine?: string;
  kiZusammenfassung?: string;
  order: number;
}

// ============================================
// Schüler & Klassen (Kompetenzenpass Integration)
// ============================================

// Schüler-Profil
export interface Student {
  id: string; // Firebase UID
  email: string;
  name: string;
  role: "student";
  classId: string; // Zugehörige Klasse
  className?: string; // Aufgelöster Klassenname
  schoolId: string; // Schule (für Zugriffskontrolle)
  teacherId: string; // Hauptverantwortliche Lehrperson
  teacherName?: string; // Name der Lehrperson
  createdAt: Date;
  lastActive?: Date;
}

// Schulklasse
export interface SchoolClass {
  id: string;
  name: string; // z.B. "5a", "6b"
  displayName?: string; // z.B. "5. Klasse A"
  grade: Stufe; // Klassenstufe für Kompetenz-Filterung
  schoolId: string;
  teacherId: string; // Klassenlehrer
  teacherName?: string;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schüler-Fortschritt (Kompetenzbewertung)
// ============================================

// Fortschritt eines Schülers
export interface StudentProgress {
  id: string; // = studentId
  studentId: string;
  classId: string;
  ratings: {
    [competencyId: string]: number; // 0-5 Sterne
  };
  comments: {
    [competencyId: string]: string; // Lehrer-Kommentare
  };
  pendingReviews: {
    [competencyId: string]: string; // Review-Request IDs
  };
  lastUpdated: Date;
}

// Verlaufs-Eintrag für Bewertungsänderungen
export interface ProgressHistoryEntry {
  id: string;
  studentId: string;
  competencyId: string;
  competencyName?: string;
  oldRating: number;
  newRating: number;
  changedBy: "student" | string; // "student" oder odertId
  changedByName?: string;
  timestamp: Date;
}

// ============================================
// Klassen-Themen-Fortschritt
// ============================================

// Bearbeitete Themen pro Klasse
export interface ClassThemeProgress {
  id: string;
  classId: string;
  className: string;
  themeId: string; // Airtable oder Custom Theme ID
  themeName: string;
  themeDescription?: string;
  competencyIds: string[]; // Verknüpfte Kompetenzen
  competencyNames?: string[];
  zeitraum?: Zeitraum;
  markedCompletedBy: string; // Lehrer UID
  markedCompletedByName: string;
  markedCompletedAt: Date;
  createdAt: Date;
}

// ============================================
// Badge-System (Gamification)
// ============================================

// Badge-Seltenheit
export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

// Badge-Kriterien-Typen
export type BadgeCriteriaType =
  | "competency_count" // X Kompetenzen bewertet
  | "star_count" // X Kompetenzen mit Y+ Sternen
  | "area_complete" // Bereich komplett
  | "perfect_rating" // X Kompetenzen mit 5 Sternen
  | "streak" // X Tage hintereinander aktiv
  | "time_based" // Bestimmte Uhrzeit/Tag
  | "theme_count" // X Themen abgeschlossen
  | "manual"; // Manuell vergeben

// Badge-Kriterien
export interface BadgeCriteria {
  type: BadgeCriteriaType;
  threshold?: number; // z.B. 10 für "10 Kompetenzen"
  areaId?: string; // Für Bereichs-bezogene Badges
  minStars?: number; // Mindest-Sterne (z.B. 3)
  description: string; // Beschreibung für UI
}

// Badge-Definition
export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: BadgeRarity;
  color: string; // Hex-Farbe basierend auf Rarity
  criteria: BadgeCriteria;
  isSystem: boolean; // true = automatisch vergeben, false = manuell
  createdBy?: string; // Bei Custom Badges
  createdByName?: string;
  schoolId?: string; // Bei Custom Badges - für welche Schule
  createdAt: Date;
  order: number; // Für Sortierung
}

// Vergebenes Badge an Schüler
export interface StudentBadge {
  id: string;
  studentId: string;
  studentName?: string;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  badgeRarity: BadgeRarity;
  awardedAt: Date;
  awardedBy: "system" | string; // "system" oder odertId
  awardedByName?: string;
  reason?: string; // Optional: Begründung (bei manueller Vergabe)
  notified: boolean; // Wurde der Schüler benachrichtigt?
}

// ============================================
// Kompetenz-Review (Schüler beantragt Höherstufung)
// ============================================

export type CompetencyReviewStatus = "pending" | "approved" | "rejected";

export interface CompetencyReview {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  competencyId: string;
  competencyName: string;
  competencyLpCode?: string;
  oldRating: number;
  requestedRating: number;
  status: CompetencyReviewStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  feedback?: string;
  createdAt: Date;
}

// ============================================
// Notification-Erweiterungen für Schüler
// ============================================

// Erweiterte Notification-Typen (zu bestehenden hinzufügen)
export type StudentNotificationType =
  | "badge_earned" // Neues Badge erhalten
  | "teacher_comment" // Lehrer hat kommentiert
  | "review_approved" // Review wurde genehmigt
  | "review_rejected" // Review wurde abgelehnt
  | "theme_completed"; // Thema wurde als bearbeitet markiert

// Schüler-Notification
export interface StudentNotification {
  id: string;
  studentId: string;
  type: StudentNotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  relatedId?: string; // Badge ID, Competency ID, etc.
  isRead: boolean;
  createdAt: Date;
}

// ============================================
// Konstanten für Badges
// ============================================

// Farben für Badge-Raritäten
export const BADGE_RARITY_COLORS: Record<BadgeRarity, string> = {
  common: "#22c55e", // Grün
  rare: "#3b82f6", // Blau
  epic: "#a855f7", // Lila
  legendary: "#f59e0b", // Gold
};

// Beschreibungen für Badge-Raritäten
export const BADGE_RARITY_LABELS: Record<BadgeRarity, string> = {
  common: "Gewöhnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendär",
};
