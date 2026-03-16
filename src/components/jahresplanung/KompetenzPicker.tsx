"use client";

import { useState, useMemo, useEffect } from "react";
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
import { X, ChevronDown, ChevronUp, BookOpen, Target, CheckCircle } from "lucide-react";
import {
  getAlleFachbereiche,
  getKompetenzbereiche,
  getKompetenzen,
  getFachbereichById,
} from "@/lib/data/lp21-data";
import type { LP21Fachbereich, LP21Kompetenzbereich, LP21KompetenzRef } from "@/types";

/** Synced LP21 Kompetenzstufe (von API) */
interface LP21SyncedKompetenzstufe {
  id: string;
  lpCode: string;
  name: string;
  kompetenzbereich: string;
  kompetenz: string;
  kompetenzstufe: string;
  zyklus: string[];
  klassenstufe: string[];
  grundanspruch: string;
  orientierungspunkt: boolean;
}

/** Synced LP21 Struktur (Kompetenzbereiche + Kompetenzen) */
interface LP21SyncedStrukturKompetenz {
  uid: string;
  code: string;
  bezeichnung: string;
  kompetenzstufen: number;
}

interface LP21SyncedStrukturKompetenzbereich {
  uid: string;
  code: string;
  bezeichnung: string;
  kompetenzen: LP21SyncedStrukturKompetenz[];
}

interface KompetenzPickerProps {
  selectedKompetenzen: string[]; // Array von Kompetenz-IDs
  onKompetenzenChange: (kompetenzenIds: string[], kompetenzenNamen: string[]) => void;
  disabled?: boolean;
  defaultFachbereich?: string; // Fachbereich aus dem Einheit-Formular
}

