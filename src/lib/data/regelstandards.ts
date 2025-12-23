/**
 * Regelstandards Kanton Solothurn
 * Statische Daten - keine Synchronisation mit Airtable erforderlich
 *
 * Diese Daten stammen aus: airtableinhalte/Kompetenzen Regelstandards-Grid view.csv
 */

import { Regelstandard } from "@/types";

export const REGELSTANDARDS: Regelstandard[] = [
  // Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen
  {
    rsCode: "RS.1.1.a",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Datensicherheit",
    kompetenzenLehrplan: ["IB.2.3.b", "IB.3.1.a"],
    kompetenzstufe: "…können sich mit eigenem Login anmelden und mit Passwörtern und persönlichen Informationen bewusst umgehen.",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.1.1.b",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Datensicherheit",
    kompetenzenLehrplan: ["IB.1.3.d", "IB.2.1.c", "IB.2.3.b", "IB.3.1.a"],
    kompetenzstufe: "…können mit Passwörtern und persönlichen Informationen bewusst umgehen und können Botschaften verschlüsseln.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.1.1.c",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Datensicherheit",
    kompetenzenLehrplan: ["IB.1.3.d", "IB.2.3.b", "IB.3.1.a"],
    kompetenzstufe: "…können eigene sichere Passwörter entwicklen und mit persönlichen Informationen verantwortungsvoll umgehen.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.1.1.d",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Datensicherheit",
    kompetenzenLehrplan: ["IB.2.3.n"],
    kompetenzstufe: "…können eigene sichere Passwörter entwickeln und kennen verschiedene kryptographische Methoden zur Verschlüsselung von Daten.",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.1.1.e",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Datensicherheit",
    kompetenzenLehrplan: [],
    kompetenzstufe: "…kennen Grundprinzipien zur Entschlüsselung unbekannter Codes (Hackerangriffe) und leiten daraus Massnahmen zum Schutz eigener Daten ab.",
    zyklus: "Zyklus 3",
    klassenstufe: "9."
  },
  {
    rsCode: "RS.1.2.a",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Urheberrecht",
    kompetenzenLehrplan: ["IB.1.3.e"],
    kompetenzstufe: "…wissen, dass eigene Werke und Werke anderer durch das Gesetz geschützt sind.",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.1.2.b",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Urheberrecht",
    kompetenzenLehrplan: ["IB.1.3.e"],
    kompetenzstufe: "…kennen die Grundzüge des Urheberrechts, sind dafür sensibilsiert und können Quellen verwendeter Bilder und Texte angeben.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.1.2.c",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Urheberrecht",
    kompetenzenLehrplan: ["IB.1.3.g"],
    kompetenzstufe: "…beachten beim Verwenden fremder Werke (z.B. Text, Bild, Video, Audio) das Urheberrecht und können zwischen geschützten und nicht geschützten Werken unterscheiden und Quellen adäquat verwenden.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.1.2.d",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Urheberrecht",
    kompetenzenLehrplan: ["IB.1.3.g"],
    kompetenzstufe: "…kennen das Konzept von Creative Commons und anderer Lizenzierungsmodelle.",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.1.3.a",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wahrnehmung von Medien im Alltag",
    kompetenzenLehrplan: ["IB.1.1.a"],
    kompetenzstufe: "…können über ihre Erlebnisse mit Medien (z.B. Fernsehen, Computer, Tablet, Spielkonsole) berichten.",
    zyklus: "Zyklus 1",
    klassenstufe: "KiGa,1./2."
  },
  {
    rsCode: "RS.1.3.b",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wahrnehmung von Medien im Alltag",
    kompetenzenLehrplan: ["IB.1.1.b"],
    kompetenzstufe: "…können über den eigenen Umgang mit Medien und damit zusammenhängenden Regeln berichten.",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.1.3.c",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wahrnehmung von Medien im Alltag",
    kompetenzenLehrplan: ["IB.1.1.b", "IB.1.2.d"],
    kompetenzstufe: "…können den Zweck der im Alltag verwendeten Medien benennen und kennen ihren persönlichen Medienkonsum.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.1.3.d",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wahrnehmung von Medien im Alltag",
    kompetenzenLehrplan: ["IB.1.2.f"],
    kompetenzstufe: "…können Auswirkungen von digitalen Medien und Internet auf die Schulsituation und Freizeit wahrnehmen und darüber berichten.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.1.3.e",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wahrnehmung von Medien im Alltag",
    kompetenzenLehrplan: ["IB.1.1.e"],
    kompetenzstufe: "…können Auswirkungen von digitalen Medien und Internet auf die Gesellschaft wahrnehmen und kennen problematische Formen der Nutzung (z.B. Cybermobbing, Online-Sucht).",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.1.3.f",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wahrnehmung von Medien im Alltag",
    kompetenzenLehrplan: ["IB.1.1.e", "IB.1.1.f"],
    kompetenzstufe: "…können die Folgen ihres Handelns abschätzen und ihr Verhalten dementsprechend anpassen.",
    zyklus: "Zyklus 3",
    klassenstufe: "9."
  },
  {
    rsCode: "RS.1.4.a",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Interpretation von Botschaften",
    kompetenzenLehrplan: ["IB.1.2.a", "IB.1.2.b"],
    kompetenzstufe: "…können digitalen, multimedial präsentierten Geschichten (z.B. Film, digitale Bilderbücher) folgen und die Wirkung auf sich in Worte fassen.",
    zyklus: "Zyklus 1",
    klassenstufe: "KiGa,1./2."
  },
  {
    rsCode: "RS.1.4.b",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Interpretation von Botschaften",
    kompetenzenLehrplan: ["IB.1.2.a"],
    kompetenzstufe: "…können einfache, digitale Texte und multimedial präsentierte Geschichten (z.B. Film, digitale Bilderbücher) verstehen und die Wirkung auf sich und andere in Worte fassen.",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.1.4.c",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Interpretation von Botschaften",
    kompetenzenLehrplan: ["IB.1.2.d"],
    kompetenzstufe: "…können Absichten und Wirkungen (z.B. Information, Unterhaltung, Werbung) in digital angebotenen Texten, Bildern, Grafiken, Filmsequenzen, Audiobeiträgen erkennen.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.1.4.d",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Interpretation von Botschaften",
    kompetenzenLehrplan: ["IB.1.2.f", "IB.1.2.g", "IB.1.2.h"],
    kompetenzstufe: "…können offensichtliche und versteckte Absichten und Wirkungen (z.B. Information, Unterhaltung, Werbung) in digital angebotenen Texten, Bildern, Grafiken, Filmsequenzen, Audiobeiträgen erkennen.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.1.4.e",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Interpretation von Botschaften",
    kompetenzenLehrplan: ["IB.1.2.g", "IB.1.2.h"],
    kompetenzstufe: "…können offensichtliche und versteckte Absichten und Wirkungen (z.B. Information, Unterhaltung, Werbung) in digital angebotenen Texten, Bildern, Grafiken, Filmsequenzen, Audiobeiträgen erkennen und dies in die Gestaltung eigener Beiträge einbeziehen.",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.1.5.a",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Datenspuren im Netz und Datenschutz",
    kompetenzenLehrplan: ["IB.1.3.d"],
    kompetenzstufe: "…kennen Regeln im Zusammenhang mit Passwörtern und persönlichen Daten.",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.1.5.b",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Datenspuren im Netz und Datenschutz",
    kompetenzenLehrplan: ["IB.1.4.b"],
    kompetenzstufe: "…wissen, wie persönliche Daten im Netz gesammelt werden und können Regeln im Umgang mit Passwörtern und Datenfreigaben einhalten.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.1.5.c",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Datenspuren im Netz und Datenschutz",
    kompetenzenLehrplan: ["IB.1.4.c", "IB.1.4.e"],
    kompetenzstufe: "…wissen, wie persönliche Daten in verschiedenen Netzwerken (Social Media, lokale Netze u.a.) gesammelt werden und kennen wirkungsvolle Massnahmen (Einstellungen, Filter u.a) zur Einschränkung.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.1.5.d",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Datenspuren im Netz und Datenschutz",
    kompetenzenLehrplan: [],
    kompetenzstufe: "…wissen, was Privatsphäre ist, wie sie diese im Netz schützen, und kennen die Auswirkungen unerlaubter Handlungen.",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.1.5.e",
    handlungsfeld: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen",
    handlungsfeldNummer: 1,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Datenspuren im Netz und Datenschutz",
    kompetenzenLehrplan: [],
    kompetenzstufe: "…kennen Grundzüge des Datenschutzgesetzes und handeln entsprechend.",
    zyklus: "Zyklus 3",
    klassenstufe: "9."
  },
  // Handlungsfeld 2: Kommunizieren und Kooperieren
  {
    rsCode: "RS.2.1.a",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.1.4.a", "IB.1.4.c", "IB.3.3.a"],
    kompetenzstufe: "…können mit verschiedenen Kommunikationsmedien (z.B. Brief, E-Mail, SMS, Telefon, Videotelefonie) eine Botschaft übermitteln.",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.2.1.b",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.1.4.b", "IB.1.4.c", "IB.3.3.c"],
    kompetenzstufe: "…können traditionelle und altersgerechte netzbasierte Kommunikationsformen nutzen.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.2.1.c",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.1.4.c", "IB.3.3.c"],
    kompetenzstufe: "…können sich an der Kommunikation über Social Media-Plattformen beteiligen.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.2.1.d",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.1.4.f", "IB.3.3.a", "IB.3.3.c"],
    kompetenzstufe: "…können verschiedene netzbasierte Medien zur Kommunikation und zum Datenaustausch nutzen.",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.2.1.e",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.2.3.m"],
    kompetenzstufe: "…kennen das Grundprinzip und die Funktionsweise der Informations- und Kommunikationstechnik, die weltweite und digitale Kommunikation ermöglicht (Backbone, Internet-Knoten, Paketierung, IP, u.a.).",
    zyklus: "Zyklus 3",
    klassenstufe: "9."
  },
  {
    rsCode: "RS.2.2.a",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Kooperationswerkzeuge",
    kompetenzenLehrplan: ["IB.2.3.j"],
    kompetenzstufe: "…können einfache Regeln im Hinblick auf kooperatives Lernen im Netz einhalten (z.B. Benennung von Dateien, Speicherorte).",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.2.2.b",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Kooperationswerkzeuge",
    kompetenzenLehrplan: ["IB.2.3.j"],
    kompetenzstufe: "…können bei arbeitsteiligen Aufträgen Regeln zur Benennung von Dateien oder Speicherorten einhalten und verschiedene Arbeitsergebnisse zu einem gemeinsamen Produkt am Computer zusammenführen.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.2.2.c",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Kooperationswerkzeuge",
    kompetenzenLehrplan: ["IB.2.3.j"],
    kompetenzstufe: "…können in einem Netzwerk Dokumente bearbeiten und dabei eigene Arbeitsschritte für die andern Beteiligten sichtbar machen.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.2.2.d",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Kooperationswerkzeuge",
    kompetenzenLehrplan: ["IB.2.3.j"],
    kompetenzstufe: "…können die Möglichkeiten von netzbasierten Plattformen zum Austausch und gemeinsamen Wissensaufbau einsetzen.",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.2.3.a",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wirkung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.1.4.c"],
    kompetenzstufe: "…können Unterschiede verschiedener Kommunikationsmedien (z.B. Brief, E-Mail, SMS, Telefon, Videotelefonie) beschreiben.",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.2.3.b",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wirkung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.1.4.b", "IB.1.4.c"],
    kompetenzstufe: "…können eine Passung zwischen Kommunikationsmedium und Situation herstellen.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.2.3.c",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wirkung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.1.4.c", "IB.1.4.d", "IB.1.4.e"],
    kompetenzstufe: "…sind sich der Wirkung ihres Kommunikationsstils mittels digitalen Medien als Sender an unterschiedliche Empfänger bewusst.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.2.3.d",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Wirkung von Kommunikationsmedien",
    kompetenzenLehrplan: ["IB.1.3.f", "IB.1.4.e", "IB.1.4.f"],
    kompetenzstufe: "…können den Kommunikationsstil und das Kommunikationsmedium der jeweiligen Situation anpassen (formell, kollegial).",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.2.4.a",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Netiquette",
    kompetenzenLehrplan: ["IB.1.1.d", "IB.1.3.d", "IB.1.3.g", "IB.1.4.c"],
    kompetenzstufe: "…kennen Regeln des Umgangs für die Kommunikation mit digitalen Medien und können diese einhalten.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.2.4.b",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Netiquette",
    kompetenzenLehrplan: ["IB.1.1.d", "IB.1.1.e", "IB.1.3.f"],
    kompetenzstufe: "…wissen um verletzende Wirkung und rechtliche Konsequenzen von Drohungen, Beleidigungen oder Gerüchten mittels digitaler Medien.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.2.4.c",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Netiquette",
    kompetenzenLehrplan: ["IB.1.1.c", "IB.1.1.d"],
    kompetenzstufe: "…kennen Erscheinungsformen und Auswirkungen von Cybermobbing und wissen, wo sie Hilfe holen können.",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.2.4.d",
    handlungsfeld: "Handlungsfeld 2: Kommunizieren und Kooperieren",
    handlungsfeldNummer: 2,
    dimension: "Dimension Verständnis: Verstehen, Einordnen, Orientieren",
    kompetenz: "Netiquette",
    kompetenzenLehrplan: ["IB.1.1.e"],
    kompetenzstufe: "…kennen die juristischen Grundlagen des Jugendschutzes und Persönlichkeitesrechtes und wissen um die Konsequenzen bei einem Verstoss.",
    zyklus: "Zyklus 3",
    klassenstufe: "9."
  },
  // Handlungsfeld 3: Recherchieren, Ordnen & Visualisieren (Auszug - Rest wird hinzugefügt)
  {
    rsCode: "RS.3.1.a",
    handlungsfeld: "Handlungsfeld 3: Recherchieren, Ordnen & Visualisieren",
    handlungsfeldNummer: 3,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Informationsquellen",
    kompetenzenLehrplan: ["IB.1.2.c"],
    kompetenzstufe: "…entwickeln Neugierde für Sachfragen und können die zur Verfügung stehenden Medien zum Entdecken der Umwelt (z.B. Sachbücher, Apps, CD-ROMs, interaktive Sachbücher) nutzen.",
    zyklus: "Zyklus 1",
    klassenstufe: "KiGa,1./2."
  },
  {
    rsCode: "RS.3.1.b",
    handlungsfeld: "Handlungsfeld 3: Recherchieren, Ordnen & Visualisieren",
    handlungsfeldNummer: 3,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Informationsquellen",
    kompetenzenLehrplan: ["IB.1.2.c", "IB.3.2.a", "IB.3.2.b"],
    kompetenzstufe: "…können einfach strukturierte und altersgerechte digitale Informationsquellen (im Internet, lokal installiert, als App) nutzen.",
    zyklus: "Zyklus 2",
    klassenstufe: "3./4."
  },
  {
    rsCode: "RS.3.1.c",
    handlungsfeld: "Handlungsfeld 3: Recherchieren, Ordnen & Visualisieren",
    handlungsfeldNummer: 3,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Informationsquellen",
    kompetenzenLehrplan: ["IB.1.2.e", "IB.3.2.b"],
    kompetenzstufe: "…kennen elementare Suchstrategien für die Informationsbeschaffung im Internet und können diese anwenden.",
    zyklus: "Zyklus 2",
    klassenstufe: "5./6."
  },
  {
    rsCode: "RS.3.1.d",
    handlungsfeld: "Handlungsfeld 3: Recherchieren, Ordnen & Visualisieren",
    handlungsfeldNummer: 3,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Informationsquellen",
    kompetenzenLehrplan: ["IB.3.2.b", "IB.3.2.c", "IB.3.2.d"],
    kompetenzstufe: "…kennen unterschiedliche Suchstrategien für die Informationsbeschaffung im Internet und können diese anwenden.",
    zyklus: "Zyklus 3",
    klassenstufe: "7."
  },
  {
    rsCode: "RS.3.1.e",
    handlungsfeld: "Handlungsfeld 3: Recherchieren, Ordnen & Visualisieren",
    handlungsfeldNummer: 3,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Informationsquellen",
    kompetenzenLehrplan: ["IB.3.2.b", "IB.3.2.c", "IB.3.2.d"],
    kompetenzstufe: "…können effiziente Suchstrategien im Internet einsetzen und verfügen über ein Repertoire an vertrauenswürdigen Informationsquellen im Netz.",
    zyklus: "Zyklus 3",
    klassenstufe: "8."
  },
  {
    rsCode: "RS.3.1.f",
    handlungsfeld: "Handlungsfeld 3: Recherchieren, Ordnen & Visualisieren",
    handlungsfeldNummer: 3,
    dimension: "Dimension Zugang: Zugang finden, Handhaben, Anwenden",
    kompetenz: "Nutzung von Informationsquellen",
    kompetenzenLehrplan: ["IB.2.3.i"],
    kompetenzstufe: "…kennen grundlegende Sortier- und Suchalgorithmen zum Verständnis von Suchmaschinen.",
    zyklus: "Zyklus 3",
    klassenstufe: "9."
  },
];

