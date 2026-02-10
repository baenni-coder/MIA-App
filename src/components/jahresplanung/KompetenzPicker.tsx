"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import {
  getAlleFachbereiche,
  getKompetenzbereiche,
  getKompetenzen,
  getFachbereichById,
} from "@/lib/data/lp21-data";
import type { LP21Fachbereich, LP21Kompetenzbereich, LP21KompetenzRef } from "@/types";

interface KompetenzPickerProps {
  selectedKompetenzen: string[]; // Array von Kompetenz-IDs
  onKompetenzenChange: (kompetenzenIds: string[], kompetenzenNamen: string[]) => void;
  disabled?: boolean;
}

export default function KompetenzPicker({
  selectedKompetenzen,
  onKompetenzenChange,
  disabled = false,
}: KompetenzPickerProps) {
  const [selectedFachbereich, setSelectedFachbereich] = useState<string>("");
  const [selectedKompetenzbereich, setSelectedKompetenzbereich] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Alle Fachbereiche laden
  const fachbereiche = useMemo(() => getAlleFachbereiche(), []);

  // Kompetenzbereiche des gewählten Fachbereichs
  const kompetenzbereiche = useMemo(() => {
    if (!selectedFachbereich) return [];
    return getKompetenzbereiche(selectedFachbereich);
  }, [selectedFachbereich]);

  // Kompetenzen des gewählten Kompetenzbereichs
  const kompetenzen = useMemo(() => {
    if (!selectedFachbereich || !selectedKompetenzbereich) return [];
    return getKompetenzen(selectedFachbereich, selectedKompetenzbereich);
  }, [selectedFachbereich, selectedKompetenzbereich]);

  // Kompetenz hinzufügen/entfernen
  const toggleKompetenz = (kompetenz: LP21KompetenzRef) => {
    const isSelected = selectedKompetenzen.includes(kompetenz.id);

    let newIds: string[];
    let newNames: string[];

    if (isSelected) {
      // Entfernen
      newIds = selectedKompetenzen.filter((id) => id !== kompetenz.id);
    } else {
      // Hinzufügen
      newIds = [...selectedKompetenzen, kompetenz.id];
    }

    // Namen regenerieren
    newNames = newIds.map((id) => {
      // Kompetenz in allen Fachbereichen suchen
      for (const fb of fachbereiche) {
        for (const kb of fb.kompetenzbereiche) {
          const k = kb.kompetenzen.find((komp) => komp.id === id);
          if (k) return `${k.code}: ${k.name}`;
        }
      }
      return id;
    });

    onKompetenzenChange(newIds, newNames);
  };

  // Kompetenz entfernen (über Badge)
  const removeKompetenz = (kompetenzId: string) => {
    const newIds = selectedKompetenzen.filter((id) => id !== kompetenzId);
    const newNames = newIds.map((id) => {
      for (const fb of fachbereiche) {
        for (const kb of fb.kompetenzbereiche) {
          const k = kb.kompetenzen.find((komp) => komp.id === id);
          if (k) return `${k.code}: ${k.name}`;
        }
      }
      return id;
    });
    onKompetenzenChange(newIds, newNames);
  };

  // Kompetenz-Info holen
  const getKompetenzInfo = (kompetenzId: string) => {
    for (const fb of fachbereiche) {
      for (const kb of fb.kompetenzbereiche) {
        const k = kb.kompetenzen.find((komp) => komp.id === kompetenzId);
        if (k) {
          return {
            kompetenz: k,
            fachbereich: fb,
            kompetenzbereich: kb,
          };
        }
      }
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header mit Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          LP21-Kompetenzen
          {selectedKompetenzen.length > 0 && (
            <Badge variant="secondary">{selectedKompetenzen.length}</Badge>
          )}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={disabled}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Einklappen
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Kompetenzen wählen
            </>
          )}
        </Button>
      </div>

      {/* Ausgewählte Kompetenzen als Badges */}
      {selectedKompetenzen.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedKompetenzen.map((kompetenzId) => {
            const info = getKompetenzInfo(kompetenzId);
            if (!info) return null;

            return (
              <Badge
                key={kompetenzId}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
                style={{
                  backgroundColor: `${info.fachbereich.farbe}20`,
                  borderColor: info.fachbereich.farbe,
                  borderWidth: 1,
                }}
              >
                <span
                  className="font-semibold"
                  style={{ color: info.fachbereich.farbe }}
                >
                  {info.kompetenz.code}
                </span>
                <span className="text-gray-600 text-xs max-w-[150px] truncate">
                  {info.kompetenz.name}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeKompetenz(kompetenzId)}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Picker (aufklappbar) */}
      {isExpanded && !disabled && (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          {/* Fachbereich-Auswahl */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Fachbereich
            </label>
            <Select
              value={selectedFachbereich}
              onValueChange={(value) => {
                setSelectedFachbereich(value);
                setSelectedKompetenzbereich("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fachbereich wählen..." />
              </SelectTrigger>
              <SelectContent>
                {fachbereiche.map((fb) => (
                  <SelectItem key={fb.id} value={fb.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: fb.farbe }}
                      />
                      {fb.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kompetenzbereich-Auswahl */}
          {selectedFachbereich && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Kompetenzbereich
              </label>
              <Select
                value={selectedKompetenzbereich}
                onValueChange={setSelectedKompetenzbereich}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kompetenzbereich wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {kompetenzbereiche.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.code} – {kb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Kompetenzen-Auswahl */}
          {selectedKompetenzbereich && kompetenzen.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Kompetenzen
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {kompetenzen.map((kompetenz) => {
                  const isChecked = selectedKompetenzen.includes(kompetenz.id);

                  return (
                    <div
                      key={kompetenz.id}
                      className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => toggleKompetenz(kompetenz)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleKompetenz(kompetenz)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-blue-700">
                            {kompetenz.code}
                          </span>
                          <span className="font-medium text-sm">
                            {kompetenz.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {kompetenz.beschreibung}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hinweis wenn keine Auswahl */}
          {!selectedFachbereich && (
            <p className="text-sm text-gray-500 text-center py-4">
              Wählen Sie einen Fachbereich, um Kompetenzen hinzuzufügen
            </p>
          )}
        </div>
      )}
    </div>
  );
}
