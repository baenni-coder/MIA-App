"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Search,
  Layers,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Thema, Fachbereich, FACHBEREICHE } from "@/types";

interface MiaThemePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fachbereichId?: string; // aktueller Fachbereich der Einheit
  schuleId?: string; // für curated-Modus
  onSelect: (theme: Thema) => void;
}

export default function MiaThemePickerDialog({
  open,
  onOpenChange,
  fachbereichId,
  schuleId,
  onSelect,
}: MiaThemePickerDialogProps) {
  const [themen, setThemen] = useState<Thema[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  // Themen laden, wenn Dialog geöffnet wird
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function loadThemen() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("grouped", "false");
        if (schuleId) {
          params.set("schuleId", schuleId);
          params.set("curated", "true");
        }
        const response = await fetch(`/api/themen?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Fehler beim Laden der Themen");
        }
        const data = await response.json();
        if (cancelled) return;
        // /api/themen liefert Array (wenn grouped=false) oder Object (grouped=true)
        const list: Thema[] = Array.isArray(data)
          ? data
          : Object.values(data).flat() as Thema[];
        // Duplikate entfernen, sortieren
        const unique = list.filter(
          (t, i, arr) => arr.findIndex((a) => a.id === t.id) === i
        );
        unique.sort((a, b) => a.thema.localeCompare(b.thema, "de"));
        setThemen(unique);
      } catch (error) {
        console.error("Error loading MIA themen:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadThemen();
    return () => {
      cancelled = true;
    };
  }, [open, schuleId]);

  // Reset Suche beim Öffnen
  useEffect(() => {
    if (open) {
      setSearch("");
      setShowAllSubjects(false);
    }
  }, [open]);

  const isMiOrIb = fachbereichId === "MI" || fachbereichId === "IB";

  const filteredThemen = useMemo(() => {
    const q = search.toLowerCase().trim();
    return themen.filter((t) => {
      // Bei MI/IB: alle Themen, sonst nach Empfehlung filtern
      if (!isMiOrIb && !showAllSubjects && fachbereichId) {
        const empf = t.empfohleneIntegrationsfaecher || [];
        if (!empf.includes(fachbereichId as Fachbereich)) {
          return false;
        }
      }

      if (!q) return true;
      const haystack = `${t.thema} ${t.lehrmittel || ""} ${t.beschreibung || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [themen, search, isMiOrIb, showAllSubjects, fachbereichId]);

  const recommendedCount = useMemo(() => {
    if (!fachbereichId || isMiOrIb) return 0;
    return themen.filter((t) =>
      (t.empfohleneIntegrationsfaecher || []).includes(
        fachbereichId as Fachbereich
      )
    ).length;
  }, [themen, fachbereichId, isMiOrIb]);

  const handleSelect = (theme: Thema) => {
    onSelect(theme);
    onOpenChange(false);
  };

  const fachbereichLabel = FACHBEREICHE.find(
    (f) => f.value === fachbereichId
  )?.label;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            MIA-Thema als Vorlage übernehmen
          </DialogTitle>
          <DialogDescription>
            {isMiOrIb ? (
              <>
                Wählen Sie ein MIA-Thema als Vorlage. Titel, Lernziele und
                Kompetenzen werden für diese Einheit übernommen.
              </>
            ) : (
              <>
                MIA-Themen, die sich für integrative Umsetzung im Fach
                <span className="font-medium"> {fachbereichLabel || fachbereichId}</span> empfehlen.
                Titel, Lernziele und Kompetenzen werden übernommen.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Suchleiste */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Thema, Lehrmittel oder Stichwort..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Toggle: Alle Themen anzeigen */}
          {!isMiOrIb && fachbereichId && (
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id="showAllSubjects"
                checked={showAllSubjects}
                onCheckedChange={(c) => setShowAllSubjects(!!c)}
              />
              <label
                htmlFor="showAllSubjects"
                className="cursor-pointer text-muted-foreground"
              >
                Auch MIA-Themen ohne Empfehlung für{" "}
                <span className="font-medium">{fachbereichLabel || fachbereichId}</span>{" "}
                anzeigen
              </label>
              {recommendedCount > 0 && !showAllSubjects && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {recommendedCount} empfohlen
                </Badge>
              )}
            </div>
          )}

          {/* Themen-Liste */}
          <div className="border rounded-lg divide-y">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredThemen.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {search ? (
                  <>Keine Themen für &bdquo;{search}&ldquo; gefunden.</>
                ) : !isMiOrIb && fachbereichId && !showAllSubjects ? (
                  <>
                    Keine MIA-Themen mit Empfehlung für {fachbereichLabel || fachbereichId}.
                    <br />
                    <button
                      type="button"
                      onClick={() => setShowAllSubjects(true)}
                      className="text-primary underline mt-2"
                    >
                      Alle MIA-Themen anzeigen
                    </button>
                  </>
                ) : (
                  <>Keine MIA-Themen verfügbar.</>
                )}
              </div>
            ) : (
              filteredThemen.map((theme) => {
                const isRecommended =
                  fachbereichId &&
                  !isMiOrIb &&
                  (theme.empfohleneIntegrationsfaecher || []).includes(
                    fachbereichId as Fachbereich
                  );
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelect(theme)}
                    className="w-full text-left p-3 hover:bg-muted transition-colors flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {theme.thema}
                        </span>
                        {isRecommended && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 text-emerald-700 border-emerald-300"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            Empfohlen
                          </Badge>
                        )}
                        {theme.isCustom && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 bg-purple-50 text-purple-700 border-purple-300"
                          >
                            ✨ Eigenes
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {theme.lehrmittel && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {theme.lehrmittel}
                          </span>
                        )}
                        {theme.anzahlLektionen && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {theme.anzahlLektionen} Lektionen
                          </span>
                        )}
                        {theme.kompetenzen && theme.kompetenzen.length > 0 && (
                          <span>{theme.kompetenzen.length} Kompetenzen</span>
                        )}
                      </div>
                      {theme.empfohleneIntegrationsfaecher && theme.empfohleneIntegrationsfaecher.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {theme.empfohleneIntegrationsfaecher.map((fb) => {
                            const meta = FACHBEREICHE.find((f) => f.value === fb);
                            return (
                              <Badge
                                key={fb}
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 flex items-center gap-1"
                                style={{
                                  borderColor: `${meta?.farbe}60`,
                                  color: meta?.farbe,
                                }}
                              >
                                <Layers className="h-2.5 w-2.5" />
                                {meta?.label?.split(",")[0] || fb}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
