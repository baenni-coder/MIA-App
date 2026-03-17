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
import { X, ChevronDown, ChevronUp, BookOpen, Target, CheckCircle, AlertTriangle } from "lucide-react";
import { getLp21FachbereichFarbe } from "@/lib/data/lp21-data";

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

  // Synced LP21 Kompetenzstufen (die auswählbaren Einträge)
  const [syncedKompetenzstufen, setSyncedKompetenzstufen] = useState<LP21SyncedKompetenzstufe[]>([]);
  const [loadingKompetenzstufen, setLoadingKompetenzstufen] = useState(false);

  // Synced LP21 Struktur (Kompetenzbereiche von API)
  const [syncedStruktur, setSyncedStruktur] = useState<LP21SyncedStrukturKompetenzbereich[] | null>(null);
  const [loadingStruktur, setLoadingStruktur] = useState(false);
  const [strukturSynced, setStrukturSynced] = useState<boolean | null>(null); // null = loading, true = synced, false = not synced
  const [verfuegbareFachbereiche, setVerfuegbareFachbereiche] = useState<string[]>([]);
  // Fachbereiche aus LP21 API (synchronisierte Daten)
  const [fachbereiche, setFachbereiche] = useState<
    { code: string; name: string; farbe: string }[]
  >([]);
  const [loadingFachbereiche, setLoadingFachbereiche] = useState(true);

  // Fachbereich aus Formular synchronisieren
  useEffect(() => {
    if (defaultFachbereich && defaultFachbereich !== selectedFachbereich) {
      setSelectedFachbereich(defaultFachbereich);
      setSelectedKompetenzbereich("");
    }
  }, [defaultFachbereich]);

  // Fachbereiche aus API laden
  useEffect(() => {
    let cancelled = false;
    fetch("/api/kompetenzen/lp21/struktur")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.fachbereiche?.length > 0) {
          setFachbereiche(
            data.fachbereiche.map((fb: { code: string; name: string }) => ({
              code: fb.code,
              name: fb.name,
              farbe: getLp21FachbereichFarbe(fb.code),
            }))
          );
        }
      })
      .catch((err) => console.error("Error loading Fachbereiche:", err))
      .finally(() => {
        if (!cancelled) setLoadingFachbereiche(false);
      });
    return () => { cancelled = true; };
  }, []);

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

    fetch(`/api/kompetenzen/lp21/struktur?fachbereich=${selectedFachbereich}`)
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
  }, [selectedFachbereich]);

  // Kompetenzbereiche: NUR von synced LP21 Struktur
  const kompetenzbereiche = useMemo(() => {
    if (!syncedStruktur || syncedStruktur.length === 0) return [];
    return syncedStruktur.map((kb) => ({
      code: kb.code,
      bezeichnung: kb.bezeichnung,
      anzahlKompetenzen: kb.kompetenzen.length,
    }));
  }, [syncedStruktur]);

  // Synced Kompetenzstufen laden wenn Kompetenzbereich gewählt wird
  useEffect(() => {
    if (!selectedFachbereich || !selectedKompetenzbereich) {
      setSyncedKompetenzstufen([]);
      return;
    }

    let cancelled = false;
    setLoadingKompetenzstufen(true);
    fetch(`/api/kompetenzen/lp21?fachbereich=${selectedFachbereich}&kompetenzbereich=${selectedKompetenzbereich}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSyncedKompetenzstufen(data.kompetenzstufen || []);
      })
      .catch((err) => {
        console.error("Error loading synced kompetenzstufen:", err);
        if (!cancelled) setSyncedKompetenzstufen([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingKompetenzstufen(false);
      });

    return () => { cancelled = true; };
  }, [selectedFachbereich, selectedKompetenzbereich]);

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

  // Kompetenz-Name auflösen
  const resolveKompetenzName = (id: string): string => {
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

  // Kompetenz-Info für Badge-Anzeige
  const getKompetenzInfo = (kompetenzId: string) => {
    const synced = syncedKompetenzstufen.find((ks) => ks.id === kompetenzId);
    if (synced) {
      const fb = fachbereiche.find((f) => f.code === selectedFachbereich);
      return {
        code: synced.lpCode,
        name: synced.kompetenzstufe,
        farbe: fb?.farbe || getLp21FachbereichFarbe(selectedFachbereich),
      };
    }
    // Fallback: ID als Code anzeigen
    return {
      code: kompetenzId,
      name: "",
      farbe: "#6b7280",
    };
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
          {/* Fachbereich-Auswahl */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Fachbereich
            </label>
            {loadingFachbereiche ? (
              <p className="text-xs text-gray-400 py-2">Fachbereiche werden geladen...</p>
            ) : (
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
                    <SelectItem key={fb.code} value={fb.code}>
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
            )}
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
                <p className="font-medium">Fachbereich noch nicht synchronisiert</p>
                <p className="text-xs mt-1">
                  Dieser Fachbereich wurde noch nicht über die LP21 API geladen.
                  Bitte zuerst unter <span className="font-medium">Admin → Daten-Sync → LP21 Lehrplan-API Sync</span> den
                  entsprechenden Fachbereich synchronisieren.
                </p>
                {verfuegbareFachbereiche.length > 0 && (
                  <p className="text-xs mt-1">
                    Bereits synchronisiert: <span className="font-mono">{verfuegbareFachbereiche.join(", ")}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Kompetenzbereich-Auswahl (NUR synced) */}
          {selectedFachbereich && kompetenzbereiche.length > 0 && (
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
                    <SelectItem key={kb.code} value={kb.code}>
                      {kb.code} – {kb.bezeichnung}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* LP21 Kompetenzstufen */}
          {selectedKompetenzbereich && loadingKompetenzstufen && (
            <p className="text-xs text-gray-400 text-center py-2">
              LP21 Kompetenzstufen werden geladen...
            </p>
          )}

          {selectedKompetenzbereich && !loadingKompetenzstufen && syncedKompetenzstufen.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                Kompetenzstufen ({syncedKompetenzstufen.length})
              </label>
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
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {ks.kompetenzstufe || ks.kompetenz}
                        </p>
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
