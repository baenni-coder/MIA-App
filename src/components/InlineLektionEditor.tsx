"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TempLektion, WebsiteTool } from "@/types";
import { Plus, X, Trash2 } from "lucide-react";

interface InlineLektionEditorProps {
  lektion: TempLektion;
  onChange: (lektion: TempLektion) => void;
  onDelete: () => void;
  themaName?: string;
}

export default function InlineLektionEditor({
  lektion,
  onChange,
  onDelete,
  themaName,
}: InlineLektionEditorProps) {
  // Lokaler State für Material und Tools Input
  const [materialInput, setMaterialInput] = useState("");
  const [toolName, setToolName] = useState("");
  const [toolLink, setToolLink] = useState("");

  // Update Funktion
  const updateField = <K extends keyof TempLektion>(
    field: K,
    value: TempLektion[K]
  ) => {
    onChange({ ...lektion, [field]: value });
  };

  // Material hinzufügen
  const addMaterial = () => {
    if (materialInput.trim() && !lektion.material.includes(materialInput.trim())) {
      updateField("material", [...lektion.material, materialInput.trim()]);
      setMaterialInput("");
    }
  };

  const removeMaterial = (item: string) => {
    updateField(
      "material",
      lektion.material.filter((m) => m !== item)
    );
  };

  // Website/Tool hinzufügen
  const addWebsiteTool = () => {
    if (toolName.trim()) {
      const newTool: WebsiteTool = {
        id: Date.now().toString(),
        name: toolName.trim(),
        link: toolLink.trim() || undefined,
      };
      updateField("websiteTools", [...lektion.websiteTools, newTool]);
      setToolName("");
      setToolLink("");
    }
  };

  const removeWebsiteTool = (id: string) => {
    updateField(
      "websiteTools",
      lektion.websiteTools.filter((t) => t.id !== id)
    );
  };

  // Automatisch eindeutige Bezeichnung generieren
  const updateLektionNummer = (value: string) => {
    updateField("lektion", value);
    // Auto-generiere eindeutige Bezeichnung wenn leer oder gleich wie vorher
    if (!lektion.eindeutigeBezeichnung || lektion.eindeutigeBezeichnung.startsWith("Lektion")) {
      const bezeichnung = themaName ? `${value} - ${themaName}` : value;
      updateField("eindeutigeBezeichnung", bezeichnung);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* Header mit Löschen Button */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-sm text-muted-foreground">
          Lektionsdetails
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Lektion löschen
        </Button>
      </div>

      {/* Grundinformationen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`lektion-${lektion.tempId}`}>
            Lektion <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`lektion-${lektion.tempId}`}
            value={lektion.lektion}
            onChange={(e) => updateLektionNummer(e.target.value)}
            placeholder="z.B. Lektion 1"
          />
        </div>
        <div>
          <Label htmlFor={`bezeichnung-${lektion.tempId}`}>
            Eindeutige Bezeichnung <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`bezeichnung-${lektion.tempId}`}
            value={lektion.eindeutigeBezeichnung}
            onChange={(e) => updateField("eindeutigeBezeichnung", e.target.value)}
            placeholder="z.B. Lektion 1 - Einführung"
          />
        </div>
      </div>

      {/* KI Zusammenfassung */}
      <div>
        <Label htmlFor={`ki-${lektion.tempId}`}>KI Zusammenfassung</Label>
        <Textarea
          id={`ki-${lektion.tempId}`}
          value={lektion.kiZusammenfassung || ""}
          onChange={(e) => updateField("kiZusammenfassung", e.target.value)}
          placeholder="Kurze Zusammenfassung der Lektion..."
          rows={2}
        />
      </div>

      {/* Aufgaben & Vorwissen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`aufgaben-${lektion.tempId}`}>Aufgaben</Label>
          <Textarea
            id={`aufgaben-${lektion.tempId}`}
            value={lektion.aufgaben || ""}
            onChange={(e) => updateField("aufgaben", e.target.value)}
            placeholder="Beschreiben Sie die Aufgaben..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor={`vorwissen-${lektion.tempId}`}>Benötigtes Vorwissen</Label>
          <Textarea
            id={`vorwissen-${lektion.tempId}`}
            value={lektion.vorwissen || ""}
            onChange={(e) => updateField("vorwissen", e.target.value)}
            placeholder="Welches Vorwissen wird benötigt..."
            rows={3}
          />
        </div>
      </div>

      {/* Material */}
      <div>
        <Label>Material</Label>
        <div className="flex gap-2 mt-1">
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
          <Button type="button" variant="outline" size="icon" onClick={addMaterial}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {lektion.material.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {lektion.material.map((item) => (
              <Badge key={item} variant="secondary" className="pr-1">
                {item}
                <button
                  type="button"
                  onClick={() => removeMaterial(item)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Websites & Tools */}
      <div>
        <Label>Websites & Tools</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
            placeholder="Tool-Name"
            className="flex-1"
          />
          <Input
            value={toolLink}
            onChange={(e) => setToolLink(e.target.value)}
            placeholder="URL (optional)"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={addWebsiteTool}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {lektion.websiteTools.length > 0 && (
          <div className="space-y-1 mt-2">
            {lektion.websiteTools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between bg-white p-2 rounded text-sm"
              >
                <div>
                  <span className="font-medium">{tool.name}</span>
                  {tool.link && (
                    <a
                      href={tool.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 ml-2 text-xs"
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

      {/* 3-Phasen-Modell */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Lektionsverlauf (3-Phasen-Modell)</Label>
        <div>
          <Label htmlFor={`einstieg-${lektion.tempId}`} className="text-sm">
            Einstieg
          </Label>
          <Textarea
            id={`einstieg-${lektion.tempId}`}
            value={lektion.einstieg || ""}
            onChange={(e) => updateField("einstieg", e.target.value)}
            placeholder="Wie beginnt die Lektion..."
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor={`hauptteil-${lektion.tempId}`} className="text-sm">
            Hauptteil
          </Label>
          <Textarea
            id={`hauptteil-${lektion.tempId}`}
            value={lektion.hauptteil || ""}
            onChange={(e) => updateField("hauptteil", e.target.value)}
            placeholder="Hauptaktivitäten der Lektion..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor={`abschluss-${lektion.tempId}`} className="text-sm">
            Abschluss
          </Label>
          <Textarea
            id={`abschluss-${lektion.tempId}`}
            value={lektion.abschluss || ""}
            onChange={(e) => updateField("abschluss", e.target.value)}
            placeholder="Wie endet die Lektion..."
            rows={2}
          />
        </div>
      </div>

      {/* Stolpersteine */}
      <div>
        <Label htmlFor={`stolpersteine-${lektion.tempId}`}>Stolpersteine</Label>
        <Textarea
          id={`stolpersteine-${lektion.tempId}`}
          value={lektion.stolpersteine || ""}
          onChange={(e) => updateField("stolpersteine", e.target.value)}
          placeholder="Häufige Probleme oder wichtige Hinweise..."
          rows={2}
        />
      </div>
    </div>
  );
}
