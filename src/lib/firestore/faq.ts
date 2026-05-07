import { getAdminDb } from "@/lib/firebase/admin";
import { FAQItem, FAQCategory } from "@/types";

const FAQ_COLLECTION = "faq_items";

// Reihenfolge der Kategorien für Sortierung
const CATEGORY_ORDER: Record<FAQCategory, number> = {
  allgemein: 1,
  jahresplan: 2,
  themen: 3,
  dateien: 4,
  admin: 5,
};

/**
 * Holt alle aktiven FAQ-Einträge, sortiert nach Kategorie und Order
 * (Sortierung erfolgt in JavaScript, um Firestore-Index-Probleme zu vermeiden)
 */
export async function getAllFAQItems(includeInactive = false): Promise<FAQItem[]> {
  const adminDb = getAdminDb();

  // Hole alle Dokumente ohne orderBy (vermeidet Index-Probleme)
  const snapshot = await adminDb.collection(FAQ_COLLECTION).get();

  let items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as FAQItem[];

  // Filter inaktive Items wenn nötig
  if (!includeInactive) {
    items = items.filter((item) => item.isActive);
  }

  // Sortiere nach Kategorie und dann nach Order
  items.sort((a, b) => {
    const categoryDiff = (CATEGORY_ORDER[a.category] || 99) - (CATEGORY_ORDER[b.category] || 99);
    if (categoryDiff !== 0) return categoryDiff;
    return (a.order || 0) - (b.order || 0);
  });

  return items;
}

/**
 * Holt FAQ-Einträge für eine bestimmte Kategorie
 */
export async function getFAQItemsByCategory(
  category: FAQCategory,
  includeInactive = false
): Promise<FAQItem[]> {
  const adminDb = getAdminDb();

  // Nur where ohne orderBy (vermeidet Index-Probleme)
  const snapshot = await adminDb
    .collection(FAQ_COLLECTION)
    .where("category", "==", category)
    .get();

  let items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as FAQItem[];

  // Filter inaktive wenn nötig
  if (!includeInactive) {
    items = items.filter((item) => item.isActive);
  }

  // Sortiere nach Order in JavaScript
  items.sort((a, b) => (a.order || 0) - (b.order || 0));

  return items;
}

/**
 * Holt einen einzelnen FAQ-Eintrag
 */
export async function getFAQItem(id: string): Promise<FAQItem | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection(FAQ_COLLECTION).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as FAQItem;
}

/**
 * Erstellt einen neuen FAQ-Eintrag
 */