// Hilfsfunktionen

/**
 * Alle Regelstandards nach Handlungsfeld gruppiert
 */
export function getRegelstandardsByHandlungsfeld(): Map<number, Regelstandard[]> {
  const grouped = new Map<number, Regelstandard[]>();

  for (const rs of REGELSTANDARDS) {
    const existing = grouped.get(rs.handlungsfeldNummer) || [];
    existing.push(rs);
    grouped.set(rs.handlungsfeldNummer, existing);
  }

  return grouped;
}

/**
 * Regelstandard nach RS-Code finden
 */
export function getRegelstandardByCode(rsCode: string): Regelstandard | undefined {
  return REGELSTANDARDS.find(rs => rs.rsCode === rsCode);
}

/**
 * Alle Regelstandards für einen bestimmten LP-Code finden
 */
export function getRegelstandardsByLPCode(lpCode: string): Regelstandard[] {
  return REGELSTANDARDS.filter(rs => rs.kompetenzenLehrplan.includes(lpCode));
}

/**
 * Alle Regelstandards für eine Klassenstufe
 */
export function getRegelstandardsByKlassenstufe(klassenstufe: string): Regelstandard[] {
  return REGELSTANDARDS.filter(rs => rs.klassenstufe.includes(klassenstufe));
}

/**
 * Alle Regelstandards für einen Zyklus
 */
