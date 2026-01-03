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
