"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Thema, Zeitraum, Kompetenz, Stufe, Fachbereich, FACHBEREICHE } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ExternalLink, BookOpen, Clock, FileText, Info, Paperclip, Target, Layers } from "lucide-react";
import LektionsplanungViewer from "./LektionsplanungViewer";
import LinkedFilesViewer from "./LinkedFilesViewer";

interface KanbanBoardProps {
  themenGrouped: Record<Zeitraum, Thema[]>;
  schulePictsBuchen?: string;
  searchQuery?: string;
  filterQuery?: string; // Real-time filter as user types
  integrationFilter?: Fachbereich | null; // Filter nach empfohlenem Integrationsfach
  userStufe?: Stufe;
}

const ZEITRAUM_LABELS: Record<Zeitraum, string> = {
  "Sommerferien-Herbstferien": "Sommerferien - Herbstferien",
  "Herbstferien-Weihnachtsferien": "Herbstferien - Weihnachtsferien",
  "Weihnachtsferien-Winterferien": "Weihnachtsferien - Winterferien",
  "Winterferien-Frühlingsferien": "Winterferien - Frühlingsferien",
  "Frühlingsferien-Sommerferien": "Frühlingsferien - Sommerferien",
  "Zusatz": "Zusatz",
};

const ZEITRAUM_IMAGES: Record<Zeitraum, string | null> = {
  "Sommerferien-Herbstferien": "/roboter_herbst.png",
  "Herbstferien-Weihnachtsferien": "/roboter_weihnachten.png",
  "Weihnachtsferien-Winterferien": "/roboter_winter.png",
  "Winterferien-Frühlingsferien": "/roboter_frühling.png",
  "Frühlingsferien-Sommerferien": "/roboter_sommer.png",
  "Zusatz": null,
};

