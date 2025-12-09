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
  unterrichtsideen?: Array<{
    name: string;
    anzahl?: number;
  }>;
}

// Lehrer
export interface Teacher {
  id: string;
  email: string;
  name: string;
  schuleId: string;
  stufe: Stufe;
  schule?: Schule | null;
  createdAt: Date;
}

// Admin
export interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
