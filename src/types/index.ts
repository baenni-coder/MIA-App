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
}

// Benutzer-Rollen
export type UserRole = "teacher" | "picts_admin" | "super_admin";

// Lehrer
export interface Teacher {
  id: string;
  email: string;
  name: string;
  schuleId: string;
  stufe: Stufe;
  role: UserRole; // NEU: Rolle des Benutzers
  schule?: Schule | null;
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
  | "theme_updated";

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
