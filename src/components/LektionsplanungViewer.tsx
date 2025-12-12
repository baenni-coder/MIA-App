"use client";

import { useState, useEffect } from "react";
import { Lektionsplanung } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  FileText,
  Download,
  BookOpen,
  Lightbulb,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface LektionsplanungViewerProps {
  themaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LektionsplanungViewer({
  themaName,
  open,
  onOpenChange
}: LektionsplanungViewerProps) {
  const [lektionen, setLektionen] = useState<Lektionsplanung[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && themaName && typeof themaName === 'string') {
      loadLektionsplanung();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, themaName]);

  const loadLektionsplanung = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/lektionsplanung?thema=${encodeURIComponent(themaName)}`);

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Lektionsplanung");
      }

      const data = await response.json();
      setLektionen(data.lektionen || []);
    } catch (err) {
      console.error("Error loading Lektionsplanung:", err);
      setError("Lektionsplanung konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const exportAsMarkdown = () => {
    const markdown = generateMarkdown(lektionen, themaName);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Lektionsplanung-${themaName.replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = async () => {
    try {
      // Dynamisches Import von jsPDF
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

    // Deckblatt
    doc.setFontSize(20);
    doc.text("Lektionsplanung", 105, 30, { align: "center" });
    doc.setFontSize(16);
    doc.text(themaName, 105, 45, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generiert am ${new Date().toLocaleDateString("de-CH")}`, 105, 60, { align: "center" });

    let yPosition = 80;

    lektionen.forEach((lektion, index) => {
      // Neue Seite für jede Lektion (außer der ersten)
      if (index > 0) {
        doc.addPage();
        yPosition = 20;
      }

      // Lektion Titel
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(lektion.lektion, 20, yPosition);
      yPosition += 10;

      // Aufgaben
      if (lektion.aufgaben) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Aufgaben:", 20, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        const aufgabenLines = doc.splitTextToSize(lektion.aufgaben, 170);
        doc.text(aufgabenLines, 20, yPosition);
        yPosition += aufgabenLines.length * 5 + 5;
      }

      // Einstieg
      if (lektion.einstieg) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Einstieg:", 20, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        const einstiegLines = doc.splitTextToSize(lektion.einstieg, 170);
        doc.text(einstiegLines, 20, yPosition);
        yPosition += einstiegLines.length * 5 + 5;
      }

      // Hauptteil
      if (lektion.hauptteil) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Hauptteil:", 20, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        const hauptteilLines = doc.splitTextToSize(lektion.hauptteil, 170);
        doc.text(hauptteilLines, 20, yPosition);
        yPosition += hauptteilLines.length * 5 + 5;
      }

      // Abschluss
      if (lektion.abschluss) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Abschluss:", 20, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        const abschlussLines = doc.splitTextToSize(lektion.abschluss, 170);
        doc.text(abschlussLines, 20, yPosition);
        yPosition += abschlussLines.length * 5 + 5;
      }

      // Stolpersteine
      if (lektion.stolpersteine) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Stolpersteine:", 20, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        const stolpersteineLines = doc.splitTextToSize(lektion.stolpersteine, 170);
        doc.text(stolpersteineLines, 20, yPosition);
        yPosition += stolpersteineLines.length * 5 + 5;
      }
    });

      // Fußzeilen mit Seitenzahlen
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Seite ${i} von ${pageCount}`, 105, 290, { align: "center" });
      }

      doc.save(`Lektionsplanung-${themaName.replace(/\s+/g, "-")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Lektionsplanung
          </DialogTitle>
          <DialogDescription className="text-base">
            {themaName || 'Unbekanntes Thema'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && lektionen.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Keine Lektionsplanung verfügbar
          </div>
        )}

        {!loading && !error && lektionen.length > 0 && (
          <>
            {/* Export Buttons */}
            <div className="flex gap-2 mb-4">
              <Button onClick={exportAsMarkdown} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Als Markdown exportieren
              </Button>
              <Button onClick={exportAsPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Als PDF exportieren
              </Button>
            </div>

            {/* Lektionen Übersicht */}
            <div className="mb-4">
              <Badge variant="secondary" className="text-sm">
                {`${lektionen.length} ${lektionen.length === 1 ? "Lektion" : "Lektionen"}`}
              </Badge>
            </div>

            {/* Akkordeon für Lektionen */}
            <Accordion type="single" collapsible className="w-full">
              {lektionen.map((lektion) => (
                <AccordionItem key={lektion.id} value={lektion.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="font-semibold">{String(lektion.lektion || '')}</span>
                      {lektion.kiZusammenfassung && typeof lektion.kiZusammenfassung === 'string' && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          KI Zusammenfassung
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* KI Zusammenfassung */}
                      {lektion.kiZusammenfassung && typeof lektion.kiZusammenfassung === 'string' && (
                        <div className="bg-primary/5 border-l-4 border-primary px-4 py-3 rounded-r-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <Lightbulb className="h-4 w-4" />
                            Zusammenfassung
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {lektion.kiZusammenfassung}
                          </p>
                        </div>
                      )}

                      {/* Aufgaben */}
                      {lektion.aufgaben && typeof lektion.aufgaben === 'string' && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            Aufgaben
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {lektion.aufgaben}
                          </p>
                        </div>
                      )}

                      {/* Vorwissen */}
                      {lektion.vorwissen && typeof lektion.vorwissen === 'string' && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <Lightbulb className="h-4 w-4" />
                            Vorwissen
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {lektion.vorwissen}
                          </p>
                        </div>
                      )}

                      {/* Material */}
                      {lektion.material && Array.isArray(lektion.material) && lektion.material.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Material</h4>
                          <div className="flex flex-wrap gap-2">
                            {lektion.material.map((mat, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {String(mat)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Website/Tools */}
                      {lektion.websiteTools && Array.isArray(lektion.websiteTools) && lektion.websiteTools.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Websites & Tools</h4>
                          <div className="space-y-2">
                            {lektion.websiteTools.map((tool) => (
                              <div key={tool.id}>
                                {tool.link ? (
                                  <a
                                    href={tool.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {String(tool.name)}
                                  </a>
                                ) : (
                                  <span className="text-sm">{String(tool.name)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Einstieg */}
                      {lektion.einstieg && typeof lektion.einstieg === 'string' && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <Play className="h-4 w-4" />
                            Einstieg
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {lektion.einstieg}
                          </p>
                        </div>
                      )}

                      {/* Hauptteil */}
                      {lektion.hauptteil && typeof lektion.hauptteil === 'string' && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <Square className="h-4 w-4" />
                            Hauptteil
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {lektion.hauptteil}
                          </p>
                        </div>
                      )}

                      {/* Abschluss */}
                      {lektion.abschluss && typeof lektion.abschluss === 'string' && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            Abschluss
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {lektion.abschluss}
                          </p>
                        </div>
                      )}

                      {/* Stolpersteine */}
                      {lektion.stolpersteine && typeof lektion.stolpersteine === 'string' && (
                        <div className="bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500 px-4 py-3 rounded-r-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            Stolpersteine
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {lektion.stolpersteine}
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper: Markdown Generator
function generateMarkdown(lektionen: Lektionsplanung[], themaName: string): string {
  let markdown = `# Lektionsplanung: ${themaName}\n\n`;
  markdown += `*Generiert am ${new Date().toLocaleDateString("de-CH")}*\n\n`;
  markdown += `---\n\n`;

  lektionen.forEach((lektion, index) => {
    markdown += `## ${lektion.lektion}\n\n`;

    if (lektion.kiZusammenfassung) {
      markdown += `> **Zusammenfassung:** ${lektion.kiZusammenfassung}\n\n`;
    }

    if (lektion.aufgaben) {
      markdown += `### Aufgaben\n\n${lektion.aufgaben}\n\n`;
    }

    if (lektion.vorwissen) {
      markdown += `### Vorwissen\n\n${lektion.vorwissen}\n\n`;
    }

    if (lektion.material && lektion.material.length > 0) {
      markdown += `### Material\n\n`;
      lektion.material.forEach(mat => {
        markdown += `- ${mat}\n`;
      });
      markdown += `\n`;
    }

    if (lektion.websiteTools && lektion.websiteTools.length > 0) {
      markdown += `### Websites & Tools\n\n`;
      lektion.websiteTools.forEach(tool => {
        if (tool.link) {
          markdown += `- [${tool.name}](${tool.link})\n`;
        } else {
          markdown += `- ${tool.name}\n`;
        }
      });
      markdown += `\n`;
    }

    if (lektion.einstieg) {
      markdown += `### Einstieg\n\n${lektion.einstieg}\n\n`;
    }

    if (lektion.hauptteil) {
      markdown += `### Hauptteil\n\n${lektion.hauptteil}\n\n`;
    }

    if (lektion.abschluss) {
      markdown += `### Abschluss\n\n${lektion.abschluss}\n\n`;
    }

    if (lektion.stolpersteine) {
      markdown += `### ⚠️ Stolpersteine\n\n${lektion.stolpersteine}\n\n`;
    }

    if (index < lektionen.length - 1) {
      markdown += `---\n\n`;
    }
  });

  return markdown;
}
