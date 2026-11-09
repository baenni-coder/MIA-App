import type { LehrmittelVorlage } from "@/types";

/**
 * Jahresplanung „Schweizer Zahlenbuch 5" (Neuausgabe, 5. Klasse).
 * Quelle: Klett und Balmer AG, 2023, Jahresplanung Schweizer Zahlenbuch 5.
 *
 * Die Verlagsplanung gruppiert die Lernumgebungen nur über die Wochen-Spalte
 * (ohne Blocktitel) – die Titel der Blöcke sind hier aus den enthaltenen
 * Lernumgebungen abgeleitet. Die Vertiefung (7–12 Wochen) ist entlang der
 * farbigen Untergruppen in vier optionale Blöcke aufgeteilt. Keine LZK im PDF.
 */
export const schweizerZahlenbuch5: LehrmittelVorlage = {
  id: "schweizer-zahlenbuch-5",
  lehrmittel: "Schweizer Zahlenbuch 5",
  titel: "Jahresplanung Schweizer Zahlenbuch 5",
  verlag: "Klett und Balmer",
  quelle: "© Klett und Balmer AG, 2023, Jahresplanung, Schweizer Zahlenbuch 5",
  fachbereichId: "MA",
  stufen: ["5. Klasse"],
  uebungenLabel: "Rechentraining / Kopfgeometrie",
  hinweis:
    "Die Wochenangaben sind Richtwerte. Je nach Klasse und Schulsituation müssen die Zeitfenster angepasst werden. Blocktitel sind von der MIA-App aus den Lernumgebungen abgeleitet. Vertiefung und Weiterführung umfasst gesamthaft 7–12 Wochen.",
  bloecke: [
    {
      id: "w-natuerliche-zahlen",
      titel: "Wiederholung: Natürliche Zahlen und Kopfrechnen",
      phase: "Wiederholung",
      wochenMin: 2,
      wochenMax: 2,
      kapitel: [
        { nr: 1, titel: "Natürliche Zahlen", seiten: "6–7" },
        { nr: 2, titel: "Mit natürlichen Zahlen im Kopf rechnen", seiten: "8–9" },
      ],
      blitz: ["Ergänzen auf …", "In … Schritten auf …", "Multiplizieren – dividieren"],
    },
    {
      id: "w-geometrie",
      titel: "Wiederholung: Ornamente, Figuren und Quaderansichten",
      phase: "Wiederholung",
      wochenMin: 2,
      wochenMax: 3,
      kapitel: [
        { nr: 3, titel: "Ornamente", seiten: "10–11" },
        { nr: 4, titel: "Figuren und Flächen", seiten: "12–13" },
        { nr: 5, titel: "Quaderansichten", seiten: "14–15" },
      ],
    },
    {
      id: "w-grosse-zahlen",
      titel: "Wiederholung: Rechnen mit grossen Zahlen",
      phase: "Wiederholung",
      wochenMin: 2,
      wochenMax: 2,
      kapitel: [
        { nr: 6, titel: "Addition und Subtraktion grosser Zahlen", seiten: "16–17" },
        { nr: 7, titel: "Multiplikation und Division grosser Zahlen", seiten: "18–19" },
      ],
    },
    {
      id: "w-sachrechnen",
      titel: "Wiederholung: Sachrechnen im Kopf",
      phase: "Wiederholung",
      wochenMin: 1,
      wochenMax: 1,
      kapitel: [
        { nr: 8, titel: "Sachrechnen im Kopf", seiten: "20–21" },
        { nr: 9, titel: "«Das Glück dieser Erde …»", seiten: "22–23" },
      ],
      blitz: ["Grössenvorstellungen", "Grössen umrechnen"],
    },
    {
      id: "g-strecken-zirkel",
      titel: "Strecken, Zirkel und Geodreieck",
      phase: "Grundlegung",
      wochenMin: 2,
      wochenMax: 2,
      kapitel: [
        { nr: 10, titel: "Strecken, Parallelen und Senkrechte", seiten: "24–25" },
        { nr: 11, titel: "Zirkel und Geodreieck", seiten: "26–27" },
      ],
    },
    {
      id: "g-groessen",
      titel: "Grössen mit und ohne Komma",
      phase: "Grundlegung",
      wochenMin: 2,
      wochenMax: 2,
      // Reihenfolge wie in der Verlagsplanung (14 vor 12 und 13)
      kapitel: [
        { nr: 14, titel: "Grössen mit und ohne Komma", seiten: "32–33" },
        { nr: 12, titel: "Grössen bei Bienen", seiten: "28–29" },
        { nr: 13, titel: "Grössen bei Flugzeugen", seiten: "30–31" },
      ],
    },
    {
      id: "g-runden-proportionalitaet",
      titel: "Runden und Proportionalität",
      phase: "Grundlegung",
      wochenMin: 3,
      wochenMax: 4,
      kapitel: [
        { nr: 15, titel: "Versteckte Zahlen", seiten: "34–35" },
        { nr: 16, titel: "Aufrunden – Abrunden", seiten: "36–37" },
        { nr: 17, titel: "Vergrössern – Verkleinern (Proportionalität)", seiten: "38–39" },
      ],
      blitz: ["Runde auf …"],
    },
    {
      id: "g-preise-tabellen",
      titel: "Preise, Tabellen und Durchschnitte",
      phase: "Grundlegung",
      wochenMin: 3,
      wochenMax: 4,
      kapitel: [
        { nr: 18, titel: "Preistabellen – Preisberechnungen (Proportionalität)", seiten: "40–41" },
        { nr: 19, titel: "Tabellen und Diagramme", seiten: "42–43" },
        { nr: 20, titel: "Durchschnitte", seiten: "44–45" },
      ],
      blitz: ["Mal – durch, durch – mal"],
    },
    {
      id: "g-brueche",
      titel: "Brüche",
      phase: "Grundlegung",
      wochenMin: 3,
      wochenMax: 4,
      kapitel: [
        { nr: 21, titel: "Gebrochene Zahlen im Alltag", seiten: "46–47" },
        { nr: 22, titel: "Anteile als Brüche – Brüche als Anteile", seiten: "48–49" },
        { nr: 23, titel: "Gleicher Bruchteil – andere Form", seiten: "50–51" },
        { nr: 24, titel: "Modelle für Brüche 1", seiten: "52–53" },
      ],
      blitz: ["Bruchteile von 60"],
    },
    {
      id: "g-wuerfel-quader",
      titel: "Würfel- und Quadernetze, Körper",
      phase: "Grundlegung",
      wochenMin: 2,
      wochenMax: 2,
      kapitel: [
        { nr: 25, titel: "Würfel- und Quadernetze", seiten: "54–55" },
        { nr: 26, titel: "Körper aus Würfeln", seiten: "56–57" },
      ],
      blitz: ["Quader kippen", "Würfelgebäude drehen"],
    },
    {
      id: "g-statistik",
      titel: "Statistik, Kombinatorik und Sachrechnen",
      phase: "Grundlegung",
      wochenMin: 2,
      wochenMax: 2,
      kapitel: [
        { nr: 27, titel: "Kriminalpolizei (Statistik, Kombinatorik)", seiten: "58–59" },
        { nr: 28, titel: "Mit dem Schiff zum Meer", seiten: "60–61" },
      ],
    },
    {
      id: "g-zahlen-mit-komma",
      titel: "Zahlen mit Komma",
      phase: "Grundlegung",
      wochenMin: 3,
      wochenMax: 4,
      kapitel: [
        { nr: 29, titel: "Zahlen mit Komma und Zahlenstrahl", seiten: "62–63" },
        { nr: 30, titel: "Zahlen mit Komma und Stellentafel", seiten: "64–65" },
        { nr: 31, titel: "Grössen und Stellentafel", seiten: "66–67" },
      ],
    },
    {
      id: "v-wachstum-wahrscheinlichkeit",
      titel: "Vertiefung: Wachstum und Wahrscheinlichkeit",
      phase: "Vertiefung und Weiterführung",
      wochenMin: 1,
      wochenMax: 3,
      kapitel: [
        { nr: 32, titel: "Bäume wachsen", seiten: "68–69" },
        { nr: 33, titel: "Würfelspiele (Wahrscheinlichkeit)", seiten: "70–71" },
      ],
    },
    {
      id: "v-brueche",
      titel: "Vertiefung: Brüche",
      phase: "Vertiefung und Weiterführung",
      wochenMin: 1,
      wochenMax: 3,
      kapitel: [
        { nr: 34, titel: "Bruchteile von Grössen", seiten: "72–73" },
        { nr: 35, titel: "Modelle für Brüche 2", seiten: "74–75" },
      ],
      blitz: ["Bruchteile von 100 und 1000"],
    },
    {
      id: "v-konstruieren",
      titel: "Vertiefung: Konstruieren, Knoten, Orientierungslauf",
      phase: "Vertiefung und Weiterführung",
      wochenMin: 2,
      wochenMax: 3,
      kapitel: [
        { nr: 36, titel: "Künstler konstruieren", seiten: "76–77" },
        { nr: 37, titel: "Knoten", seiten: "78–79" },
        { nr: 38, titel: "Orientierungslauf", seiten: "80–81" },
      ],
    },
    {
      id: "v-folgen-zahlenraetsel",
      titel: "Vertiefung: Folgen und Zahlenrätsel",
      phase: "Vertiefung und Weiterführung",
      wochenMin: 2,
      wochenMax: 3,
      kapitel: [
        { nr: 39, titel: "Folgen", seiten: "82–83" },
        { nr: 40, titel: "Zahlenquadrate", seiten: "84–85" },
        { nr: 41, titel: "Zahlenrätsel", seiten: "86–87" },
      ],
      blitz: ["Quadratzahlen"],
    },
    {
      id: "projekt-weihnachten",
      titel: "Projekt: Bald ist Weihnachten",
      phase: "Projekte",
      wochenMin: 1,
      wochenMax: 1,
      optional: true,
      kapitel: [{ nr: 42, titel: "Bald ist Weihnachten", seiten: "88–89" }],
    },
    {
      id: "projekt-baeume",
      titel: "Projekt: Wie alt werden Bäume?",
      phase: "Projekte",
      wochenMin: 1,
      wochenMax: 1,
      optional: true,
      kapitel: [{ nr: 43, titel: "Wie alt werden Bäume?", seiten: "90–91" }],
    },
    {
      id: "projekt-schulreise",
      titel: "Projekt: Wir planen unsere Schulreise",
      phase: "Projekte",
      wochenMin: 1,
      wochenMax: 1,
      optional: true,
      kapitel: [{ nr: 44, titel: "Wir planen unsere Schulreise", seiten: "92–93" }],
    },
    {
      id: "projekt-jakob-steiner",
      titel: "Projekt: Jakob Steiner",
      phase: "Projekte",
      wochenMin: 1,
      wochenMax: 1,
      optional: true,
      kapitel: [{ nr: 45, titel: "Jakob Steiner", seiten: "94–95" }],
    },
  ],
};
