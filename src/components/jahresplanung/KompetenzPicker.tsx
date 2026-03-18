"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { X, ChevronDown, ChevronUp, BookOpen, Target, CheckCircle, AlertTriangle } from "lucide-react";
import { getAlleFachbereiche, findFachbereich } from "@/lib/data/lp21-data";
import type { LP21Fachbereich } from "@/types";

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
  // Static fachbereiche from JSON
  const staticFachbereiche = useMemo(() => getAlleFachbereiche(), []);

  // Selection state
  const [selectedFachbereich, setSelectedFachbereich] = useState<string>(defaultFachbereich || "");
  const [selectedKompetenzbereich, setSelectedKompetenzbereich] = useState<string>("");
  const [selectedKompetenz, setSelectedKompetenz] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Synced LP21 Kompetenzstufen (for current Kompetenzbereich)
  const [syncedKompetenzstufen, setSyncedKompetenzstufen] = useState<LP21SyncedKompetenzstufe[]>([]);
  const [loadingKompetenzstufen, setLoadingKompetenzstufen] = useState(false);

  // Synced LP21 Struktur (Kompetenzbereiche von API)
  const [syncedStruktur, setSyncedStruktur] = useState<LP21SyncedStrukturKompetenzbereich[] | null>(null);
  const [loadingStruktur, setLoadingStruktur] = useState(false);
  const [strukturSynced, setStrukturSynced] = useState<boolean | null>(null);
  const [verfuegbareFachbereiche, setVerfuegbareFachbereiche] = useState<string[]>([]);

  // Cache: All loaded Kompetenzstufen across Fachbereich changes (for badge display)
  const kompetenzstufenCacheRef = useRef<Map<string, LP21SyncedKompetenzstufe>>(new Map());

  // Fachbereich aus Formular synchronisieren (normalize API codes to static JSON ids)
  useEffect(() => {
    if (defaultFachbereich) {
      const fb = findFachbereich(defaultFachbereich);
      const normalizedId = fb?.id || defaultFachbereich;
      if (normalizedId !== selectedFachbereich) {
        setSelectedFachbereich(normalizedId);
        setSelectedKompetenzbereich("");
        setSelectedKompetenz("");
      }
    }
  }, [defaultFachbereich]);

  // Get the fachbereichKuerzel for API calls
  const getFachbereichKuerzel = useCallback((fachbereichId: string): string => {
    const fb = staticFachbereiche.find((f) => f.id === fachbereichId);
    return fb?.fachbereichKuerzel || fachbereichId;
  }, [staticFachbereiche]);

  // Get fachbereich info from static JSON
  const getFachbereichInfo = useCallback((fachbereichId: string): LP21Fachbereich | undefined => {
    return staticFachbereiche.find((f) => f.id === fachbereichId);
  }, [staticFachbereiche]);

  // Synced Struktur laden wenn Fachbereich gewählt wird
  useEffect(() => {
    if (!selectedFachbereich) {
      setSyncedStruktur(null);
      setStrukturSynced(null);
      return;
    }

    let cancelled = false;
    setLoadingStruktur(true);
    setStrukturSynced(null);

    const kuerzel = getFachbereichKuerzel(selectedFachbereich);

    fetch(`/api/kompetenzen/lp21/struktur?fachbereich=${kuerzel}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.kompetenzbereiche?.length > 0) {
          setSyncedStruktur(data.kompetenzbereiche);
          setStrukturSynced(true);
        } else {
          setSyncedStruktur(null);
          setStrukturSynced(false);
          setVerfuegbareFachbereiche(data?.verfuegbareFachbereiche || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSyncedStruktur(null);
          setStrukturSynced(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStruktur(false);
      });

    return () => { cancelled = true; };
  }, [selectedFachbereich, getFachbereichKuerzel]);

  // Kompetenzbereiche from synced structure
  const kompetenzbereiche = useMemo(() => {
    if (!syncedStruktur || syncedStruktur.length === 0) return [];
    return syncedStruktur.map((kb) => ({
      code: kb.code,
      bezeichnung: kb.bezeichnung,
      kompetenzen: kb.kompetenzen || [],
    }));
  }, [syncedStruktur]);

  // Kompetenzen for selected Kompetenzbereich (from structure)
  const kompetenzen = useMemo(() => {
    if (!selectedKompetenzbereich || kompetenzbereiche.length === 0) return [];
    const kb = kompetenzbereiche.find((kb) => kb.code === selectedKompetenzbereich);
    return kb?.kompetenzen || [];
  }, [selectedKompetenzbereich, kompetenzbereiche]);

  // Synced Kompetenzstufen laden wenn Kompetenzbereich gewählt wird
  useEffect(() => {
    if (!selectedFachbereich || !selectedKompetenzbereich) {
      setSyncedKompetenzstufen([]);
      return;
    }

    let cancelled = false;
    setLoadingKompetenzstufen(true);

    const kuerzel = getFachbereichKuerzel(selectedFachbereich);

    fetch(`/api/kompetenzen/lp21?fachbereich=${kuerzel}&kompetenzbereich=${selectedKompetenzbereich}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const stufen = data.kompetenzstufen || [];
        setSyncedKompetenzstufen(stufen);
        // Cache all loaded Kompetenzstufen for badge display
        for (const ks of stufen) {
          kompetenzstufenCacheRef.current.set(ks.id, ks);
        }
      })
      .catch((err) => {
        console.error("Error loading synced kompetenzstufen:", err);
        if (!cancelled) setSyncedKompetenzstufen([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingKompetenzstufen(false);
      });

    return () => { cancelled = true; };
  }, [selectedFachbereich, selectedKompetenzbereich, getFachbereichKuerzel]);

  // Filtered Kompetenzstufen by selected Kompetenz
  const filteredKompetenzstufen = useMemo(() => {
    if (!selectedKompetenz) return syncedKompetenzstufen;
    return syncedKompetenzstufen.filter((ks) =>
      ks.lpCode?.startsWith(selectedKompetenz + ".")
    );
  }, [syncedKompetenzstufen, selectedKompetenz]);

  // Kompetenzstufe hinzufügen/entfernen
  const toggleKompetenzstufe = (ks: LP21SyncedKompetenzstufe) => {
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

  // Kompetenz-Name auflösen (uses cache for cross-fachbereich lookups)
  const resolveKompetenzName = useCallback((id: string): string => {
    const cached = kompetenzstufenCacheRef.current.get(id);
    if (cached) return `${cached.lpCode}: ${cached.kompetenzstufe}`;
    // Also check current list
    const synced = syncedKompetenzstufen.find((ks) => ks.id === id);
    if (synced) return `${synced.lpCode}: ${synced.kompetenzstufe}`;
    return id;
  }, [syncedKompetenzstufen]);

  // Kompetenz entfernen (über Badge)
  const removeKompetenz = (kompetenzId: string) => {
    const newIds = selectedKompetenzen.filter((id) => id !== kompetenzId);
    const newNames = newIds.map((id) => resolveKompetenzName(id));
    onKompetenzenChange(newIds, newNames);
  };

  // Kompetenz-Info für Badge-Anzeige (uses cache)
  const getKompetenzInfo = useCallback((kompetenzId: string) => {
    // Check cache first
    const cached = kompetenzstufenCacheRef.current.get(kompetenzId);
    if (cached) {
      // Determine fachbereich from lpCode prefix
      const prefix = cached.lpCode?.split(".")[0] || "";
      const fb = staticFachbereiche.find(
        (f) => f.fachbereichKuerzel === prefix || f.id === prefix
      );
      return {
        code: cached.lpCode,
        name: cached.kompetenzstufe,
        farbe: fb?.farbe || "#6b7280",
      };
    }

    // Check current list
    const synced = syncedKompetenzstufen.find((ks) => ks.id === kompetenzId);
    if (synced) {
      const fb = getFachbereichInfo(selectedFachbereich);
      return {
        code: synced.lpCode,
        name: synced.kompetenzstufe,
        farbe: fb?.farbe || "#6b7280",
      };
    }

    // Fallback
    return {
      code: kompetenzId,
      name: "",
      farbe: "#6b7280",
    };
  }, [syncedKompetenzstufen, selectedFachbereich, staticFachbereiche, getFachbereichInfo]);

  // Get the shared Kompetenz description for the selected Kompetenz
  const selectedKompetenzBeschreibung = useMemo(() => {
    if (!selectedKompetenz || syncedKompetenzstufen.length === 0) return "";
    // All Kompetenzstufen within a Kompetenz share the same `kompetenzstufe` field
    const first = syncedKompetenzstufen.find((ks) =>
      ks.lpCode?.startsWith(selectedKompetenz + ".")
    );
    return first?.kompetenzstufe || "";
  }, [selectedKompetenz, syncedKompetenzstufen]);

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

            return (
              <Badge
                key={kompetenzId}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
                style={{
                  backgroundColor: `${info.farbe}20`,
                  borderColor: info.farbe,
                  borderWidth: 1,
                }}
              >
                <span
                  className="font-semibold"
                  style={{ color: info.farbe }}
                >
                  {info.code}
                </span>
                {info.name && (
                  <span className="text-gray-600 text-xs max-w-[150px] truncate">
                    {info.name}
                  </span>
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
          {/* Fachbereich-Auswahl (aus statischer JSON-Datei) */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Fachbereich
            </label>
            <Select
              value={selectedFachbereich}
              onValueChange={(value) => {
                setSelectedFachbereich(value);
                setSelectedKompetenzbereich("");
                setSelectedKompetenz("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fachbereich wählen..." />
              </SelectTrigger>
              <SelectContent>
                {staticFachbereiche.map((fb) => (
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

          {/* Lade-Indikator für Struktur */}
          {selectedFachbereich && loadingStruktur && (
            <p className="text-xs text-gray-400 text-center py-2">
              LP21-Struktur wird geladen...
            </p>
          )}

          {/* Hinweis: Fachbereich nicht synchronisiert */}
          {selectedFachbereich && strukturSynced === false && !loadingStruktur && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Fachbereich &quot;{getFachbereichKuerzel(selectedFachbereich)}&quot; noch nicht synchronisiert</p>
                <p className="text-xs mt-1">
                  Bitte unter{" "}
                  <a href="/dashboard/admin/sync" className="font-medium underline hover:text-amber-900">
                    Admin → Daten-Sync → LP21 Lehrplan-API Sync
                  </a>{" "}
                  den Fachbereich <span className="font-mono font-bold">{getFachbereichKuerzel(selectedFachbereich)}</span> synchronisieren.
                </p>
                {verfuegbareFachbereiche.length > 0 && (
                  <p className="text-xs mt-1">
                    Bereits synchronisiert: <span className="font-mono">{verfuegbareFachbereiche.join(", ")}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Kompetenzbereich-Auswahl */}
          {selectedFachbereich && kompetenzbereiche.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Kompetenzbereich
              </label>
              <Select
                value={selectedKompetenzbereich}
                onValueChange={(value) => {
                  setSelectedKompetenzbereich(value);
                  setSelectedKompetenz("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kompetenzbereich wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {kompetenzbereiche.map((kb) => (
                    <SelectItem key={kb.code} value={kb.code}>
                      {kb.code} – {kb.bezeichnung}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lade-Indikator für Kompetenzstufen */}
          {selectedKompetenzbereich && loadingKompetenzstufen && (
            <p className="text-xs text-gray-400 text-center py-2">
              Kompetenzstufen werden geladen...
            </p>
          )}

          {/* Kompetenz-Auswahl (Zwischenebene) */}
          {selectedKompetenzbereich && !loadingKompetenzstufen && kompetenzen.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Kompetenz
              </label>
              <Select
                value={selectedKompetenz}
                onValueChange={setSelectedKompetenz}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kompetenz wählen..." />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  {/* Option: Alle anzeigen */}
                  <SelectItem value="__all__">
                    Alle Kompetenzen ({syncedKompetenzstufen.length} Stufen)
                  </SelectItem>
                  {kompetenzen.map((k) => (
                    <SelectItem key={k.code} value={k.code} className="whitespace-normal">
                      {k.code} – {k.bezeichnung}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Shared Kompetenz-Beschreibung */}
          {selectedKompetenz && selectedKompetenz !== "__all__" && selectedKompetenzBeschreibung && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">{selectedKompetenz}:</span>{" "}
                {selectedKompetenzBeschreibung}
              </p>
            </div>
          )}

          {/* LP21 Kompetenzstufen */}
          {selectedKompetenzbereich && !loadingKompetenzstufen && (selectedKompetenz || syncedKompetenzstufen.length > 0) && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                Kompetenzstufen ({selectedKompetenz && selectedKompetenz !== "__all__" ? filteredKompetenzstufen.length : syncedKompetenzstufen.length})
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(selectedKompetenz && selectedKompetenz !== "__all__" ? filteredKompetenzstufen : syncedKompetenzstufen).map((ks) => {
                  const isChecked = selectedKompetenzen.includes(ks.id);

                  return (
                    <div
                      key={ks.id}
                      className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-orange-50 border-orange-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => toggleKompetenzstufe(ks)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleKompetenzstufe(ks)}
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
                        {/* Show the specific Kompetenzstufe text (aufzaehlungspunkte) */}
                        {ks.kompetenz && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {ks.kompetenz}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedKompetenzbereich && !loadingKompetenzstufen && syncedKompetenzstufen.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              Keine Kompetenzstufen für diesen Kompetenzbereich gefunden.
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
