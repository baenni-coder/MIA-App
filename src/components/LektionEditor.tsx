"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomLektion, WebsiteTool } from "@/types";
import { Loader2, Plus, X } from "lucide-react";

interface LektionEditorProps {
  themeId: string;
  onSuccess?: (lektionId: string) => void;
  onCancel?: () => void;
  initialData?: CustomLektion;
  mode?: "create" | "edit";
  lektionId?: string;
  order?: number;
}

export default function LektionEditor({
  themeId,
  onSuccess,
  onCancel,
  initialData,
  mode = "create",
  lektionId,
  order = 1,
}: LektionEditorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form State
  const [lektion, setLektion] = useState(initialData?.lektion || "");
  const [eindeutigeBezeichnung, setEindeutigeBezeichnung] = useState(
    initialData?.eindeutigeBezeichnung || ""
  );
  const [aufgaben, setAufgaben] = useState(initialData?.aufgaben || "");
  const [vorwissen, setVorwissen] = useState(initialData?.vorwissen || "");
  const [material, setMaterial] = useState<string[]>(
    initialData?.material || []
  );
  const [materialInput, setMaterialInput] = useState("");
  const [websiteTools, setWebsiteTools] = useState<WebsiteTool[]>(
    initialData?.websiteTools || []
  );
  const [toolName, setToolName] = useState("");
  const [toolLink, setToolLink] = useState("");
  const [einstieg, setEinstieg] = useState(initialData?.einstieg || "");
  const [hauptteil, setHauptteil] = useState(initialData?.hauptteil || "");
  const [abschluss, setAbschluss] = useState(initialData?.abschluss || "");
  const [stolpersteine, setStolpersteine] = useState(
    initialData?.stolpersteine || ""
  );
  const [kiZusammenfassung, setKiZusammenfassung] = useState(
    initialData?.kiZusammenfassung || ""
  );

  // Material hinzufügen
  const addMaterial = () => {
    if (materialInput.trim() && !material.includes(materialInput.trim())) {
      setMaterial([...material, materialInput.trim()]);
      setMaterialInput("");
    }
  };

  const removeMaterial = (item: string) => {
    setMaterial(material.filter((m) => m !== item));
  };

  // Website/Tool hinzufügen
  const addWebsiteTool = () => {
    if (toolName.trim()) {
      const newTool: WebsiteTool = {
        id: Date.now().toString(),
        name: toolName.trim(),
        link: toolLink.trim() || undefined,
      };
      setWebsiteTools([...websiteTools, newTool]);
      setToolName("");
      setToolLink("");
    }
  };

  const removeWebsiteTool = (id: string) => {
    setWebsiteTools(websiteTools.filter((t) => t.id !== id));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validierung
    if (!lektion || !eindeutigeBezeichnung) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    setLoading(true);

    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const body = {
        themeId,
        lektion,
        eindeutigeBezeichnung,
        aufgaben,
        vorwissen,
        material: material.length > 0 ? material : undefined,
        websiteTools: websiteTools.length > 0 ? websiteTools : undefined,
        einstieg,
        hauptteil,
        abschluss,
        stolpersteine,
        kiZusammenfassung,
        order: initialData?.order || order,
      };

      const url =
        mode === "edit" && lektionId
          ? `/api/custom-lektionen/${lektionId}`
          : "/api/custom-lektionen";

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
        throw new Error(error.error || "Failed to save lektion");
      }

      const data = await response.json();

      alert(
        mode === "edit"
          ? "Lektion wurde aktualisiert!"
          : "Lektion wurde erstellt!"
      );

      if (onSuccess) {
        onSuccess(data.lektionId || lektionId || "");
      }
    } catch (error) {
      console.error("Error saving lektion:", error);
      alert("Fehler beim Speichern: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lektion */}
          <div>
            <Label htmlFor="lektion">
              Lektion <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lektion"
              value={lektion}
              onChange={(e) => setLektion(e.target.value)}
              placeholder="z.B. Lektion 1"
              required
            />
          </div>

          {/* Eindeutige Bezeichnung */}
          <div>
            <Label htmlFor="eindeutigeBezeichnung">
              Eindeutige Lektionsbezeichnung{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="eindeutigeBezeichnung"
              value={eindeutigeBezeichnung}
              onChange={(e) => setEindeutigeBezeichnung(e.target.value)}
              placeholder="z.B. Lektion 1 - Einführung in Robotik"
              required
            />
          </div>

          {/* KI Zusammenfassung */}
          <div>
            <Label htmlFor="kiZusammenfassung">KI Zusammenfassung</Label>
            <Textarea
              id="kiZusammenfassung"
              value={kiZusammenfassung}
              onChange={(e) => setKiZusammenfassung(e.target.value)}
              placeholder="Kurze Zusammenfassung der Lektion..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aufgaben & Vorwissen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aufgaben */}
          <div>
            <Label htmlFor="aufgaben">Aufgaben</Label>
            <Textarea
              id="aufgaben"
              value={aufgaben}
              onChange={(e) => setAufgaben(e.target.value)}
              placeholder="Beschreiben Sie die Aufgaben..."
              rows={4}
            />
          </div>

          {/* Vorwissen */}
          <div>
            <Label htmlFor="vorwissen">Benötigtes Vorwissen</Label>
            <Textarea
              id="vorwissen"
              value={vorwissen}
              onChange={(e) => setVorwissen(e.target.value)}
              placeholder="Welches Vorwissen wird benötigt..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Material & Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Material */}
          <div>
            <Label>Material</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                placeholder="z.B. Tablet, Beamer"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMaterial();
                  }
                }}
              />
              <Button type="button" onClick={addMaterial}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {material.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {material.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeMaterial(item)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Website/Tools */}
          <div>
            <Label>Websites & Tools</Label>
            <div className="space-y-2 mt-2">
              <div className="flex gap-2">
                <Input
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  placeholder="Tool-Name (z.B. Code.org)"
                  className="flex-1"
                />
                <Input
                  value={toolLink}
                  onChange={(e) => setToolLink(e.target.value)}
                  placeholder="URL (optional)"
                  className="flex-1"
                />
                <Button type="button" onClick={addWebsiteTool}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {websiteTools.length > 0 && (
                <div className="space-y-2 mt-3">
                  {websiteTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <div>
                        <span className="font-medium">{tool.name}</span>
                        {tool.link && (
                          <a
                            href={tool.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 ml-2"
                          >
                            {tool.link}
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWebsiteTool(tool.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lektionsverlauf (3-Phasen-Modell)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Einstieg */}
          <div>
            <Label htmlFor="einstieg">Einstieg</Label>
            <Textarea
              id="einstieg"
              value={einstieg}
              onChange={(e) => setEinstieg(e.target.value)}
              placeholder="Wie beginnt die Lektion..."
              rows={4}
            />
          </div>

          {/* Hauptteil */}
          <div>
            <Label htmlFor="hauptteil">Hauptteil</Label>
            <Textarea
              id="hauptteil"
              value={hauptteil}
              onChange={(e) => setHauptteil(e.target.value)}
              placeholder="Hauptaktivitäten der Lektion..."
              rows={6}
            />
          </div>

          {/* Abschluss */}
          <div>
            <Label htmlFor="abschluss">Abschluss</Label>
            <Textarea
              id="abschluss"
              value={abschluss}
              onChange={(e) => setAbschluss(e.target.value)}
              placeholder="Wie endet die Lektion..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stolpersteine</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="stolpersteine"
            value={stolpersteine}
            onChange={(e) => setStolpersteine(e.target.value)}
            placeholder="Häufige Probleme oder wichtige Hinweise..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Änderungen speichern" : "Lektion erstellen"}
        </Button>
      </div>
    </form>
  );
}
