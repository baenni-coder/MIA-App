"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Stufe, Zeitraum, TempLektion } from "@/types";
import { Upload, Loader2, Plus, BookOpen, FileText } from "lucide-react";
import InlineLektionEditor from "./InlineLektionEditor";

const STUFEN: Stufe[] = [
  "KiGa",
  "1. Klasse",
  "2. Klasse",
  "3. Klasse",
  "4. Klasse",
  "5. Klasse",
  "6. Klasse",
  "7. Klasse",
  "8. Klasse",
  "9. Klasse",
];

const ZEITRAEUME: Zeitraum[] = [
  "Sommerferien-Herbstferien",
  "Herbstferien-Weihnachtsferien",
  "Weihnachtsferien-Winterferien",
  "Winterferien-Frühlingsferien",
  "Frühlingsferien-Sommerferien",
  "Zusatz",
];

interface CustomThemeFormProps {
  onSuccess?: (themeId: string) => void;
  initialData?: any;
  initialLektionen?: TempLektion[];
  mode?: "create" | "edit";
  themeId?: string;
}

// Hilfsfunktion: Erstellt eine leere Lektion
const createEmptyLektion = (order: number, themaName?: string): TempLektion => ({
  tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  lektion: `Lektion ${order}`,
  eindeutigeBezeichnung: themaName ? `Lektion ${order} - ${themaName}` : `Lektion ${order}`,
  material: [],
  websiteTools: [],
  order,
});

