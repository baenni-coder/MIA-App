"use client";

import { useState, useEffect } from "react";
import { Lektionsplanung, CustomLektion } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
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
  Loader2,
  Plus,
  User,
  Trash2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface LektionsplanungViewerProps {
  themaName: string;
  themaId?: string; // Airtable Record ID for system themes
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LektionsplanungViewer({
  themaName,
  themaId,
  open,
  onOpenChange
}: LektionsplanungViewerProps) {
  const { getAuthToken } = useAuth();
  const [lektionen, setLektionen] = useState<Lektionsplanung[]>([]);
  const [customLektionen, setCustomLektionen] = useState<CustomLektion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for new custom lektion
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    lektion: "",
    eindeutigeBezeichnung: "",
    aufgaben: "",
    vorwissen: "",
    einstieg: "",
    hauptteil: "",
    abschluss: "",
    stolpersteine: "",
  });

  useEffect(() => {
    if (open && themaName && typeof themaName === 'string') {
      loadLektionsplanung();
      loadCustomLektionen();
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

  const loadCustomLektionen = async () => {
    if (!themaName) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `/api/custom-lektionen?systemThemeName=${encodeURIComponent(themaName)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCustomLektionen(data.lektionen || []);
      }
    } catch (err) {
      console.error("Error loading custom lektionen:", err);
    }
  };

  const handleAddLektion = async () => {
    if (!themaName || !themaId) return;
    if (!formData.lektion.trim() || !formData.eindeutigeBezeichnung.trim()) return;

    try {
      setSaving(true);
      const token = await getAuthToken();
      if (!token) return;

      const nextOrder = lektionen.length + customLektionen.length + 1;

      const response = await fetch("/api/custom-lektionen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          systemThemeId: themaId,
          systemThemeName: themaName,
          lektion: formData.lektion,
          eindeutigeBezeichnung: formData.eindeutigeBezeichnung,
          aufgaben: formData.aufgaben || undefined,
          vorwissen: formData.vorwissen || undefined,
          einstieg: formData.einstieg || undefined,
          hauptteil: formData.hauptteil || undefined,
          abschluss: formData.abschluss || undefined,
          stolpersteine: formData.stolpersteine || undefined,
          order: nextOrder,
        }),
      });

      if (response.ok) {
        // Reload custom lektionen
        await loadCustomLektionen();
        // Reset form
        setFormData({
          lektion: "",
          eindeutigeBezeichnung: "",
          aufgaben: "",
          vorwissen: "",
          einstieg: "",
          hauptteil: "",
          abschluss: "",
          stolpersteine: "",
        });
        setShowAddForm(false);
      }
    } catch (err) {
      console.error("Error creating custom lektion:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLektion = async (lektionId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/custom-lektionen/${lektionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadCustomLektionen();
      }
    } catch (err) {
      console.error("Error deleting custom lektion:", err);
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

        {!loading && !error && lektionen.length === 0 && customLektionen.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Keine Lektionsplanung verfügbar
          </div>
        )}

        {!loading && !error && (lektionen.length > 0 || customLektionen.length > 0) && (
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
            <div className="flex items-center gap-2 mb-4">
              {lektionen.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {`${lektionen.length} System-${lektionen.length === 1 ? "Lektion" : "Lektionen"}`}
                </Badge>
              )}
              {customLektionen.length > 0 && (
                <Badge variant="outline" className="text-sm">
                  {`${customLektionen.length} eigene ${customLektionen.length === 1 ? "Ergänzung" : "Ergänzungen"}`}
                </Badge>
              )}
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

            {/* Custom Lektionen Section */}
            {customLektionen.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Eigene Ergänzungen
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {customLektionen.map((lektion) => (
                    <AccordionItem key={lektion.id} value={lektion.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2 flex-1">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-semibold">{lektion.lektion}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            Eigene Ergänzung
                          </Badge>
                          {lektion.createdByName && (
                            <span className="text-xs text-muted-foreground">
                              von {lektion.createdByName}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* Aufgaben */}
                          {lektion.aufgaben && (
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
                          {lektion.vorwissen && (
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

                          {/* Einstieg */}
                          {lektion.einstieg && (
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
                          {lektion.hauptteil && (
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
                          {lektion.abschluss && (
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
                          {lektion.stolpersteine && (
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

                          {/* Delete Button */}
                          <div className="pt-2 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteLektion(lektion.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Löschen
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Add Custom Lektion Section */}
            {themaId && (
              <div className="mt-6 border-t pt-4">
                {!showAddForm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Eigene Lektion hinzufügen
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Neue Lektion erfassen</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddForm(false)}
                      >
                        Abbrechen
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="lektion">Lektionsname *</Label>
                          <Input
                            id="lektion"
                            placeholder="z.B. Lektion 1"
                            value={formData.lektion}
                            onChange={(e) =>
                              setFormData({ ...formData, lektion: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="bezeichnung">Eindeutige Bezeichnung *</Label>
                          <Input
                            id="bezeichnung"
                            placeholder="z.B. Einführung Thema X"
                            value={formData.eindeutigeBezeichnung}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                eindeutigeBezeichnung: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="aufgaben">Aufgaben</Label>
                        <Textarea
                          id="aufgaben"
                          placeholder="Beschreibung der Aufgaben..."
                          value={formData.aufgaben}
                          onChange={(e) =>
                            setFormData({ ...formData, aufgaben: e.target.value })
                          }
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="vorwissen">Vorwissen</Label>
                        <Textarea
                          id="vorwissen"
                          placeholder="Benötigtes Vorwissen..."
                          value={formData.vorwissen}
                          onChange={(e) =>
                            setFormData({ ...formData, vorwissen: e.target.value })
                          }
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="einstieg">Einstieg</Label>
                          <Textarea
                            id="einstieg"
                            placeholder="Einstiegsphase..."
                            value={formData.einstieg}
                            onChange={(e) =>
                              setFormData({ ...formData, einstieg: e.target.value })
                            }
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="hauptteil">Hauptteil</Label>
                          <Textarea
                            id="hauptteil"
                            placeholder="Hauptteil..."
                            value={formData.hauptteil}
                            onChange={(e) =>
                              setFormData({ ...formData, hauptteil: e.target.value })
                            }
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="abschluss">Abschluss</Label>
                          <Textarea
                            id="abschluss"
                            placeholder="Abschlussphase..."
                            value={formData.abschluss}
                            onChange={(e) =>
                              setFormData({ ...formData, abschluss: e.target.value })
                            }
                            rows={3}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="stolpersteine">Stolpersteine</Label>
                        <Textarea
                          id="stolpersteine"
                          placeholder="Hinweise zu häufigen Problemen..."
                          value={formData.stolpersteine}
                          onChange={(e) =>
                            setFormData({ ...formData, stolpersteine: e.target.value })
                          }
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowAddForm(false)}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          onClick={handleAddLektion}
                          disabled={
                            saving ||
                            !formData.lektion.trim() ||
                            !formData.eindeutigeBezeichnung.trim()
                          }
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Lektion speichern
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
