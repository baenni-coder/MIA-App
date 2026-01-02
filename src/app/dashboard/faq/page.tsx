"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  HelpCircle,
  BookOpen,
  Calendar,
  FileText,
  FolderOpen,
  Users,
  Settings,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
}

type FAQCategory =
  | "allgemein"
  | "jahresplan"
  | "themen"
  | "dateien"
  | "admin";

const CATEGORY_LABELS: Record<FAQCategory, string> = {
  allgemein: "Allgemein",
  jahresplan: "Jahresplan",
  themen: "Themen & Lektionen",
  dateien: "Schul-Dateien",
  admin: "Administration",
};

const CATEGORY_ICONS: Record<FAQCategory, React.ReactNode> = {
  allgemein: <HelpCircle className="h-4 w-4" />,
  jahresplan: <Calendar className="h-4 w-4" />,
  themen: <BookOpen className="h-4 w-4" />,
  dateien: <FolderOpen className="h-4 w-4" />,
  admin: <Settings className="h-4 w-4" />,
};

const FAQ_ITEMS: FAQItem[] = [
  // Allgemein
  {
    id: "1",
    question: "Was ist die MIA-App?",
    answer:
      "Die MIA-App ist eine Webanwendung für Lehrpersonen zur Verwaltung des Jahresplans für 'Medien, Informatik und Anwendungskompetenzen (MIA)'. Sie ermöglicht es, Themen nach Klassenstufe und Zeitraum zu organisieren, eigene Themen zu erstellen und Materialien mit Kolleg:innen zu teilen.",
    category: "allgemein",
  },
  {
    id: "2",
    question: "Wie ändere ich meine Klassenstufe?",
    answer:
      "Gehen Sie zum Dashboard und klicken Sie auf 'Stufe bearbeiten' neben Ihrer aktuellen Stufe. Wählen Sie die gewünschte Klassenstufe aus und speichern Sie die Änderung. Der Jahresplan wird automatisch für die neue Stufe angezeigt.",
    category: "allgemein",
  },
  {
    id: "3",
    question: "Kann ich Themen für andere Klassenstufen anschauen?",
    answer:
      "Ja! Im Jahresplan gibt es ein Dropdown-Menü 'Andere Stufe anschauen', mit dem Sie temporär Themen für andere Klassenstufen ansehen können. Ihre eigene Stufe bleibt dabei unverändert.",
    category: "allgemein",
  },
  {
    id: "4",
    question: "Was bedeuten die verschiedenen Roboter-Bilder im Jahresplan?",
    answer:
      "Die Roboter-Bilder zeigen die verschiedenen Zeiträume im Schuljahr: Herbst-Roboter (Sommer- bis Herbstferien), Weihnachts-Roboter (Herbst- bis Weihnachtsferien), Winter-Roboter (Weihnachts- bis Winterferien), Frühlings-Roboter (Winter- bis Frühlingsferien) und Sommer-Roboter (Frühlings- bis Sommerferien).",
    category: "allgemein",
  },

  // Jahresplan
  {
    id: "5",
    question: "Wie finde ich ein bestimmtes Thema im Jahresplan?",
    answer:
      "Klicken Sie auf der Lehrplan-Seite auf eine Unterrichtsidee - Sie werden automatisch zum Jahresplan weitergeleitet und das entsprechende Thema wird geöffnet. Alternativ können Sie im Lehrmittel-Bereich nach Themen suchen.",
    category: "jahresplan",
  },
  {
    id: "6",
    question: "Was sind die Kompetenzen-Badges bei den Themen?",
    answer:
      "Die Kompetenzen-Badges zeigen die Lehrplan-21 Kompetenzen, die mit dem jeweiligen Thema abgedeckt werden. Klicken Sie auf einen Badge, um Details zur Kompetenz zu sehen, einschliesslich Kompetenzstufe, Zyklus und weitere Unterrichtsideen.",
    category: "jahresplan",
  },
  {
    id: "7",
    question: "Wie kann ich die Lektionsplanung eines Themas ansehen?",
    answer:
      "Klicken Sie auf ein Thema im Jahresplan und dann auf den Button 'Lektionsplanung anzeigen'. Sie sehen dann alle Lektionen mit Aufgaben, Material, Einstieg, Hauptteil und Abschluss. Die Lektionsplanung kann auch als PDF oder Markdown exportiert werden.",
    category: "jahresplan",
  },
  {
    id: "8",
    question: "Was ist der PICTS-Link im Themen-Dialog?",
    answer:
      "Der PICTS-Link führt zur Buchungsseite für PICTS-Unterstützung (Pädagogischer ICT-Support) Ihrer Schule. Dort können Sie Unterstützung für die Durchführung des Themas anfragen.",
    category: "jahresplan",
  },

  // Themen & Lektionen
  {
    id: "9",
    question: "Wie erstelle ich ein eigenes Thema?",
    answer:
      "Gehen Sie zu 'Thema erstellen' in der Seitenleiste. Füllen Sie das Formular aus: Thema-Name, Beschreibung, Klassenstufen, Zeitraum und Kompetenzen. Sie können auch Lektionen direkt hinzufügen. Speichern Sie als Entwurf oder reichen Sie zur Prüfung ein.",
    category: "themen",
  },
  {
    id: "10",
    question: "Was passiert nach dem Einreichen eines Themas?",
    answer:
      "Nach dem Einreichen wird Ihr Thema von einem PICTS-Admin geprüft. Sie erhalten eine Benachrichtigung (Glocken-Symbol), wenn das Thema freigegeben oder abgelehnt wurde. Bei Ablehnung sehen Sie das Feedback und können das Thema überarbeiten.",
    category: "themen",
  },
  {
    id: "11",
    question: "Kann ich ein freigegebenes Thema noch bearbeiten?",
    answer:
      "Ja, Sie können auch freigegebene Themen bearbeiten. Nach dem Speichern geht das Thema jedoch wieder in den Status 'Zur Prüfung' und muss erneut freigegeben werden.",
    category: "themen",
  },
  {
    id: "12",
    question: "Was bedeuten die Status-Badges bei meinen Themen?",
    answer:
      "Die Status-Badges zeigen den aktuellen Stand: 'Entwurf' (noch nicht eingereicht), 'Zur Prüfung' (eingereicht, wartet auf Review), 'Freigegeben' (genehmigt, für alle sichtbar), 'Abgelehnt' (mit Feedback zur Überarbeitung).",
    category: "themen",
  },
  {
    id: "13",
    question: "Wie füge ich Lektionen zu meinem Thema hinzu?",
    answer:
      "Beim Erstellen oder Bearbeiten eines Themas können Sie unten auf 'Lektion zum Thema erfassen' klicken. Füllen Sie die Felder aus (Aufgaben, Material, Einstieg, Hauptteil, Abschluss) und die Lektion wird automatisch nummeriert.",
    category: "themen",
  },

  // Schul-Dateien
  {
    id: "14",
    question: "Wie lade ich eine Datei hoch?",
    answer:
      "Gehen Sie zu 'Schul-Dateien' in der Seitenleiste und klicken Sie auf 'Datei hochladen'. Wählen Sie eine Datei (max. 50MB), geben Sie optional einen Namen und eine Beschreibung ein, wählen Sie die Freigabe und verknüpfen Sie optional Themen.",
    category: "dateien",
  },
  {
    id: "15",
    question: "Welche Dateiformate werden unterstützt?",
    answer:
      "Unterstützt werden: PDF, Word-Dokumente (.doc, .docx), Excel-Tabellen (.xls, .xlsx), PowerPoint-Präsentationen (.ppt, .pptx) und Bilder (JPEG, PNG, WEBP). Die maximale Dateigrösse beträgt 50MB.",
    category: "dateien",
  },
  {
    id: "16",
    question: "Was ist der Unterschied zwischen 'Privat' und 'Schule'?",
    answer:
      "'Privat' bedeutet, dass nur Sie die Datei sehen können. 'Schule' bedeutet, dass alle Lehrpersonen Ihrer Schule die Datei sehen und herunterladen können. Sie können die Freigabe jederzeit ändern.",
    category: "dateien",
  },
  {
    id: "17",
    question: "Wie verknüpfe ich eine Datei mit einem Thema?",
    answer:
      "Beim Hochladen können Sie auf 'Mit Themen verknüpfen' klicken und Themen auswählen. Nachträglich können Sie die Verknüpfungen bearbeiten, indem Sie auf das Stift-Symbol bei der Datei klicken. Verknüpfte Dateien erscheinen im Themen-Detail-Dialog.",
    category: "dateien",
  },
  {
    id: "18",
    question: "Können Kolleg:innen meine Dateien löschen?",
    answer:
      "Nein, nur Sie selbst können Ihre eigenen Dateien löschen. PICTS-Admins Ihrer Schule können jedoch alle Dateien der Schule verwalten.",
    category: "dateien",
  },

  // Administration
  {
    id: "19",
    question: "Was ist ein PICTS-Admin?",
    answer:
      "Ein PICTS-Admin ist eine Lehrperson mit erweiterten Rechten für die eigene Schule. Sie können eingereichte Themen prüfen und freigeben sowie alle Schul-Dateien verwalten. Der Status wird von einem Super-Admin vergeben.",
    category: "admin",
  },
  {
    id: "20",
    question: "Wie werde ich PICTS-Admin?",
    answer:
      "Wenden Sie sich an Ihren bestehenden PICTS-Admin oder den System-Administrator. Die Rolle 'picts_admin' muss in Ihrem Profil gesetzt werden.",
    category: "admin",
  },
  {
    id: "21",
    question: "Wo finde ich das Admin-Dashboard?",
    answer:
      "Als PICTS-Admin oder Super-Admin sehen Sie in der Seitenleiste den Menüpunkt 'Admin Dashboard'. Dort finden Sie alle eingereichten Themen Ihrer Schule zur Prüfung.",
    category: "admin",
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | "all">(
    "all"
  );

  // Filter FAQ items
  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<FAQCategory, FAQItem[]> = {
      allgemein: [],
      jahresplan: [],
      themen: [],
      dateien: [],
      admin: [],
    };

    filteredItems.forEach((item) => {
      groups[item.category].push(item);
    });

    return groups;
  }, [filteredItems]);

  const categories: (FAQCategory | "all")[] = [
    "all",
    "allgemein",
    "jahresplan",
    "themen",
    "dateien",
    "admin",
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HelpCircle className="h-6 w-6" />
              Häufig gestellte Fragen
            </h1>
            <p className="text-muted-foreground">
              Antworten auf die wichtigsten Fragen zur MIA-App
            </p>
          </div>

          {/* Suche und Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fragen durchsuchen..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === "all" ? (
                    "Alle"
                  ) : (
                    <span className="flex items-center gap-1">
                      {CATEGORY_ICONS[category]}
                      {CATEGORY_LABELS[category]}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Keine Ergebnisse */}
          {filteredItems.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Fragen gefunden</p>
                <p className="text-sm mt-2">
                  Versuchen Sie einen anderen Suchbegriff oder wählen Sie eine
                  andere Kategorie
                </p>
              </CardContent>
            </Card>
          )}

          {/* FAQ Accordion */}
          {selectedCategory === "all" ? (
            // Gruppiert nach Kategorie
            Object.entries(groupedItems).map(([category, items]) => {
              if (items.length === 0) return null;

              return (
                <Card key={category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {CATEGORY_ICONS[category as FAQCategory]}
                      {CATEGORY_LABELS[category as FAQCategory]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {items.map((item) => (
                        <AccordionItem key={item.id} value={item.id}>
                          <AccordionTrigger className="text-left">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            // Einzelne Kategorie
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {CATEGORY_ICONS[selectedCategory]}
                  {CATEGORY_LABELS[selectedCategory]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {filteredItems.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Kontakt */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <Users className="h-8 w-8 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Noch Fragen?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wenn Sie eine Frage haben, die hier nicht beantwortet wird,
                    wenden Sie sich an Ihren PICTS-Admin oder den
                    System-Administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