export default function KompetenzPicker({
  selectedKompetenzen,
  onKompetenzenChange,
  disabled = false,
  defaultFachbereich,
}: KompetenzPickerProps) {
  const [selectedFachbereich, setSelectedFachbereich] = useState<string>(defaultFachbereich || "");
  const [selectedKompetenzbereich, setSelectedKompetenzbereich] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Synced LP21 Kompetenzstufen
  const [syncedKompetenzstufen, setSyncedKompetenzstufen] = useState<LP21SyncedKompetenzstufe[]>([]);
  const [loadingSynced, setLoadingSynced] = useState(false);
  const [showKompetenzstufen, setShowKompetenzstufen] = useState(true);

  // Synced LP21 Struktur (Kompetenzbereiche + Kompetenzen von API)
  const [syncedStruktur, setSyncedStruktur] = useState<LP21SyncedStrukturKompetenzbereich[] | null>(null);

  // Fachbereich aus Formular synchronisieren
  useEffect(() => {
    if (defaultFachbereich && defaultFachbereich !== selectedFachbereich) {
      setSelectedFachbereich(defaultFachbereich);
      setSelectedKompetenzbereich("");
    }
  }, [defaultFachbereich]);

  // Alle Fachbereiche laden
  const fachbereiche = useMemo(() => getAlleFachbereiche(), []);

  // Synced Struktur laden wenn Fachbereich gewählt wird
  useEffect(() => {
    if (!selectedFachbereich) {
      setSyncedStruktur(null);
      return;
    }
    const fb = getFachbereichById(selectedFachbereich);
    const fachbereichCode = fb?.fachbereichKuerzel || selectedFachbereich;
    fetch(`/api/kompetenzen/lp21/struktur?fachbereich=${fachbereichCode}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.kompetenzbereiche) {
          setSyncedStruktur(data.kompetenzbereiche);
        } else {
          setSyncedStruktur(null);
        }
      })
      .catch(() => setSyncedStruktur(null));
  }, [selectedFachbereich]);

  // Kompetenzbereiche: Bevorzuge synced Struktur, Fallback auf statisch
  const kompetenzbereiche = useMemo(() => {
    if (syncedStruktur && syncedStruktur.length > 0) {
      // Synced Struktur als LP21Kompetenzbereich formatieren
      return syncedStruktur.map((kb) => ({
        id: kb.code,
        code: kb.code,
        name: kb.bezeichnung,
        kompetenzen: kb.kompetenzen.map((k) => ({
          id: k.code,
          code: k.code,
          name: k.bezeichnung,
          beschreibung: "",
        })),
      }));
    }
    if (!selectedFachbereich) return [];
    return getKompetenzbereiche(selectedFachbereich);
  }, [selectedFachbereich, syncedStruktur]);

  // Kompetenzen: Bevorzuge synced Struktur, Fallback auf statisch
  const kompetenzen = useMemo(() => {
    if (!selectedFachbereich || !selectedKompetenzbereich) return [];
    if (syncedStruktur && syncedStruktur.length > 0) {
      const kb = syncedStruktur.find((kb) => kb.code === selectedKompetenzbereich);
      if (kb) {
        return kb.kompetenzen.map((k) => ({
          id: k.code,
          code: k.code,
          name: k.bezeichnung,
          beschreibung: `${k.kompetenzstufen} Kompetenzstufen`,
        }));
      }
    }
    return getKompetenzen(selectedFachbereich, selectedKompetenzbereich);
  }, [selectedFachbereich, selectedKompetenzbereich, syncedStruktur]);

  // Synced Kompetenzstufen laden wenn Kompetenzbereich gewählt wird
  useEffect(() => {
    if (!selectedFachbereich || !selectedKompetenzbereich) {
      setSyncedKompetenzstufen([]);
      return;
    }

    // Verwende fachbereichKuerzel (z.B. "FS1F") statt id (z.B. "FS1") für LP21-Code-Matching
    const fb = getFachbereichById(selectedFachbereich);
    const fachbereichCode = fb?.fachbereichKuerzel || selectedFachbereich;

    setLoadingSynced(true);
    fetch(`/api/kompetenzen/lp21?fachbereich=${fachbereichCode}&kompetenzbereich=${selectedKompetenzbereich}`)
      .then((res) => res.json())
      .then((data) => {
        setSyncedKompetenzstufen(data.kompetenzstufen || []);
      })
      .catch((err) => {
        console.error("Error loading synced kompetenzstufen:", err);
        setSyncedKompetenzstufen([]);
      })
      .finally(() => setLoadingSynced(false));
  }, [selectedFachbereich, selectedKompetenzbereich]);

  // Kompetenz hinzufügen/entfernen (statisch)
  const toggleKompetenz = (kompetenz: LP21KompetenzRef) => {
    const isSelected = selectedKompetenzen.includes(kompetenz.id);

    let newIds: string[];

    if (isSelected) {
      newIds = selectedKompetenzen.filter((id) => id !== kompetenz.id);
    } else {
      newIds = [...selectedKompetenzen, kompetenz.id];
    }

    // Namen regenerieren
    const newNames = newIds.map((id) => resolveKompetenzName(id));
    onKompetenzenChange(newIds, newNames);
  };

  // Synced Kompetenzstufe hinzufügen/entfernen
  const toggleSyncedKompetenzstufe = (ks: LP21SyncedKompetenzstufe) => {
    const isSelected = selectedKompetenzen.includes(ks.id);

    let newIds: string[];

    if (isSelected) {
      newIds = selectedKompetenzen.filter((id) => id !== ks.id);
    } else {
      newIds = [...selectedKompetenzen, ks.id];
    }

    const newNames = newIds.map((id) => resolveKompetenzName(id));
    onKompetenzenChange(newIds, newNames);
  };

  // Kompetenz-Name auflösen (statisch oder synced)
  const resolveKompetenzName = (id: string): string => {
    // Zuerst in statischen Daten suchen
    for (const fb of fachbereiche) {
      for (const kb of fb.kompetenzbereiche) {
        const k = kb.kompetenzen.find((komp) => komp.id === id);
        if (k) return `${k.code}: ${k.name}`;
      }
    }
    // Dann in synced Daten suchen
    const synced = syncedKompetenzstufen.find((ks) => ks.id === id);
    if (synced) return `${synced.lpCode}: ${synced.kompetenzstufe}`;
    return id;
  };

  // Kompetenz entfernen (über Badge)
  const removeKompetenz = (kompetenzId: string) => {
    const newIds = selectedKompetenzen.filter((id) => id !== kompetenzId);
    const newNames = newIds.map((id) => resolveKompetenzName(id));
    onKompetenzenChange(newIds, newNames);
  };

  // Kompetenz-Info holen (für Badge-Anzeige)
  const getKompetenzInfo = (kompetenzId: string) => {
    for (const fb of fachbereiche) {
      for (const kb of fb.kompetenzbereiche) {
        const k = kb.kompetenzen.find((komp) => komp.id === kompetenzId);
        if (k) {
          return {
            kompetenz: k,
            fachbereich: fb,
            kompetenzbereich: kb,
            isSynced: false,
          };
        }
      }
    }
    // Check synced Kompetenzstufen
    const synced = syncedKompetenzstufen.find((ks) => ks.id === kompetenzId);
    if (synced) {
      const fb = getFachbereichById(selectedFachbereich);
      return {
        kompetenz: { id: synced.id, code: synced.lpCode, name: synced.kompetenzstufe, beschreibung: synced.kompetenz },
        fachbereich: fb || { id: selectedFachbereich, name: selectedFachbereich, fachbereichKuerzel: selectedFachbereich, farbe: "#6b7280", zyklen: [], kompetenzbereiche: [] },
        kompetenzbereich: { id: "", code: "", name: synced.kompetenzbereich, kompetenzen: [] },
        isSynced: true,
      };
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
            if (!info) {
              // Fallback für unbekannte IDs: zeige die ID
              return (
                <Badge key={kompetenzId} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  <span className="font-mono text-xs">{kompetenzId}</span>
                  {!disabled && (
                    <button type="button" onClick={() => removeKompetenz(kompetenzId)} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              );
            }

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
                {info.isSynced && (
                  <span className="text-[10px] text-gray-400">LP21</span>
                )}
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

          {/* Kompetenzen-Auswahl (statisch) */}
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

          {/* Synced LP21 Kompetenzstufen */}
          {selectedKompetenzbereich && syncedKompetenzstufen.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-500" />
                  LP21 Kompetenzstufen ({syncedKompetenzstufen.length})
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKompetenzstufen(!showKompetenzstufen)}
                  className="text-xs"
                >
                  {showKompetenzstufen ? "Ausblenden" : "Einblenden"}
                </Button>
              </div>

              {showKompetenzstufen && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {syncedKompetenzstufen.map((ks) => {
                    const isChecked = selectedKompetenzen.includes(ks.id);

                    return (
                      <div
                        key={ks.id}
                        className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-orange-50 border-orange-300"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => toggleSyncedKompetenzstufe(ks)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSyncedKompetenzstufe(ks)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-orange-700">
                              {ks.lpCode}
                            </span>
                            {ks.grundanspruch?.toLowerCase() === "ja" && (
                              <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1 py-0">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                                GA
                              </Badge>
                            )}
                            {ks.orientierungspunkt && (
                              <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] px-1 py-0">
                                <Target className="h-2.5 w-2.5 mr-0.5" />
                                OP
                              </Badge>
                            )}
                            {ks.zyklus?.filter((z) => z.startsWith("Zyklus")).map((z) => (
                              <Badge key={z} variant="outline" className="text-[10px] px-1 py-0">
                                {z}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {ks.kompetenz}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Laden-Indikator für synced Daten */}
          {loadingSynced && selectedKompetenzbereich && (
            <p className="text-xs text-gray-400 text-center">
              LP21 Kompetenzstufen werden geladen...
            </p>
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