export default function KanbanBoard({ themenGrouped, schulePictsBuchen, searchQuery, filterQuery, integrationFilter, userStufe }: KanbanBoardProps) {
  const [selectedThema, setSelectedThema] = useState<Thema | null>(null);
  const [selectedKompetenz, setSelectedKompetenz] = useState<Kompetenz | null>(null);
  const [lektionsplanungOpen, setLektionsplanungOpen] = useState(false);
  const [lektionsplanungThema, setLektionsplanungThema] = useState<string>("");
  const [lektionsplanungThemaId, setLektionsplanungThemaId] = useState<string | undefined>(undefined);
  const [lektionsplanungCustomThemeId, setLektionsplanungCustomThemeId] = useState<string | undefined>(undefined);
  const [searchHandled, setSearchHandled] = useState(false);
  const [searchResult, setSearchResult] = useState<{ found: boolean; themeName?: string } | null>(null);

  const zeitraumOrder: Zeitraum[] = [
    "Sommerferien-Herbstferien",
    "Herbstferien-Weihnachtsferien",
    "Weihnachtsferien-Winterferien",
    "Winterferien-Frühlingsferien",
    "Frühlingsferien-Sommerferien",
    "Zusatz",
  ];

  // Alle Themen als flache Liste für Suche
  const allThemen = useMemo(() => {
    return Object.values(themenGrouped).flat();
  }, [themenGrouped]);

  // Real-time filtering based on filterQuery + integrationFilter
  const filteredThemenGrouped = useMemo(() => {
    const hasTextFilter = filterQuery && filterQuery.trim() !== "";
    const hasIntegrationFilter = !!integrationFilter;

    if (!hasTextFilter && !hasIntegrationFilter) {
      return themenGrouped;
    }

    const normalizedQuery = hasTextFilter
      ? filterQuery!.toLowerCase().trim()
      : "";
    const queryWords = normalizedQuery ? normalizedQuery.split(/\s+/) : [];

    const filtered: Record<Zeitraum, Thema[]> = {} as Record<Zeitraum, Thema[]>;

    for (const zeitraum of Object.keys(themenGrouped) as Zeitraum[]) {
      filtered[zeitraum] = themenGrouped[zeitraum].filter((thema) => {
        // Integrationsfach-Filter (nur Themen mit der Empfehlung anzeigen)
        if (hasIntegrationFilter) {
          const empf = thema.empfohleneIntegrationsfaecher || [];
          if (!empf.includes(integrationFilter)) {
            return false;
          }
        }

        if (!hasTextFilter) return true;

        const themaName = thema.thema.toLowerCase();
        const lehrmittel = (thema.lehrmittel || "").toLowerCase();
        const beschreibung = (thema.beschreibung || "").toLowerCase();

        // Suche in Thema-Name
        if (themaName.includes(normalizedQuery)) return true;
        // Suche in Lehrmittel
        if (lehrmittel.includes(normalizedQuery)) return true;
        // Suche in Beschreibung
        if (beschreibung.includes(normalizedQuery)) return true;
        // Wort-Match (alle Wörter müssen in Name, Lehrmittel oder Beschreibung vorkommen)
        const searchText = `${themaName} ${lehrmittel} ${beschreibung}`;
        const matchesAllWords = queryWords.every(word => searchText.includes(word));
        if (matchesAllWords) return true;

        return false;
      });
    }

    return filtered;
  }, [themenGrouped, filterQuery, integrationFilter]);

  // Count total filtered results
  const filteredCount = useMemo(() => {
    return Object.values(filteredThemenGrouped).flat().length;
  }, [filteredThemenGrouped]);

  const totalCount = useMemo(() => {
    return Object.values(themenGrouped).flat().length;
  }, [themenGrouped]);

  // Reset searchHandled when searchQuery changes
  useEffect(() => {
    if (searchQuery) {
      setSearchHandled(false);
      setSearchResult(null);
    } else {
      setSearchResult(null);
    }
  }, [searchQuery]);

  // Auto-open theme when searchQuery is provided
  useEffect(() => {
    if (searchQuery && !searchHandled && allThemen.length > 0) {
      const normalizedQuery = searchQuery.toLowerCase().trim();

      // Suche nach exaktem Match oder Teilübereinstimmung
      const matchingThema = allThemen.find((thema) => {
        const themaName = thema.thema.toLowerCase();
        // Exakter Match
        if (themaName === normalizedQuery) return true;
        // Thema enthält Query
        if (themaName.includes(normalizedQuery)) return true;
        // Query enthält Thema
        if (normalizedQuery.includes(themaName)) return true;
        // Wort-Match (für mehrteilige Suchbegriffe)
        const queryWords = normalizedQuery.split(/\s+/);
        const matchesAllWords = queryWords.every(word => themaName.includes(word));
        if (matchesAllWords) return true;
        return false;
      });

      if (matchingThema) {
        setSelectedThema(matchingThema);
        setSearchResult({ found: true, themeName: matchingThema.thema });
      } else {
        setSearchResult({ found: false });
      }
      setSearchHandled(true);
    }
  }, [searchQuery, allThemen, searchHandled]);

  return (
    <>
      {/* Filter Result Indicator */}
      {(filterQuery && filterQuery.trim() !== "") || integrationFilter ? (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
          <p className="text-sm">
            <span className="font-medium">Filter aktiv:</span> {filteredCount} von {totalCount} Themen
            {filterQuery && filterQuery.trim() !== "" && (
              <> für &quot;{filterQuery}&quot;</>
            )}
            {integrationFilter && (
              <> · Integrationsfach: <span className="font-medium">{FACHBEREICHE.find((f) => f.value === integrationFilter)?.label || integrationFilter}</span></>
            )}
            {filteredCount === 0 && (
              <span className="text-blue-600 ml-1">
                – Keine passenden Themen
              </span>
            )}
          </p>
        </div>
      ) : null}

      {/* Search Result Feedback (when Enter pressed) */}
      {searchQuery && searchResult && !filterQuery && (
        <div className={`mb-4 p-3 rounded-lg ${searchResult.found ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
          {searchResult.found ? (
            <p className="text-sm">
              <span className="font-medium">Gefunden:</span> &quot;{searchResult.themeName}&quot; wurde geöffnet.
            </p>
          ) : (
            <p className="text-sm">
              <span className="font-medium">Keine Ergebnisse:</span> Kein Thema gefunden für &quot;{searchQuery}&quot;.
              Versuche einen anderen Suchbegriff oder durchsuche die Karten unten.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {zeitraumOrder.map((zeitraum) => (
          <div
            key={zeitraum}
            className="flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4"
          >
            <div className="mb-4">
              {/* Zeitraum Bild */}
              {ZEITRAUM_IMAGES[zeitraum] && (
                <div className="w-full h-80 mb-3 bg-background rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={ZEITRAUM_IMAGES[zeitraum]!}
                    alt={ZEITRAUM_LABELS[zeitraum]}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {ZEITRAUM_LABELS[zeitraum]}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredThemenGrouped[zeitraum]?.length || 0} Themen
                {((filterQuery && filterQuery.trim() !== "") || integrationFilter) &&
                  filteredThemenGrouped[zeitraum]?.length !==
                    themenGrouped[zeitraum]?.length && (
                    <span className="text-blue-600"> (gefiltert)</span>
                  )}
              </p>
            </div>

            <div className="space-y-3">
              {(filteredThemenGrouped[zeitraum] || []).map((thema) => (
                <Card
                  key={thema.id}
                  className="hover:shadow-md transition-all cursor-pointer hover:border-primary/50 overflow-hidden"
                  onClick={() => setSelectedThema(thema)}
                >
                  {/* Bild Lehrmittel */}
                  {thema.bildLehrmittel && (
                    <div className="w-full h-32 bg-muted overflow-hidden">
                      <img
                        src={thema.bildLehrmittel}
                        alt={thema.lehrmittel || thema.thema}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Bild nicht verfügbar (z.B. abgelaufene Airtable-URL) → Container ausblenden
                          (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight flex-1">
                        {thema.thema}
                      </CardTitle>
                      {thema.isCustom && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300 shrink-0">
                          ✨ Eigenes
                        </Badge>
                      )}
                    </div>
                    {thema.lehrmittel && (
                      <CardDescription className="text-xs flex items-center gap-1 mt-1">
                        <BookOpen className="h-3 w-3" />
                        {thema.lehrmittel}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-2">
                    {/* Um was geht es? - Prominent auf der Karte */}
                    {thema.beschreibung && (
                      <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
                        {thema.beschreibung}
                      </p>
                    )}

                    {thema.anzahlLektionen && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                        <Clock className="h-3 w-3" />
                        {thema.anzahlLektionen} Lektionen
                      </Badge>
                    )}

                    {/* Empfohlene Integrationsfächer */}
                    {thema.empfohleneIntegrationsfaecher && thema.empfohleneIntegrationsfaecher.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {thema.empfohleneIntegrationsfaecher.map((fb) => {
                          const meta = FACHBEREICHE.find((f) => f.value === fb);
                          return (
                            <Badge
                              key={fb}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 flex items-center gap-1"
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
                  </CardContent>
                </Card>
              ))}

              {(filteredThemenGrouped[zeitraum]?.length || 0) === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {(filterQuery && filterQuery.trim() !== "") || integrationFilter
                    ? "Keine passenden Themen"
                    : "Keine Themen"}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedThema} onOpenChange={(open) => !open && setSelectedThema(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedThema && (
            <>
              {/* Bild im Dialog */}
              {selectedThema.bildLehrmittel && (
                <div className="w-full h-48 bg-muted overflow-hidden rounded-lg -mt-2 mb-4">
                  <img
                    src={selectedThema.bildLehrmittel}
                    alt={selectedThema.lehrmittel || selectedThema.thema}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedThema.thema}</DialogTitle>
                {selectedThema.lehrmittel && (
                  <DialogDescription className="flex items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4" />
                    {selectedThema.lehrmittel}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Hinweis wenn Thema nicht für User-Stufe ist */}
              {userStufe && selectedThema.schuljahr && selectedThema.schuljahr.length > 0 && !selectedThema.schuljahr.includes(userStufe) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Hinweis:</span> Diese Unterrichtsidee ist für {selectedThema.schuljahr.join(", ")} vorgesehen, nicht für Ihre Stufe ({userStufe}).
                  </div>
                </div>
              )}

              <div className="space-y-4 mt-4">
                {/* Beschreibung */}
                {selectedThema.beschreibung && (
                  <div>
                    <h4 className="font-semibold mb-2">Um was geht es?</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedThema.beschreibung}
                    </p>
                  </div>
                )}

                {/* Schuljahr/Stufen */}
                {selectedThema.schuljahr && selectedThema.schuljahr.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Schuljahr</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedThema.schuljahr.map((stufe) => (
                        <Badge key={stufe} variant="outline" className="text-xs">
                          {stufe}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lektionen */}
                {selectedThema.anzahlLektionen && (
                  <div>
                    <h4 className="font-semibold mb-2">Anzahl Lektionen</h4>
                    <Badge variant="secondary" className="text-sm">
                      <Clock className="h-4 w-4 mr-1" />
                      {selectedThema.anzahlLektionen} Lektionen
                    </Badge>
                  </div>
                )}

                {/* Kompetenzen Lehrplan */}
                {selectedThema.kompetenzen && selectedThema.kompetenzen.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Kompetenzen Lehrplan</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedThema.kompetenzen.map((kompetenz) => (
                        <Badge
                          key={kompetenz.id}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKompetenz(kompetenz);
                          }}
                        >
                          {kompetenz.lpCode || kompetenz.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Zeitraum */}
                {selectedThema.zeitraum && (
                  <div>
                    <h4 className="font-semibold mb-2">Zeitraum</h4>
                    <p className="text-sm text-muted-foreground">
                      {ZEITRAUM_LABELS[selectedThema.zeitraum]}
                    </p>
                  </div>
                )}

                {/* Empfohlene Integrationsfächer */}
                {selectedThema.empfohleneIntegrationsfaecher && selectedThema.empfohleneIntegrationsfaecher.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Empfohlene Integrationsfächer
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Dieses Thema lässt sich integrativ in folgenden Fächern unterrichten:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedThema.empfohleneIntegrationsfaecher.map((fb) => {
                        const meta = FACHBEREICHE.find((f) => f.value === fb);
                        return (
                          <Badge
                            key={fb}
                            variant="outline"
                            className="text-xs flex items-center gap-1.5"
                            style={{
                              borderColor: `${meta?.farbe}60`,
                              color: meta?.farbe,
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: meta?.farbe }}
                            />
                            {meta?.label || fb}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lektionsplanung Button */}
                <div className="space-y-2">
                  <h4 className="font-semibold mb-2">Lektionsplanung</h4>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedThema?.thema) {
                        setLektionsplanungThema(selectedThema.thema);
                        // For system themes: pass themaId (Airtable ID)
                        // For custom themes: pass customThemeId (Firestore ID)
                        setLektionsplanungThemaId(selectedThema.isCustom ? undefined : selectedThema.id);
                        setLektionsplanungCustomThemeId(selectedThema.isCustom ? selectedThema.id : undefined);
                        setLektionsplanungOpen(true);
                      }
                    }}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Lektionsplanung anzeigen
                  </Button>
                </div>

                {/* Verknüpfte Dateien */}
                <div className="space-y-2">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Verknüpfte Dateien
                  </h4>
                  <LinkedFilesViewer
                    themeId={selectedThema.id}
                    themeName={selectedThema.thema}
                  />
                </div>

                {/* Links */}
                <div className="space-y-2">
                  <h4 className="font-semibold mb-2">Links & Materialien</h4>
                  {selectedThema.fileRouge && (
                    <a
                      href={selectedThema.fileRouge}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      File rouge öffnen
                    </a>
                  )}
                  {selectedThema.unterlagen && (
                    <a
                      href={selectedThema.unterlagen}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Unterlagen öffnen
                    </a>
                  )}
                  {schulePictsBuchen && (
                    <Button
                      asChild
                      variant="default"
                      className="w-full mt-2"
                    >
                      <a
                        href={schulePictsBuchen}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🦸 PICTS buchen
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Kompetenz Detail Dialog */}
      <Dialog open={!!selectedKompetenz} onOpenChange={(open) => !open && setSelectedKompetenz(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedKompetenz && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedKompetenz.lpCode || selectedKompetenz.name}
                </DialogTitle>
              </DialogHeader>
              {selectedKompetenz.kompetenzbereich && (
                <div className="mt-2">
                  <Badge variant="secondary">
                    {selectedKompetenz.kompetenzbereich}
                  </Badge>
                </div>
              )}

              <div className="space-y-4 mt-4">
                {/* LP Code */}
                {selectedKompetenz.lpCode && (
                  <div>
                    <h4 className="font-semibold mb-2">LP Code</h4>
                    <p className="text-sm font-mono bg-muted px-3 py-2 rounded">
                      {selectedKompetenz.lpCode}
                    </p>
                  </div>
                )}

                {/* Kompetenz */}
                {selectedKompetenz.kompetenz && (
                  <div>
                    <h4 className="font-semibold mb-2">Kompetenz</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedKompetenz.kompetenz}
                    </p>
                  </div>
                )}

                {/* Kompetenzstufe */}
                {selectedKompetenz.kompetenzstufe && (
                  <div>
                    <h4 className="font-semibold mb-2">Kompetenzstufe</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedKompetenz.kompetenzstufe}
                    </p>
                  </div>
                )}

                {/* Zyklus */}
                {selectedKompetenz.zyklus && selectedKompetenz.zyklus.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Zyklus</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedKompetenz.zyklus.map((z, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {z}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Klassenstufe */}
                {selectedKompetenz.klassenstufe && selectedKompetenz.klassenstufe.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Klassenstufe</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedKompetenz.klassenstufe.map((k, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grundanspruch & Orientierungspunkt */}
                {(selectedKompetenz.grundanspruch || selectedKompetenz.orientierungspunkt) && (
                  <div className="flex flex-wrap gap-4">
                    {selectedKompetenz.grundanspruch && (
                      <div>
                        <h4 className="font-semibold mb-2">Grundanspruch</h4>
                        <Badge
                          variant={selectedKompetenz.grundanspruch.toLowerCase() === "ja" ? "default" : "secondary"}
                        >
                          {selectedKompetenz.grundanspruch}
                        </Badge>
                      </div>
                    )}
                    {selectedKompetenz.orientierungspunkt && (
                      <div>
                        <h4 className="font-semibold mb-2">Orientierungspunkt</h4>
                        <Badge className="bg-orange-100 text-orange-800 border-0">
                          <Target className="h-3 w-3 mr-1" />
                          Ja
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Unterrichtsideen */}
                {selectedKompetenz.unterrichtsideen && selectedKompetenz.unterrichtsideen.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Unterrichtsideen</h4>
                    <div className="space-y-2">
                      {selectedKompetenz.unterrichtsideen.map((idee, idx) => (
                        <div key={idx} className="bg-muted px-3 py-2 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{idee.name}</span>
                            {idee.anzahl && (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {idee.anzahl} Lektionen
                              </Badge>
                            )}
                          </div>
                          {idee.lehrmittel && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <BookOpen className="h-3 w-3" />
                              {idee.lehrmittel}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Querverweis LP */}
                {selectedKompetenz.querverweisLP && (
                  <div>
                    <h4 className="font-semibold mb-2">Querverweis Lehrplan</h4>
                    <a
                      href={selectedKompetenz.querverweisLP}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Lehrplan öffnen
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lektionsplanung Viewer Dialog */}
      <LektionsplanungViewer
        themaName={lektionsplanungThema}
        themaId={lektionsplanungThemaId}
        customThemeId={lektionsplanungCustomThemeId}
        open={lektionsplanungOpen}
        onOpenChange={setLektionsplanungOpen}
      />
    </>
  );
}