export async function createFAQItem(
  item: Omit<FAQItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "createdByName">,
  createdBy: string,
  createdByName: string
): Promise<string> {
  const adminDb = getAdminDb();

  // Hole die höchste Order für diese Kategorie (nur where, sortiere in JS)
  const existingItems = await adminDb
    .collection(FAQ_COLLECTION)
    .where("category", "==", item.category)
    .get();

  let maxOrder = 0;
  existingItems.docs.forEach((doc) => {
    const order = doc.data().order || 0;
    if (order > maxOrder) maxOrder = order;
  });

  const now = new Date();
  const docRef = await adminDb.collection(FAQ_COLLECTION).add({
    ...item,
    order: item.order ?? maxOrder + 1,
    isActive: item.isActive ?? true,
    createdBy,
    createdByName,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * Aktualisiert einen FAQ-Eintrag
 */
export async function updateFAQItem(
  id: string,
  updates: Partial<Omit<FAQItem, "id" | "createdAt" | "createdBy" | "createdByName">>
): Promise<void> {
  const adminDb = getAdminDb();

  await adminDb.collection(FAQ_COLLECTION).doc(id).update({
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * Löscht einen FAQ-Eintrag (hart löschen)
 */
export async function deleteFAQItem(id: string): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(FAQ_COLLECTION).doc(id).delete();
}

/**
 * Setzt einen FAQ-Eintrag auf aktiv/inaktiv (soft delete)
 */
export async function toggleFAQItemActive(id: string, isActive: boolean): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection(FAQ_COLLECTION).doc(id).update({
    isActive,
    updatedAt: new Date(),
  });
}

/**
 * Aktualisiert die Reihenfolge mehrerer FAQ-Einträge
 */
export async function updateFAQItemsOrder(
  items: { id: string; order: number }[]
): Promise<void> {
  const adminDb = getAdminDb();
  const batch = adminDb.batch();

  for (const item of items) {
    const docRef = adminDb.collection(FAQ_COLLECTION).doc(item.id);
    batch.update(docRef, { order: item.order, updatedAt: new Date() });
  }

  await batch.commit();
}

/**
 * Initialisiert die FAQ-Sammlung mit Standard-Einträgen
 * (nur wenn die Sammlung leer ist)
 */
export async function initializeFAQItems(
  createdBy: string,
  createdByName: string
): Promise<number> {
  const adminDb = getAdminDb();

  // Prüfen ob schon Einträge existieren
  const existing = await adminDb.collection(FAQ_COLLECTION).limit(1).get();
  if (!existing.empty) {
    return 0; // Bereits initialisiert
  }

  const defaultItems: Omit<FAQItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "createdByName">[] = [
    // Allgemein
    {
      question: "Was ist die MIA-App?",
      answer: "Die MIA-App ist eine Webanwendung für Lehrpersonen zur Verwaltung des Jahresplans für 'Medien, Informatik und Anwendungskompetenzen (MIA)'. Sie ermöglicht es, Themen nach Klassenstufe und Zeitraum zu organisieren, eigene Themen zu erstellen und Materialien mit Kolleg:innen zu teilen.",
      category: "allgemein",
      order: 1,
      isActive: true,
    },
    {
      question: "Wie ändere ich meine Klassenstufe?",
      answer: "Gehen Sie zum Dashboard und klicken Sie auf 'Stufe bearbeiten' neben Ihrer aktuellen Stufe. Wählen Sie die gewünschte Klassenstufe aus und speichern Sie die Änderung. Der Jahresplan wird automatisch für die neue Stufe angezeigt.",
      category: "allgemein",
      order: 2,
      isActive: true,
    },
    {
      question: "Kann ich Themen für andere Klassenstufen anschauen?",
      answer: "Ja! Im Jahresplan gibt es ein Dropdown-Menü 'Andere Stufe anschauen', mit dem Sie temporär Themen für andere Klassenstufen ansehen können. Ihre eigene Stufe bleibt dabei unverändert.",
      category: "allgemein",
      order: 3,
      isActive: true,
    },
    {
      question: "Was bedeuten die verschiedenen Roboter-Bilder im Jahresplan?",
      answer: "Die Roboter-Bilder zeigen die verschiedenen Zeiträume im Schuljahr: Herbst-Roboter (Sommer- bis Herbstferien), Weihnachts-Roboter (Herbst- bis Weihnachtsferien), Winter-Roboter (Weihnachts- bis Winterferien), Frühlings-Roboter (Winter- bis Frühlingsferien) und Sommer-Roboter (Frühlings- bis Sommerferien).",
      category: "allgemein",
      order: 4,
      isActive: true,
    },
    // Jahresplan
    {
      question: "Wie finde ich ein bestimmtes Thema im Jahresplan?",
      answer: "Klicken Sie auf der Lehrplan-Seite auf eine Unterrichtsidee - Sie werden automatisch zum Jahresplan weitergeleitet und das entsprechende Thema wird geöffnet. Alternativ können Sie im Lehrmittel-Bereich nach Themen suchen.",
      category: "jahresplan",
      order: 1,
      isActive: true,
    },
    {
      question: "Was sind die Kompetenzen-Badges bei den Themen?",
      answer: "Die Kompetenzen-Badges zeigen die Lehrplan-21 Kompetenzen, die mit dem jeweiligen Thema abgedeckt werden. Klicken Sie auf einen Badge, um Details zur Kompetenz zu sehen, einschliesslich Kompetenzstufe, Zyklus und weitere Unterrichtsideen.",
      category: "jahresplan",
      order: 2,
      isActive: true,
    },
    {
      question: "Wie kann ich die Lektionsplanung eines Themas ansehen?",
      answer: "Klicken Sie auf ein Thema im Jahresplan und dann auf den Button 'Lektionsplanung anzeigen'. Sie sehen dann alle Lektionen mit Aufgaben, Material, Einstieg, Hauptteil und Abschluss. Die Lektionsplanung kann auch als PDF oder Markdown exportiert werden.",
      category: "jahresplan",
      order: 3,
      isActive: true,
    },
    {
      question: "Was ist der PICTS-Link im Themen-Dialog?",
      answer: "Der PICTS-Link führt zur Buchungsseite für PICTS-Unterstützung (Pädagogischer ICT-Support) Ihrer Schule. Dort können Sie Unterstützung für die Durchführung des Themas anfragen.",
      category: "jahresplan",
      order: 4,
      isActive: true,
    },
    // Themen & Lektionen
    {
      question: "Wie erstelle ich ein eigenes Thema?",
      answer: "Gehen Sie zu 'Thema erstellen' in der Seitenleiste. Füllen Sie das Formular aus: Thema-Name, Beschreibung, Klassenstufen, Zeitraum und Kompetenzen. Sie können auch Lektionen direkt hinzufügen. Speichern Sie als Entwurf oder reichen Sie zur Prüfung ein.",
      category: "themen",
      order: 1,
      isActive: true,
    },
    {
      question: "Was passiert nach dem Einreichen eines Themas?",
      answer: "Nach dem Einreichen wird Ihr Thema von einem PICTS-Admin geprüft. Sie erhalten eine Benachrichtigung (Glocken-Symbol), wenn das Thema freigegeben oder abgelehnt wurde. Bei Ablehnung sehen Sie das Feedback und können das Thema überarbeiten.",
      category: "themen",
      order: 2,
      isActive: true,
    },
    {
      question: "Kann ich ein freigegebenes Thema noch bearbeiten?",
      answer: "Ja, Sie können auch freigegebene Themen bearbeiten. Nach dem Speichern geht das Thema jedoch wieder in den Status 'Zur Prüfung' und muss erneut freigegeben werden.",
      category: "themen",
      order: 3,
      isActive: true,
    },
    {
      question: "Was bedeuten die Status-Badges bei meinen Themen?",
      answer: "Die Status-Badges zeigen den aktuellen Stand: 'Entwurf' (noch nicht eingereicht), 'Zur Prüfung' (eingereicht, wartet auf Review), 'Freigegeben' (genehmigt, für alle sichtbar), 'Abgelehnt' (mit Feedback zur Überarbeitung).",
      category: "themen",
      order: 4,
      isActive: true,
    },
    {
      question: "Wie füge ich Lektionen zu meinem Thema hinzu?",
      answer: "Beim Erstellen oder Bearbeiten eines Themas können Sie unten auf 'Lektion zum Thema erfassen' klicken. Füllen Sie die Felder aus (Aufgaben, Material, Einstieg, Hauptteil, Abschluss) und die Lektion wird automatisch nummeriert.",
      category: "themen",
      order: 5,
      isActive: true,
    },
    // Schul-Dateien
    {
      question: "Wie lade ich eine Datei hoch?",
      answer: "Gehen Sie zu 'Schul-Dateien' in der Seitenleiste und klicken Sie auf 'Datei hochladen'. Wählen Sie eine Datei (max. 50MB), geben Sie optional einen Namen und eine Beschreibung ein, wählen Sie die Freigabe und verknüpfen Sie optional Themen.",
      category: "dateien",
      order: 1,
      isActive: true,
    },
    {
      question: "Welche Dateiformate werden unterstützt?",
      answer: "Unterstützt werden: PDF, Word-Dokumente (.doc, .docx), Excel-Tabellen (.xls, .xlsx), PowerPoint-Präsentationen (.ppt, .pptx) und Bilder (JPEG, PNG, WEBP). Die maximale Dateigrösse beträgt 50MB.",
      category: "dateien",
      order: 2,
      isActive: true,
    },
    {
      question: "Was ist der Unterschied zwischen 'Privat' und 'Schule'?",
      answer: "'Privat' bedeutet, dass nur Sie die Datei sehen können. 'Schule' bedeutet, dass alle Lehrpersonen Ihrer Schule die Datei sehen und herunterladen können. Sie können die Freigabe jederzeit ändern.",
      category: "dateien",
      order: 3,
      isActive: true,
    },
    {
      question: "Wie verknüpfe ich eine Datei mit einem Thema?",
      answer: "Beim Hochladen können Sie auf 'Mit Themen verknüpfen' klicken und Themen auswählen. Nachträglich können Sie die Verknüpfungen bearbeiten, indem Sie auf das Stift-Symbol bei der Datei klicken. Verknüpfte Dateien erscheinen im Themen-Detail-Dialog.",
      category: "dateien",
      order: 4,
      isActive: true,
    },
    {
      question: "Können Kolleg:innen meine Dateien löschen?",
      answer: "Nein, nur Sie selbst können Ihre eigenen Dateien löschen. PICTS-Admins Ihrer Schule können jedoch alle Dateien der Schule verwalten.",
      category: "dateien",
      order: 5,
      isActive: true,
    },
    // Administration
    {
      question: "Was ist ein PICTS-Admin?",
      answer: "Ein PICTS-Admin ist eine Lehrperson mit erweiterten Rechten für die eigene Schule. Sie können eingereichte Themen prüfen und freigeben sowie alle Schul-Dateien verwalten. Der Status wird von einem Super-Admin vergeben.",
      category: "admin",
      order: 1,
      isActive: true,
    },
    {
      question: "Wie werde ich PICTS-Admin?",
      answer: "Wenden Sie sich an Ihren bestehenden PICTS-Admin oder den System-Administrator. Die Rolle 'picts_admin' muss in Ihrem Profil gesetzt werden.",
      category: "admin",
      order: 2,
      isActive: true,
    },
    {
      question: "Wo finde ich das Admin-Dashboard?",
      answer: "Als PICTS-Admin oder Super-Admin sehen Sie in der Seitenleiste den Menüpunkt 'Admin Dashboard'. Dort finden Sie alle eingereichten Themen Ihrer Schule zur Prüfung.",
      category: "admin",
      order: 3,
      isActive: true,
    },
    {
      question: "Wie verwalte ich FAQ-Einträge?",
      answer: "Als Admin können Sie auf der FAQ-Seite den Button 'Verwalten' aktivieren. Dann sehen Sie Buttons zum Erstellen, Bearbeiten, Aktivieren/Deaktivieren und Löschen von FAQ-Einträgen. Wählen Sie eine Kategorie für neue Einträge.",
      category: "admin",
      order: 4,
      isActive: true,
    },
    {
      question: "Wie erstelle oder bearbeite ich Schulen?",
      answer: "Als Super-Admin finden Sie in der Seitenleiste den Menüpunkt 'Schulen'. Dort können Sie neue Schulen erstellen, bestehende Schulen bearbeiten (Name, Ort, PICTS-Link) und Schulen ohne Benutzer löschen.",
      category: "admin",
      order: 5,
      isActive: true,
    },
    // Allgemein - neue Einträge
    {
      question: "Wie ändere ich meine Schule?",
      answer: "Im Dashboard unter 'Mein Profil' können Sie auf das Bearbeiten-Symbol neben Ihrer Schule klicken. Wählen Sie aus der Dropdown-Liste Ihre neue Schule aus und bestätigen Sie die Änderung.",
      category: "allgemein",
      order: 5,
      isActive: true,
    },
    {
      question: "Wie setze ich meinen Kanton?",
      answer: "Im Dashboard unter 'Mein Profil' können Sie auf das Bearbeiten-Symbol neben 'Kanton' klicken. Wählen Sie Ihren Kanton aus der Liste aller Schweizer Kantone aus. Der Kanton kann später für kantonsspezifische Funktionen verwendet werden.",
      category: "allgemein",
      order: 6,
      isActive: true,
    },
    // Kompetenzenpass
    {
      question: "Was ist der Kompetenzenpass?",
      answer: "Der Kompetenzenpass ist ein digitales Tool für Schüler:innen, um ihre MIA-Kompetenzen selbst einzuschätzen. Schüler:innen bewerten sich mit 1-5 Sternen, Lehrpersonen bestätigen die Bewertungen. Der Fortschritt wird mit Badges belohnt und kann als PDF exportiert werden.",
      category: "allgemein",
      order: 7,
      isActive: true,
    },
    {
      question: "Wie können Schüler:innen sich anmelden?",
      answer: "Schüler:innen melden sich über /schueler/login an. Die Zugangsdaten werden von der Lehrperson erstellt. Nach der Anmeldung sehen sie ihr persönliches Dashboard mit Kompetenzen, Badges und bearbeiteten Themen.",
      category: "allgemein",
      order: 8,
      isActive: true,
    },
    {
      question: "Wie erstelle ich eine Klasse mit Schülern?",
      answer: "Gehen Sie zu 'Meine Klassen' und klicken Sie auf 'Neue Klasse'. Geben Sie einen Namen ein und fügen Sie Schüler:innen hinzu. Für jeden Schüler können Sie Login-Daten generieren oder manuell festlegen.",
      category: "themen",
      order: 6,
      isActive: true,
    },
    {
      question: "Wie bestätige ich Schüler-Bewertungen?",
      answer: "Unter 'Meine Klassen' wählen Sie eine Klasse aus und sehen im Tab 'Bestätigungen' alle ausstehenden Bewertungen. Sie können jede Bewertung einzeln bestätigen, anpassen oder alle auf einmal bestätigen.",
      category: "themen",
      order: 7,
      isActive: true,
    },
    {
      question: "Wie vergebe ich Badges an Schüler?",
      answer: "Gehen Sie zu 'Badges' in der Seitenleiste. Dort können Sie eigene Badges erstellen und über 'Badge vergeben' an einzelne Schüler:innen vergeben. System-Badges werden automatisch bei Erreichen bestimmter Meilensteine vergeben.",
      category: "themen",
      order: 8,
      isActive: true,
    },
    {
      question: "Was sind die Kompetenz-Indikatoren?",
      answer: "Kompetenz-Indikatoren beschreiben verständlich, was die 1-5 Sterne bei jeder Kompetenz bedeuten. Sie helfen Schüler:innen, sich realistisch einzuschätzen. Admins können unter 'Indikatoren' für jede Kompetenz Beschreibungen hinterlegen.",
      category: "admin",
      order: 6,
      isActive: true,
    },
    {
      question: "Können Schüler:innen Belege für ihre Kompetenzen hochladen?",
      answer: "Ja! Schüler:innen können bei der Bewertung Artefakte (Bilder, PDFs oder Links) als Belege hochladen. Lehrpersonen sehen diese bei der Bestätigung und können Kommentare hinzufügen. Die Belege erscheinen auch im exportierten Kompetenzenpass.",
      category: "themen",
      order: 9,
      isActive: true,
    },
    {
      question: "Wie kann der Kompetenzenpass exportiert werden?",
      answer: "Schüler:innen können unter 'Export' ihren Kompetenzenpass als PDF herunterladen. Das PDF enthält ein Deckblatt mit Avatar, eine Übersicht aller Bewertungen mit Sternen, erhaltene Badges und bearbeitete Themen.",
      category: "allgemein",
      order: 9,
      isActive: true,
    },
    // Jahresplanung (NEU)
    {
      question: "Was ist die Jahresplanung?",
      answer: "Die Jahresplanung ist ein Planungstool für den gesamten Unterricht über alle Fachbereiche (Deutsch, Mathematik, NMG etc.). Sie können Unterrichtseinheiten pro Quartal und Woche planen, Beurteilungen zuordnen und die Planung als PDF exportieren. Sie finden die Jahresplanung im Menü unter 'Übersicht'.",
      category: "jahresplan",
      order: 5,
      isActive: true,
    },
    {
      question: "Was ist der Unterschied zwischen 'Jahresplan MIA' und 'Jahresplanung'?",
      answer: "'Jahresplan MIA' zeigt die vorgefertigten MIA-Themen (Medien, Informatik und Anwendungskompetenzen) im Kanban-Board. Die 'Jahresplanung' ist ein separates Tool für die fächerübergreifende Unterrichtsplanung über alle Fachbereiche hinweg, mit Quartals- und Wochenansicht.",
      category: "jahresplan",
      order: 6,
      isActive: true,
    },
    {
      question: "Wie erstelle ich eine Unterrichtseinheit in der Jahresplanung?",
      answer: "Öffnen Sie die Jahresplanung und klicken Sie auf 'Neue Einheit'. Wählen Sie einen Fachbereich, geben Sie einen Titel ein und legen Sie den Zeitraum (von KW bis KW) fest. Optional können Sie Kompetenzen, Beurteilungen und MIA-Themen verknüpfen.",
      category: "jahresplan",
      order: 7,
      isActive: true,
    },
    {
      question: "Wie kopiere ich eine Jahresplanung aus einem früheren Schuljahr?",
      answer: "In der Jahresplanung klicken Sie auf 'Schuljahr kopieren'. Wählen Sie das Quell-Schuljahr aus (bis zu 6 Jahre zurück) und bestätigen Sie. Alle Einheiten werden in das aktuelle Schuljahr kopiert. Praktisch, wenn Sie alle zwei Jahre dieselbe Stufe unterrichten.",
      category: "jahresplan",
      order: 8,
      isActive: true,
    },
    {
      question: "Wie verwalte ich die Schulferien in der Jahresplanung?",
      answer: "Klicken Sie in der Jahresplanung auf den Button 'Ferien'. Dort können Sie Ferien-Presets für Ihren Kanton laden oder individuelle Ferien manuell hinzufügen, bearbeiten und löschen. Die Ferienwochen werden in der Quartalsansicht grau markiert.",
      category: "jahresplan",
      order: 9,
      isActive: true,
    },
    {
      question: "Wie exportiere ich meine Jahresplanung als PDF?",
      answer: "In der Quartals- und Wochenansicht finden Sie einen 'PDF exportieren' Button. Das PDF enthält alle Einheiten mit Fachbereich-Farben, Beurteilungsmarkern sowie Ihren Namen und Ihre Klasse im Header.",
      category: "jahresplan",
      order: 10,
      isActive: true,
    },
    // Dashboard
    {
      question: "Wie kann ich meine Dashboard-Kacheln anpassen?",
      answer: "Auf dem Dashboard sehen Sie eine Kachel 'Kacheln anpassen' mit gestricheltem Rahmen. Klicken Sie darauf, um aus 12 verfügbaren Kacheln auszuwählen, welche auf Ihrem Dashboard angezeigt werden sollen. Mit 'Standard wiederherstellen' können Sie die Auswahl zurücksetzen.",
      category: "allgemein",
      order: 10,
      isActive: true,
    },
    // Integrative MIA-Umsetzung & MIA-Abdeckung (NEU 2026-05)
    {
      question: "Was bedeuten die 'Empfohlenen Integrationsfächer' bei einem Thema?",
      answer: "MIA-Themen können integrativ in andere Fächer eingebaut werden. Die 'Empfohlenen Integrationsfächer' zeigen, in welchen Fächern (z.B. Deutsch, Mathematik, NMG) sich ein Thema gut umsetzen lässt. Im Jahresplan MIA können Sie über das Filter-Dropdown 'Integrationsfach' alle Themen anzeigen, die zu einem bestimmten Fach passen – ideal, wenn Sie MIA-Inhalte in Ihre Fachplanung einbauen möchten.",
      category: "jahresplan",
      order: 11,
      isActive: true,
    },
    {
      question: "Wie nutze ich ein MIA-Thema als Vorlage für eine Jahresplanungs-Einheit?",
      answer: "Beim Erstellen oder Bearbeiten einer Einheit in der Jahresplanung sehen Sie unter 'MIA-Thema als Vorlage' den Button 'MIA-Thema auswählen'. Im Dialog werden bevorzugt Themen mit Empfehlung für den aktuellen Fachbereich angezeigt; mit einem Toggle können Sie auch alle übrigen MIA-Themen sehen. Bei Auswahl werden Titel, Lernziele und Kompetenzen automatisch übernommen. Funktioniert für alle Fachbereiche, nicht nur MI/IB.",
      category: "jahresplan",
      order: 12,
      isActive: true,
    },
    {
      question: "Was ist die MIA-Abdeckung?",
      answer: "Die MIA-Abdeckung (Menü → Übersicht → MIA-Abdeckung) zeigt für jede MI/IB-Kompetenzstufe, ob sie in Ihrer Jahresplanung abgedeckt ist – und falls ja, durch welche Einheit (Fach, KW, Titel). Eine Kompetenz gilt als abgedeckt, wenn sie entweder direkt einer Einheit zugewiesen ist oder das verknüpfte MIA-Thema sie mitbringt. So sehen Sie auf einen Blick, wo Lücken sind, besonders wenn MIA integrativ eingeplant ist.",
      category: "jahresplan",
      order: 13,
      isActive: true,
    },
    {
      question: "Wie wird zwischen MI und IB unterschieden (Kanton Solothurn)?",
      answer: "Im Lehrplan 21 gibt es 'Medien und Informatik' (MI). Der Kanton Solothurn nutzt für sein eigenes Fach den Code 'IB' (Informatische Bildung). Die App erkennt Ihren Kanton automatisch und zeigt entsprechend MI- oder IB-Codes an. Intern werden Duplikate (MI.1.2 ↔ IB.1.2) als eine Kompetenz behandelt, damit nichts doppelt gezählt wird.",
      category: "jahresplan",
      order: 14,
      isActive: true,
    },
    {
      question: "Warum sehe ich als SO-Lehrperson einen Hinweisbanner zur Integrativen Umsetzung?",
      answer: "Im Kanton Solothurn wird das Fach 'Informatische Bildung' (IB) ab Sommer 2027 nicht mehr als eigenes Fach unterrichtet. Die IB-Kompetenzen bleiben aber Pflicht und müssen integrativ in andere Fächer einfliessen. Der Hinweisbanner erscheint nur für SO-Lehrpersonen ab Schuljahr 2027/28 und verlinkt direkt zur MIA-Abdeckung. Sie können den Hinweis lokal ausblenden.",
      category: "jahresplan",
      order: 15,
      isActive: true,
    },
    {
      question: "Wie exportiere ich die MIA-Abdeckung als PDF?",
      answer: "Auf der MIA-Abdeckungs-Seite finden Sie oben rechts den Button 'PDF exportieren'. Das PDF enthält Ihren Namen, Schuljahr und Stufenfilter im Header, eine Übersicht mit Gesamt-Abdeckungsrate und Statistiken pro Bereich (Medien, Informatik, Anwendungskompetenzen) sowie pro Kompetenzstufe die abdeckenden Einheiten.",
      category: "jahresplan",
      order: 16,
      isActive: true,
    },
    {
      question: "Wer pflegt die 'Empfohlenen Integrationsfächer'?",
      answer: "Bei System-Themen werden sie zentral in Airtable gepflegt. Bei eigenen (Custom-)Themen können Sie die Empfehlungen selbst beim Erstellen/Bearbeiten setzen. PICTS-Admins können im Jahresplan-Pool die Empfehlung pro Schule überschreiben (Override-Pattern), z.B. wenn Ihre Schule ein Thema in einem anderen Fach umsetzt.",
      category: "themen",
      order: 10,
      isActive: true,
    },
  ];

  const batch = adminDb.batch();
  const now = new Date();

  for (const item of defaultItems) {
    const docRef = adminDb.collection(FAQ_COLLECTION).doc();
    batch.set(docRef, {
      ...item,
      createdBy,
      createdByName,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  return defaultItems.length;
}

/**
 * Ergänzt fehlende Standard-FAQ-Einträge zu einer bestehenden Sammlung
 * Vergleicht anhand der Frage-Texte, ob ein Eintrag bereits existiert
 */
export async function updateFAQItemsWithDefaults(
  createdBy: string,
  createdByName: string
): Promise<number> {
  const adminDb = getAdminDb();

  // Hole alle existierenden Fragen
  const existingSnapshot = await adminDb.collection(FAQ_COLLECTION).get();
  const existingQuestions = new Set(
    existingSnapshot.docs.map((doc) => doc.data().question?.toLowerCase().trim())
  );

  // Standard-Einträge (gleich wie in initializeFAQItems)
  const defaultItems: Omit<FAQItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "createdByName">[] = [
    // Kompetenzenpass-Einträge (die neuen)
    {
      question: "Was ist der Kompetenzenpass?",
      answer: "Der Kompetenzenpass ist ein digitales Tool für Schüler:innen, um ihre MIA-Kompetenzen selbst einzuschätzen. Schüler:innen bewerten sich mit 1-5 Sternen, Lehrpersonen bestätigen die Bewertungen. Der Fortschritt wird mit Badges belohnt und kann als PDF exportiert werden.",
      category: "allgemein",
      order: 7,
      isActive: true,
    },
    {
      question: "Wie können Schüler:innen sich anmelden?",
      answer: "Schüler:innen melden sich über /schueler/login an. Die Zugangsdaten werden von der Lehrperson erstellt. Nach der Anmeldung sehen sie ihr persönliches Dashboard mit Kompetenzen, Badges und bearbeiteten Themen.",
      category: "allgemein",
      order: 8,
      isActive: true,
    },
    {
      question: "Wie erstelle ich eine Klasse mit Schülern?",
      answer: "Gehen Sie zu 'Meine Klassen' und klicken Sie auf 'Neue Klasse'. Geben Sie einen Namen ein und fügen Sie Schüler:innen hinzu. Für jeden Schüler können Sie Login-Daten generieren oder manuell festlegen.",
      category: "themen",
      order: 6,
      isActive: true,
    },
    {
      question: "Wie bestätige ich Schüler-Bewertungen?",
      answer: "Unter 'Meine Klassen' wählen Sie eine Klasse aus und sehen im Tab 'Bestätigungen' alle ausstehenden Bewertungen. Sie können jede Bewertung einzeln bestätigen, anpassen oder alle auf einmal bestätigen.",
      category: "themen",
      order: 7,
      isActive: true,
    },
    {
      question: "Wie vergebe ich Badges an Schüler?",
      answer: "Gehen Sie zu 'Badges' in der Seitenleiste. Dort können Sie eigene Badges erstellen und über 'Badge vergeben' an einzelne Schüler:innen vergeben. System-Badges werden automatisch bei Erreichen bestimmter Meilensteine vergeben.",
      category: "themen",
      order: 8,
      isActive: true,
    },
    {
      question: "Was sind die Kompetenz-Indikatoren?",
      answer: "Kompetenz-Indikatoren beschreiben verständlich, was die 1-5 Sterne bei jeder Kompetenz bedeuten. Sie helfen Schüler:innen, sich realistisch einzuschätzen. Admins können unter 'Indikatoren' für jede Kompetenz Beschreibungen hinterlegen.",
      category: "admin",
      order: 6,
      isActive: true,
    },
    {
      question: "Können Schüler:innen Belege für ihre Kompetenzen hochladen?",
      answer: "Ja! Schüler:innen können bei der Bewertung Artefakte (Bilder, PDFs oder Links) als Belege hochladen. Lehrpersonen sehen diese bei der Bestätigung und können Kommentare hinzufügen. Die Belege erscheinen auch im exportierten Kompetenzenpass.",
      category: "themen",
      order: 9,
      isActive: true,
    },
    {
      question: "Wie kann der Kompetenzenpass exportiert werden?",
      answer: "Schüler:innen können unter 'Export' ihren Kompetenzenpass als PDF herunterladen. Das PDF enthält ein Deckblatt mit Avatar, eine Übersicht aller Bewertungen mit Sternen, erhaltene Badges und bearbeitete Themen.",
      category: "allgemein",
      order: 9,
      isActive: true,
    },
    // Jahresplanung (NEU)
    {
      question: "Was ist die Jahresplanung?",
      answer: "Die Jahresplanung ist ein Planungstool für den gesamten Unterricht über alle Fachbereiche (Deutsch, Mathematik, NMG etc.). Sie können Unterrichtseinheiten pro Quartal und Woche planen, Beurteilungen zuordnen und die Planung als PDF exportieren. Sie finden die Jahresplanung im Menü unter 'Übersicht'.",
      category: "jahresplan",
      order: 5,
      isActive: true,
    },
    {
      question: "Was ist der Unterschied zwischen 'Jahresplan MIA' und 'Jahresplanung'?",
      answer: "'Jahresplan MIA' zeigt die vorgefertigten MIA-Themen (Medien, Informatik und Anwendungskompetenzen) im Kanban-Board. Die 'Jahresplanung' ist ein separates Tool für die fächerübergreifende Unterrichtsplanung über alle Fachbereiche hinweg, mit Quartals- und Wochenansicht.",
      category: "jahresplan",
      order: 6,
      isActive: true,
    },
    {
      question: "Wie erstelle ich eine Unterrichtseinheit in der Jahresplanung?",
      answer: "Öffnen Sie die Jahresplanung und klicken Sie auf 'Neue Einheit'. Wählen Sie einen Fachbereich, geben Sie einen Titel ein und legen Sie den Zeitraum (von KW bis KW) fest. Optional können Sie Kompetenzen, Beurteilungen und MIA-Themen verknüpfen.",
      category: "jahresplan",
      order: 7,
      isActive: true,
    },
    {
      question: "Wie kopiere ich eine Jahresplanung aus einem früheren Schuljahr?",
      answer: "In der Jahresplanung klicken Sie auf 'Schuljahr kopieren'. Wählen Sie das Quell-Schuljahr aus (bis zu 6 Jahre zurück) und bestätigen Sie. Alle Einheiten werden in das aktuelle Schuljahr kopiert. Praktisch, wenn Sie alle zwei Jahre dieselbe Stufe unterrichten.",
      category: "jahresplan",
      order: 8,
      isActive: true,
    },
    {
      question: "Wie verwalte ich die Schulferien in der Jahresplanung?",
      answer: "Klicken Sie in der Jahresplanung auf den Button 'Ferien'. Dort können Sie Ferien-Presets für Ihren Kanton laden oder individuelle Ferien manuell hinzufügen, bearbeiten und löschen. Die Ferienwochen werden in der Quartalsansicht grau markiert.",
      category: "jahresplan",
      order: 9,
      isActive: true,
    },
    {
      question: "Wie exportiere ich meine Jahresplanung als PDF?",
      answer: "In der Quartals- und Wochenansicht finden Sie einen 'PDF exportieren' Button. Das PDF enthält alle Einheiten mit Fachbereich-Farben, Beurteilungsmarkern sowie Ihren Namen und Ihre Klasse im Header.",
      category: "jahresplan",
      order: 10,
      isActive: true,
    },
    // Dashboard
    {
      question: "Wie kann ich meine Dashboard-Kacheln anpassen?",
      answer: "Auf dem Dashboard sehen Sie eine Kachel 'Kacheln anpassen' mit gestricheltem Rahmen. Klicken Sie darauf, um aus 12 verfügbaren Kacheln auszuwählen, welche auf Ihrem Dashboard angezeigt werden sollen. Mit 'Standard wiederherstellen' können Sie die Auswahl zurücksetzen.",
      category: "allgemein",
      order: 10,
      isActive: true,
    },
    // Integrative MIA-Umsetzung & MIA-Abdeckung (NEU 2026-05)
    {
      question: "Was bedeuten die 'Empfohlenen Integrationsfächer' bei einem Thema?",
      answer: "MIA-Themen können integrativ in andere Fächer eingebaut werden. Die 'Empfohlenen Integrationsfächer' zeigen, in welchen Fächern (z.B. Deutsch, Mathematik, NMG) sich ein Thema gut umsetzen lässt. Im Jahresplan MIA können Sie über das Filter-Dropdown 'Integrationsfach' alle Themen anzeigen, die zu einem bestimmten Fach passen – ideal, wenn Sie MIA-Inhalte in Ihre Fachplanung einbauen möchten.",
      category: "jahresplan",
      order: 11,
      isActive: true,
    },
    {
      question: "Wie nutze ich ein MIA-Thema als Vorlage für eine Jahresplanungs-Einheit?",
      answer: "Beim Erstellen oder Bearbeiten einer Einheit in der Jahresplanung sehen Sie unter 'MIA-Thema als Vorlage' den Button 'MIA-Thema auswählen'. Im Dialog werden bevorzugt Themen mit Empfehlung für den aktuellen Fachbereich angezeigt; mit einem Toggle können Sie auch alle übrigen MIA-Themen sehen. Bei Auswahl werden Titel, Lernziele und Kompetenzen automatisch übernommen. Funktioniert für alle Fachbereiche, nicht nur MI/IB.",
      category: "jahresplan",
      order: 12,
      isActive: true,
    },
    {
      question: "Was ist die MIA-Abdeckung?",
      answer: "Die MIA-Abdeckung (Menü → Übersicht → MIA-Abdeckung) zeigt für jede MI/IB-Kompetenzstufe, ob sie in Ihrer Jahresplanung abgedeckt ist – und falls ja, durch welche Einheit (Fach, KW, Titel). Eine Kompetenz gilt als abgedeckt, wenn sie entweder direkt einer Einheit zugewiesen ist oder das verknüpfte MIA-Thema sie mitbringt. So sehen Sie auf einen Blick, wo Lücken sind, besonders wenn MIA integrativ eingeplant ist.",
      category: "jahresplan",
      order: 13,
      isActive: true,
    },
    {
      question: "Wie wird zwischen MI und IB unterschieden (Kanton Solothurn)?",
      answer: "Im Lehrplan 21 gibt es 'Medien und Informatik' (MI). Der Kanton Solothurn nutzt für sein eigenes Fach den Code 'IB' (Informatische Bildung). Die App erkennt Ihren Kanton automatisch und zeigt entsprechend MI- oder IB-Codes an. Intern werden Duplikate (MI.1.2 ↔ IB.1.2) als eine Kompetenz behandelt, damit nichts doppelt gezählt wird.",
      category: "jahresplan",
      order: 14,
      isActive: true,
    },
    {
      question: "Warum sehe ich als SO-Lehrperson einen Hinweisbanner zur Integrativen Umsetzung?",
      answer: "Im Kanton Solothurn wird das Fach 'Informatische Bildung' (IB) ab Sommer 2027 nicht mehr als eigenes Fach unterrichtet. Die IB-Kompetenzen bleiben aber Pflicht und müssen integrativ in andere Fächer einfliessen. Der Hinweisbanner erscheint nur für SO-Lehrpersonen ab Schuljahr 2027/28 und verlinkt direkt zur MIA-Abdeckung. Sie können den Hinweis lokal ausblenden.",
      category: "jahresplan",
      order: 15,
      isActive: true,
    },
    {
      question: "Wie exportiere ich die MIA-Abdeckung als PDF?",
      answer: "Auf der MIA-Abdeckungs-Seite finden Sie oben rechts den Button 'PDF exportieren'. Das PDF enthält Ihren Namen, Schuljahr und Stufenfilter im Header, eine Übersicht mit Gesamt-Abdeckungsrate und Statistiken pro Bereich (Medien, Informatik, Anwendungskompetenzen) sowie pro Kompetenzstufe die abdeckenden Einheiten.",
      category: "jahresplan",
      order: 16,
      isActive: true,
    },
    {
      question: "Wer pflegt die 'Empfohlenen Integrationsfächer'?",
      answer: "Bei System-Themen werden sie zentral in Airtable gepflegt. Bei eigenen (Custom-)Themen können Sie die Empfehlungen selbst beim Erstellen/Bearbeiten setzen. PICTS-Admins können im Jahresplan-Pool die Empfehlung pro Schule überschreiben (Override-Pattern), z.B. wenn Ihre Schule ein Thema in einem anderen Fach umsetzt.",
      category: "themen",
      order: 10,
      isActive: true,
    },
  ];

  // Filtere nur Einträge, die noch nicht existieren
  const newItems = defaultItems.filter(
    (item) => !existingQuestions.has(item.question.toLowerCase().trim())
  );

  if (newItems.length === 0) {
    return 0;
  }

  const batch = adminDb.batch();
  const now = new Date();

  for (const item of newItems) {
    const docRef = adminDb.collection(FAQ_COLLECTION).doc();
    batch.set(docRef, {
      ...item,
      createdBy,
      createdByName,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  return newItems.length;
}