export default function CustomThemeForm({
  onSuccess,
  initialData,
  initialLektionen,
  mode = "create",
  themeId,
}: CustomThemeFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [thema, setThema] = useState(initialData?.thema || "");
  const [beschreibung, setBeschreibung] = useState(
    initialData?.beschreibung || ""
  );
  const [lehrmittel, setLehrmittel] = useState(initialData?.lehrmittel || "");
  const [bildLehrmittel, setBildLehrmittel] = useState(
    initialData?.bildLehrmittel || ""
  );
  const [schuljahr, setSchuljahr] = useState<Stufe[]>(
    initialData?.schuljahr || []
  );
  const [zeitraum, setZeitraum] = useState<Zeitraum | "">(
    initialData?.zeitraum || ""
  );
  const [kompetenzenIds, setKompetenzenIds] = useState<string[]>(
    initialData?.kompetenzenIds || []
  );
  const [fileRouge, setFileRouge] = useState(initialData?.fileRouge || "");
  const [unterlagen, setUnterlagen] = useState(initialData?.unterlagen || "");

  // Lektionen State
  const [lektionen, setLektionen] = useState<TempLektion[]>(
    initialLektionen || []
  );
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  // Anzahl Lektionen wird automatisch aus dem Lektionen-Array berechnet
  const anzahlLektionen = Math.max(lektionen.length, 1);

  // Bild-Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("image", file);
      formData.append("compress", "true");

      const response = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setBildLehrmittel(data.imageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Fehler beim Hochladen des Bildes: " + (error as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Stufen Toggle
  const toggleStufe = (stufe: Stufe) => {
    setSchuljahr((prev) =>
      prev.includes(stufe) ? prev.filter((s) => s !== stufe) : [...prev, stufe]
    );
  };

  // Lektion hinzufügen
  const addLektion = () => {
    const newOrder = lektionen.length + 1;
    const newLektion = createEmptyLektion(newOrder, thema);
    setLektionen([...lektionen, newLektion]);
    // Öffne das Akkordeon für die neue Lektion
    setOpenAccordionItems([...openAccordionItems, newLektion.tempId]);
  };

  // Lektion aktualisieren
  const updateLektion = (tempId: string, updatedLektion: TempLektion) => {
    setLektionen(
      lektionen.map((l) => (l.tempId === tempId ? updatedLektion : l))
    );
  };

  // Lektion löschen
  const deleteLektion = (tempId: string) => {
    const filteredLektionen = lektionen.filter((l) => l.tempId !== tempId);
    // Renummeriere die verbleibenden Lektionen
    const renumbered = filteredLektionen.map((l, index) => ({
      ...l,
      order: index + 1,
      lektion: `Lektion ${index + 1}`,
      // Aktualisiere eindeutige Bezeichnung wenn sie das Standard-Format hat
      eindeutigeBezeichnung: l.eindeutigeBezeichnung.startsWith("Lektion")
        ? `Lektion ${index + 1}${thema ? ` - ${thema}` : ""}`
        : l.eindeutigeBezeichnung,
    }));
    setLektionen(renumbered);
    setOpenAccordionItems(openAccordionItems.filter((id) => id !== tempId));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, submitForReview = false) => {
    e.preventDefault();

    // Validierung
    if (!thema || !beschreibung || !zeitraum || schuljahr.length === 0) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    // Validiere Lektionen (wenn vorhanden)
    for (const lektion of lektionen) {
      if (!lektion.lektion || !lektion.eindeutigeBezeichnung) {
        alert(`Bitte füllen Sie die Pflichtfelder für "${lektion.lektion || 'Lektion'}" aus.`);
        return;
      }
    }

    setLoading(true);

    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const body = {
        thema,
        beschreibung,
        lehrmittel,
        bildLehrmittel,
        anzahlLektionen,
        schuljahr,
        zeitraum,
        kompetenzenIds,
        fileRouge,
        unterlagen,
        submitForReview,
        // Lektionen mitsenden (ohne tempId)
        lektionen: lektionen.map(({ tempId, ...rest }) => rest),
      };

      const url =
        mode === "edit" && themeId
          ? `/api/custom-themes/${themeId}`
          : "/api/custom-themes";

      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save theme");
      }

      const data = await response.json();

      if (submitForReview) {
        alert("Thema wurde zur Prüfung eingereicht!");
      } else {
        alert(
          mode === "edit"
            ? "Thema wurde aktualisiert!"
            : "Thema wurde als Entwurf gespeichert!"
        );
      }

      if (onSuccess) {
        onSuccess(data.themeId || themeId || "");
      }
    } catch (error) {
      console.error("Error saving theme:", error);
      alert("Fehler beim Speichern: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Thema */}
          <div>
            <Label htmlFor="thema">
              Thema <span className="text-red-500">*</span>
            </Label>
            <Input
              id="thema"
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              placeholder="z.B. Robotik Grundlagen"
              required
            />
          </div>

          {/* Beschreibung */}
          <div>
            <Label htmlFor="beschreibung">
              Beschreibung (Um was geht es?) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="beschreibung"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Beschreiben Sie das Thema..."
              rows={4}
              required
            />
          </div>

          {/* Lehrmittel */}
          <div>
            <Label htmlFor="lehrmittel">Lehrmittel</Label>
            <Input
              id="lehrmittel"
              value={lehrmittel}
              onChange={(e) => setLehrmittel(e.target.value)}
              placeholder="z.B. Medienkompass 1"
            />
          </div>

          {/* Bild Upload */}
          <div>
            <Label>Bild Lehrmittel</Label>
            <div className="mt-2">
              {bildLehrmittel ? (
                <div className="space-y-2">
                  <img
                    src={bildLehrmittel}
                    alt="Lehrmittel"
                    className="w-32 h-32 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBildLehrmittel("")}
                  >
                    Bild entfernen
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label htmlFor="image-upload">
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-gray-400">
                      {uploadingImage ? (
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            Klicken zum Hochladen (max 10MB)
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            JPEG, PNG, WEBP
                          </p>
                        </>
                      )}
                    </div>
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Klassenstufen & Zeitraum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Schuljahr (Multi-Select) */}
          <div>
            <Label>
              Schuljahr / Klassenstufen <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-2">
              {STUFEN.map((stufe) => (
                <div key={stufe} className="flex items-center space-x-2">
                  <Checkbox
                    id={stufe}
                    checked={schuljahr.includes(stufe)}
                    onCheckedChange={() => toggleStufe(stufe)}
                  />
                  <label
                    htmlFor={stufe}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {stufe}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Zeitraum */}
          <div>
            <Label htmlFor="zeitraum">
              Zeitraum der Bearbeitung <span className="text-red-500">*</span>
            </Label>
            <Select
              value={zeitraum}
              onValueChange={(value) => setZeitraum(value as Zeitraum)}
            >
              <SelectTrigger id="zeitraum">
                <SelectValue placeholder="Zeitraum wählen..." />
              </SelectTrigger>
              <SelectContent>
                {ZEITRAEUME.map((zeit) => (
                  <SelectItem key={zeit} value={zeit}>
                    {zeit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lektionen Sektion */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lektionsplanung
              </CardTitle>
              <CardDescription className="mt-1">
                Erfassen Sie die einzelnen Lektionen für dieses Thema
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {lektionen.length} {lektionen.length === 1 ? "Lektion" : "Lektionen"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lektionen.length > 0 ? (
            <Accordion
              type="multiple"
              value={openAccordionItems}
              onValueChange={setOpenAccordionItems}
              className="space-y-2"
            >
              {lektionen.map((lektion) => (
                <AccordionItem
                  key={lektion.tempId}
                  value={lektion.tempId}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {lektion.order}
                      </Badge>
                      <span className="font-medium">
                        {lektion.eindeutigeBezeichnung || lektion.lektion}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <InlineLektionEditor
                      lektion={lektion}
                      onChange={(updated) => updateLektion(lektion.tempId, updated)}
                      onDelete={() => deleteLektion(lektion.tempId)}
                      themaName={thema}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-1">
                Noch keine Lektionen erfasst
              </p>
              <p className="text-sm text-gray-400">
                Klicken Sie auf den Button unten, um Lektionen hinzuzufügen
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={addLektion}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Lektion zum Thema erfassen
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zusätzliche Informationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File rouge */}
          <div>
            <Label htmlFor="fileRouge">File rouge</Label>
            <Input
              id="fileRouge"
              value={fileRouge}
              onChange={(e) => setFileRouge(e.target.value)}
              placeholder="Roter Faden des Themas"
            />
          </div>

          {/* Unterlagen */}
          <div>
            <Label htmlFor="unterlagen">Unterlagen zum Kapitel (URL)</Label>
            <Input
              id="unterlagen"
              type="url"
              value={unterlagen}
              onChange={(e) => setUnterlagen(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={(e) => handleSubmit(e, false)}
          disabled={loading}
        >
          {mode === "edit" ? "Änderungen speichern" : "Als Entwurf speichern"}
        </Button>
        <Button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "edit"
            ? "Zur Prüfung einreichen"
            : "Erstellen & zur Prüfung einreichen"}
        </Button>
      </div>
    </form>
  );
}
