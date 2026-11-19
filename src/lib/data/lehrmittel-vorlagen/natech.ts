import type { LehrmittelVorlage, LehrmittelVorlageBlock } from "@/types";

/**
 * NaTech 1|2, 3|4, 5|6 – Natur und Technik Primarstufe (LMVZ / schulverlag plus).
 * Quelle: „Bezüge zum Lehrplan 21“, Lehrmittelverlag Zürich, November 2017.
 * AUTOMATISCH erzeugt mit scripts/lehrmittel-vorlagen/natech-generate.py.
 *
 * Keine Jahresplanung des Verlags: pro Schuljahr 5 Themen ohne Richtwert
 * (art = "themenuebersicht"). Die 10 Themenstränge (Stoffe, Technik, Sinne …)
 * kehren in jedem Band wieder (Spiralprinzip, reihe = "NaTech").
 * LP21-Codes sind Kompetenzen (NMG.x.y), auf denen der Schwerpunkt liegt;
 * beim Übernehmen werden sie zu den Kompetenzstufen des Zyklus aufgelöst.
 */

const LP21_TEXTE: Record<string, string> = {
  "NMG.1.1": "Sich und andere wahrnehmen und beschreiben",
  "NMG.1.2": "Mitverantwortung für Gesundheit und Wohlbefinden übernehmen und sich vor Gefahren schützen",
  "NMG.1.3": "Zusammenhänge von Ernährung und Wohlbefinden erkennen und erläutern",
  "NMG.1.4": "Den Aufbau des eigenen Körpers beschreiben und Funktionen von ausgewählten Organen erklären",
  "NMG.1.5": "Wachstum und Entwicklung des menschlichen Körpers wahrnehmen und verstehen",
  "NMG.1.6": "Geschlecht und Rollen reflektieren",
  "NMG.2.1": "Tiere und Pflanzen in ihren Lebensräumen erkunden und dokumentieren sowie das Zusammenwirken beschreiben",
  "NMG.2.2": "Die Bedeutung von Sonne, Luft, Wasser, Boden und Steinen für Lebewesen erkennen, darüber nachdenken und Zusammenhänge erklären",
  "NMG.2.3": "Wachstum, Entwicklung und Fortpflanzung bei Tieren und Pflanzen beobachten und vergleichen",
  "NMG.2.4": "Artenvielfalt von Pflanzen und Tieren erkennen und sie kategorisieren",
  "NMG.2.5": "Vorstellungen zur Geschichte der Erde und der Entwicklung von Pflanzen, Tieren und Menschen entwickeln",
  "NMG.2.6": "Einflüsse des Menschen auf die Natur einschätzen und über eine nachhaltige Entwicklung nachdenken",
  "NMG.3.1": "Erfahrungen mit Bewegungen und Kräften beschreiben und einordnen",
  "NMG.3.2": "Die Bedeutung von Energie und Energieumwandlungen im Alltag erkennen, beschreiben und reflektiert handeln",
  "NMG.3.3": "Stoffe im Alltag und in natürlicher Umgebung wahrnehmen, untersuchen und ordnen",
  "NMG.3.4": "Stoffe bearbeiten, verändern und nutzen",
  "NMG.4.1": "Signale, Sinne und Sinnesleistungen erkennen, vergleichen und erläutern",
  "NMG.4.2": "Akustische Phänomene vergleichen und untersuchen",
  "NMG.4.3": "Optische Phänomene erkennen und untersuchen",
  "NMG.4.4": "Wetterphänomene beobachten, sich über Naturereignisse informieren sowie entsprechende Phänomene und Sachverhalte erklären",
  "NMG.4.5": "Erscheinungen auf der Erde und Bewegungen von Himmelskörpern wahrnehmen, beschreiben und erklären",
  "NMG.5.1": "Alltagsgeräte und technische Anlagen untersuchen und nachkonstruieren",
  "NMG.5.2": "Elektrische und magnetische Phänomene sowie deren technische Anwendungen untersuchen",
  "NMG.5.3": "Bedeutung und Folgen technischer Entwicklungen für Mensch und Umwelt einschätzen"
};

const basis = {
  verlag: "Lehrmittelverlag Zürich / schulverlag plus",
  quelle: "© Lehrmittelverlag Zürich, November 2017 – NaTech, Bezüge zum Lehrplan 21 (Grundlage: D-EDK-Druckfassung vom 29.02.2016)",
  fachbereichId: "NMG",
  art: "themenuebersicht" as const,
  reihe: "NaTech",
  lp21Texte: LP21_TEXTE,
  hinweis:
    "Der Verlag gibt keine Jahresplanung vor: Reihenfolge und Dauer der Themen sind frei. Die Themenstränge (Stoffe, Technik, Sinne …) wiederholen sich in jedem Band auf höherem Niveau (Spiralprinzip). LP21-Bezüge = Kompetenzen, auf denen der Schwerpunkt des Themas liegt.",
};