export function getRegelstandardsByZyklus(zyklus: string): Regelstandard[] {
  return REGELSTANDARDS.filter(rs => rs.zyklus === zyklus);
}

/**
 * Handlungsfeld-Namen
 */
export const HANDLUNGSFELDER: { nummer: number; name: string; kurzname: string }[] = [
  { nummer: 1, name: "Handlungsfeld 1: Auswählen, Beurteilen & Vorbeugen", kurzname: "Auswählen, Beurteilen & Vorbeugen" },
  { nummer: 2, name: "Handlungsfeld 2: Kommunizieren und Kooperieren", kurzname: "Kommunizieren und Kooperieren" },
  { nummer: 3, name: "Handlungsfeld 3: Recherchieren, Ordnen & Visualisieren", kurzname: "Recherchieren, Ordnen & Visualisieren" },
  { nummer: 4, name: "Handlungsfeld 4: Präsentieren & Publizieren", kurzname: "Präsentieren & Publizieren" },
  { nummer: 5, name: "Handlungsfeld 5: Interagieren, Strukturieren & Programmieren", kurzname: "Interagieren, Strukturieren & Programmieren" },
  { nummer: 6, name: "Handlungsfeld 6: Kreieren, Komponieren & Gestalten", kurzname: "Kreieren, Komponieren & Gestalten" },
  { nummer: 7, name: "Handlungsfeld 7: Lernen, Verarbeiten & Transferieren", kurzname: "Lernen, Verarbeiten & Transferieren" },
];

/**
 * Mapping LP-Code zu Regelstandard-Codes (für bidirektionale Verknüpfung)
 */
export function buildLPCodeToRegelstandardsMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const rs of REGELSTANDARDS) {
    for (const lpCode of rs.kompetenzenLehrplan) {
      const existing = map.get(lpCode) || [];
      if (!existing.includes(rs.rsCode)) {
        existing.push(rs.rsCode);
      }
      map.set(lpCode, existing);
    }
  }

  return map;
}
