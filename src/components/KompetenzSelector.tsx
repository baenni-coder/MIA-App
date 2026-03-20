"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Kompetenz } from "@/types";
import { Loader2, Search, X, ChevronDown, ChevronUp } from "lucide-react";

interface KompetenzSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

// Farben für Kompetenzbereiche
const BEREICH_FARBEN: Record<string, string> = {
  "Medien": "bg-blue-100 text-blue-800 border-blue-200",
  "Informatik": "bg-purple-100 text-purple-800 border-purple-200",
  "Anwendungskompetenzen": "bg-green-100 text-green-800 border-green-200",
};

const getBereichFarbe = (bereich: string) =>
  BEREICH_FARBEN[bereich] || "bg-gray-100 text-gray-800 border-gray-200";

export default function KompetenzSelector({
  selectedIds,
  onChange,
  disabled = false,
}: KompetenzSelectorProps) {
  const { user } = useAuth();
  const [kompetenzen, setKompetenzen] = useState<Kompetenz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  // Lade Kompetenzen beim ersten Öffnen
  useEffect(() => {
    if (expanded && kompetenzen.length === 0 && !loading) {
      loadKompetenzen();
    }
  }, [expanded]);

  const loadKompetenzen = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/kompetenzen?resolveUnterrichtsideen=false");
      if (!response.ok) throw new Error("Fehler beim Laden");
      const data = await response.json();
      setKompetenzen(data.kompetenzen || []);
    } catch (err) {
      console.error("Error loading kompetenzen:", err);
      setError("Kompetenzen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  // Gruppiere nach Kompetenzbereich
  const grouped = useMemo(() => {
    const groups: Record<string, Kompetenz[]> = {};
    const order = ["Medien", "Informatik", "Anwendungskompetenzen"];

    for (const k of kompetenzen) {
      const bereich = k.kompetenzbereich || "Andere";
      if (!groups[bereich]) groups[bereich] = [];
      groups[bereich].push(k);
    }

    // Sortiere Bereiche: Medien → Informatik → Anwendungskompetenzen → Rest
    const sorted: [string, Kompetenz[]][] = [];
    for (const name of order) {
      if (groups[name]) sorted.push([name, groups[name]]);
    }
    for (const [name, items] of Object.entries(groups)) {
      if (!order.includes(name)) sorted.push([name, items]);
    }

    return sorted;
  }, [kompetenzen]);

  // Filter nach Suche
  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map(([bereich, items]) => [
        bereich,
        items.filter(
          (k) =>
            k.lpCode?.toLowerCase().includes(q) ||
            k.name?.toLowerCase().includes(q) ||
            k.kompetenz?.toLowerCase().includes(q) ||
            k.kompetenzstufe?.toLowerCase().includes(q)
        ),
      ] as [string, Kompetenz[]])
      .filter(([, items]) => items.length > 0);
  }, [grouped, search]);

  // Ausgewählte Kompetenzen (für Badge-Anzeige)
  const selectedKompetenzen = useMemo(
    () => kompetenzen.filter((k) => selectedIds.includes(k.id)),
    [kompetenzen, selectedIds]
  );

  const toggleKompetenz = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeKompetenz = (id: string) => {
    if (disabled) return;
    onChange(selectedIds.filter((i) => i !== id));
  };

  return (
    <div className="space-y-3">
      {/* Ausgewählte Kompetenzen als Badges */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedKompetenzen.map((k) => (
            <Badge
              key={k.id}
              variant="outline"
              className={`${getBereichFarbe(k.kompetenzbereich || "")} pr-1`}
            >
              {k.lpCode || k.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeKompetenz(k.id)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {/* Badges für IDs die noch nicht geladen sind */}
          {selectedIds
            .filter((id) => !selectedKompetenzen.find((k) => k.id === id))
            .map((id) => (
              <Badge key={id} variant="outline" className="bg-gray-100">
                {id.substring(0, 8)}...
              </Badge>
            ))}
        </div>
      )}

      {/* Toggle Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        disabled={disabled}
        className="w-full justify-between"
      >
        <span>
          Kompetenzen auswählen
          {selectedIds.length > 0 && ` (${selectedIds.length} ausgewählt)`}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>

      {/* Kompetenz-Auswahl (aufklappbar) */}
      {expanded && (
        <div className="border rounded-lg p-3 space-y-3 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Kompetenzen laden...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadKompetenzen}
                className="mt-2"
              >
                Erneut versuchen
              </Button>
            </div>
          ) : (
            <>
              {/* Suchfeld */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suche nach LP-Code oder Begriff..."
                  className="pl-9"
                />
              </div>

              {/* Kompetenzbereiche als Akkordeon */}
              <Accordion
                type="multiple"
                defaultValue={filtered.map(([b]) => b)}
                className="space-y-1"
              >
                {filtered.map(([bereich, items]) => (
                  <AccordionItem key={bereich} value={bereich} className="border rounded-md">
                    <AccordionTrigger className="px-3 py-2 hover:no-underline text-sm">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getBereichFarbe(bereich)}
                        >
                          {bereich}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {items.filter((k) => selectedIds.includes(k.id)).length}/
                          {items.length}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-2">
                      <div className="space-y-1">
                        {items.map((k) => (
                          <label
                            key={k.id}
                            className={`flex items-start gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-50 ${
                              selectedIds.includes(k.id) ? "bg-blue-50" : ""
                            }`}
                          >
                            <Checkbox
                              checked={selectedIds.includes(k.id)}
                              onCheckedChange={() => toggleKompetenz(k.id)}
                              disabled={disabled}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-semibold text-gray-700">
                                  {k.lpCode}
                                </span>
                                {k.grundanspruch === "Ja" && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-200">
                                    GA
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                {k.kompetenzstufe || (k.name !== k.lpCode ? k.name : k.kompetenz) || k.name}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {filtered.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  Keine Kompetenzen gefunden
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