export const natech1: LehrmittelVorlage = {
  ...basis,
  id: "natech-1",
  lehrmittel: "NaTech 1|2",
  lehrmittelAliase: ["NaTech 1/2", "NaTech 1 | 2", "NaTech 1-2", "NaTech 1–2", "NaTech"],
  titel: "NaTech 1|2 – Themen 1. Schuljahr",
  stufen: ["1. Klasse"],
  bloecke: [
    {"id": "thema-1", "titel": "Stoffe überall", "phase": "Themen", "vorschlagWochen": 4, "strang": "Stoffe", "strangNr": 1, "kapitel": [], "lp21Codes": ["NMG.3.3", "NMG.3.4"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-2", "titel": "Spielen und entdecken", "phase": "Themen", "vorschlagWochen": 4, "strang": "Technik", "strangNr": 2, "kapitel": [], "lp21Codes": ["NMG.3.1", "NMG.5.1", "NMG.5.3"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-3", "titel": "Was siehst du? Was hörst du?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Sinne", "strangNr": 3, "kapitel": [], "lp21Codes": ["NMG.4.1", "NMG.4.2", "NMG.4.3"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-4", "titel": "Was kann dein Körper?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Körper", "strangNr": 4, "kapitel": [], "lp21Codes": ["NMG.1.2", "NMG.1.3", "NMG.1.4"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-5", "titel": "Was lebt in deiner Nähe?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Vielfalt", "strangNr": 5, "kapitel": [], "lp21Codes": ["NMG.2.1", "NMG.2.2", "NMG.2.4", "NMG.2.5", "NMG.2.6"]} satisfies LehrmittelVorlageBlock,
  ],
};

export const natech2: LehrmittelVorlage = {
  ...basis,
  id: "natech-2",
  lehrmittel: "NaTech 1|2",
  lehrmittelAliase: ["NaTech 1/2", "NaTech 1 | 2", "NaTech 1-2", "NaTech 1–2", "NaTech"],
  titel: "NaTech 1|2 – Themen 2. Schuljahr",
  stufen: ["2. Klasse"],
  bloecke: [
    {"id": "thema-6", "titel": "Überall tut sich etwas", "phase": "Themen", "vorschlagWochen": 4, "strang": "Energie", "strangNr": 6, "kapitel": [], "lp21Codes": ["NMG.3.2"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-7", "titel": "Was hält ein Magnet?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Magnetismus", "strangNr": 7, "kapitel": [], "lp21Codes": ["NMG.5.2"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-8", "titel": "Der Himmel – Begleiter jeden Tag", "phase": "Themen", "vorschlagWochen": 4, "strang": "Wetter und Himmelskörper", "strangNr": 8, "kapitel": [], "lp21Codes": ["NMG.4.4", "NMG.4.5"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-9", "titel": "Ich bin ich, du bist du", "phase": "Themen", "vorschlagWochen": 4, "strang": "Identität", "strangNr": 9, "kapitel": [], "lp21Codes": ["NMG.1.1", "NMG.1.2", "NMG.1.6"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-10", "titel": "Was wächst denn da?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Entwicklung", "strangNr": 10, "kapitel": [], "lp21Codes": ["NMG.2.2", "NMG.2.3", "NMG.2.4", "NMG.2.5", "NMG.2.6"]} satisfies LehrmittelVorlageBlock,
  ],
};

export const natech3: LehrmittelVorlage = {
  ...basis,
  id: "natech-3",
  lehrmittel: "NaTech 3|4",
  lehrmittelAliase: ["NaTech 3/4", "NaTech 3 | 4", "NaTech 3-4", "NaTech 3–4", "NaTech"],
  titel: "NaTech 3|4 – Themen 3. Schuljahr",
  stufen: ["3. Klasse"],
  bloecke: [
    {"id": "thema-1", "titel": "Im Reich der Stoffe", "phase": "Themen", "vorschlagWochen": 4, "strang": "Stoffe", "strangNr": 1, "kapitel": [], "lp21Codes": ["NMG.3.3", "NMG.3.4"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-2", "titel": "Was ist stabil?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Technik", "strangNr": 2, "kapitel": [], "lp21Codes": ["NMG.5.1", "NMG.5.3"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-3", "titel": "Hören, fühlen, sehen", "phase": "Themen", "vorschlagWochen": 4, "strang": "Sinne", "strangNr": 3, "kapitel": [], "lp21Codes": ["NMG.4.1", "NMG.4.2", "NMG.4.3"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-4", "titel": "Wie geht es dir?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Körper", "strangNr": 4, "kapitel": [], "lp21Codes": ["NMG.1.2", "NMG.1.3", "NMG.1.4"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-5", "titel": "Faszination Boden", "phase": "Themen", "vorschlagWochen": 4, "strang": "Vielfalt", "strangNr": 5, "kapitel": [], "lp21Codes": ["NMG.2.1", "NMG.2.2", "NMG.2.4", "NMG.2.5", "NMG.2.6"]} satisfies LehrmittelVorlageBlock,
  ],
};

export const natech4: LehrmittelVorlage = {
  ...basis,
  id: "natech-4",
  lehrmittel: "NaTech 3|4",
  lehrmittelAliase: ["NaTech 3/4", "NaTech 3 | 4", "NaTech 3-4", "NaTech 3–4", "NaTech"],
  titel: "NaTech 3|4 – Themen 4. Schuljahr",
  stufen: ["4. Klasse"],
  bloecke: [
    {"id": "thema-6", "titel": "Umwandlungen auf der Spur", "phase": "Themen", "vorschlagWochen": 4, "strang": "Energie", "strangNr": 6, "kapitel": [], "lp21Codes": ["NMG.3.2"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-7", "titel": "Batterie, Kabel und Schalter", "phase": "Themen", "vorschlagWochen": 4, "strang": "Elektrizität", "strangNr": 7, "kapitel": [], "lp21Codes": ["NMG.5.1"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-8", "titel": "Sonne, Mond und Wolken", "phase": "Themen", "vorschlagWochen": 4, "strang": "Wetter und Himmelskörper", "strangNr": 8, "kapitel": [], "lp21Codes": ["NMG.4.4", "NMG.4.5"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-9", "titel": "Wer bist du? Wer wirst du?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Identität", "strangNr": 9, "kapitel": [], "lp21Codes": ["NMG.1.1", "NMG.1.5", "NMG.1.6"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-10", "titel": "Keimlinge, Samen und Tiere", "phase": "Themen", "vorschlagWochen": 4, "strang": "Entwicklung", "strangNr": 10, "kapitel": [], "lp21Codes": ["NMG.2.1", "NMG.2.2", "NMG.2.3", "NMG.2.5"]} satisfies LehrmittelVorlageBlock,
  ],
};

export const natech5: LehrmittelVorlage = {
  ...basis,
  id: "natech-5",
  lehrmittel: "NaTech 5|6",
  lehrmittelAliase: ["NaTech 5/6", "NaTech 5 | 6", "NaTech 5-6", "NaTech 5–6", "NaTech"],
  titel: "NaTech 5|6 – Themen 5. Schuljahr",
  stufen: ["5. Klasse"],
  bloecke: [
    {"id": "thema-1", "titel": "Süsse Chemie", "phase": "Themen", "vorschlagWochen": 4, "strang": "Stoffe", "strangNr": 1, "kapitel": [], "lp21Codes": ["NMG.3.3", "NMG.3.4"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-2", "titel": "Warum ist ein Velo schnell?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Technik", "strangNr": 2, "kapitel": [], "lp21Codes": ["NMG.3.1", "NMG.5.1", "NMG.5.3"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-3", "titel": "Gesehen und gehört", "phase": "Themen", "vorschlagWochen": 4, "strang": "Sinne", "strangNr": 3, "kapitel": [], "lp21Codes": ["NMG.4.1", "NMG.4.2", "NMG.4.3"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-4", "titel": "Was braucht mein Körper?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Körper", "strangNr": 4, "kapitel": [], "lp21Codes": ["NMG.1.2", "NMG.1.3", "NMG.1.4"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-5", "titel": "Vielfältiges Leben um uns", "phase": "Themen", "vorschlagWochen": 4, "strang": "Vielfalt", "strangNr": 5, "kapitel": [], "lp21Codes": ["NMG.2.1", "NMG.2.4", "NMG.2.6"]} satisfies LehrmittelVorlageBlock,
  ],
};

export const natech6: LehrmittelVorlage = {
  ...basis,
  id: "natech-6",
  lehrmittel: "NaTech 5|6",
  lehrmittelAliase: ["NaTech 5/6", "NaTech 5 | 6", "NaTech 5-6", "NaTech 5–6", "NaTech"],
  titel: "NaTech 5|6 – Themen 6. Schuljahr",
  stufen: ["6. Klasse"],
  bloecke: [
    {"id": "thema-6", "titel": "Woher kommt die Energie?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Energie", "strangNr": 6, "kapitel": [], "lp21Codes": ["NMG.3.2"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-7", "titel": "Überall Elektrizität", "phase": "Themen", "vorschlagWochen": 4, "strang": "Elektrizität", "strangNr": 7, "kapitel": [], "lp21Codes": ["NMG.5.2"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-8", "titel": "Der Himmel hat viele Gesichter", "phase": "Themen", "vorschlagWochen": 4, "strang": "Wetter und Himmelskörper", "strangNr": 8, "kapitel": [], "lp21Codes": ["NMG.4.4", "NMG.4.5"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-9", "titel": "Wie wirst du erwachsen?", "phase": "Themen", "vorschlagWochen": 4, "strang": "Identität", "strangNr": 9, "kapitel": [], "lp21Codes": ["NMG.1.2", "NMG.1.4", "NMG.1.5", "NMG.1.6"]} satisfies LehrmittelVorlageBlock,
    {"id": "thema-10", "titel": "Entwicklungen auf der Spur", "phase": "Themen", "vorschlagWochen": 4, "strang": "Entwicklung", "strangNr": 10, "kapitel": [], "lp21Codes": ["NMG.2.1", "NMG.2.3", "NMG.2.5", "NMG.2.6"]} satisfies LehrmittelVorlageBlock,
  ],
};

