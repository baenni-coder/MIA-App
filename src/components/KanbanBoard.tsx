"use client";

import { useState } from "react";
import { Thema, Zeitraum } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ExternalLink, BookOpen, Clock } from "lucide-react";

interface KanbanBoardProps {
  themenGrouped: Record<Zeitraum, Thema[]>;
}

const ZEITRAUM_LABELS: Record<Zeitraum, string> = {
  "Sommerferien-Herbstferien": "Sommerferien - Herbstferien",
  "Herbstferien-Weihnachtsferien": "Herbstferien - Weihnachtsferien",
  "Weihnachtsferien-Winterferien": "Weihnachtsferien - Winterferien",
  "Winterferien-Frühlingsferien": "Winterferien - Frühlingsferien",
  "Frühlingsferien-Sommerferien": "Frühlingsferien - Sommerferien",
  "Zusatz": "Zusatz",
};

export default function KanbanBoard({ themenGrouped }: KanbanBoardProps) {
  const [selectedThema, setSelectedThema] = useState<Thema | null>(null);

  const zeitraumOrder: Zeitraum[] = [
    "Sommerferien-Herbstferien",
    "Herbstferien-Weihnachtsferien",
    "Weihnachtsferien-Winterferien",
    "Winterferien-Frühlingsferien",
    "Frühlingsferien-Sommerferien",
    "Zusatz",
  ];

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {zeitraumOrder.map((zeitraum) => (
          <div
            key={zeitraum}
            className="flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4"
          >
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {ZEITRAUM_LABELS[zeitraum]}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {themenGrouped[zeitraum].length} Themen
              </p>
            </div>

            <div className="space-y-3">
              {themenGrouped[zeitraum].map((thema) => (
                <Card
                  key={thema.id}
                  className="hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
                  onClick={() => setSelectedThema(thema)}
                >
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
                      {thema.thema}
                    </CardTitle>
                    {thema.lehrmittel && (
                      <CardDescription className="text-xs flex items-center gap-1 mt-1">
                        <BookOpen className="h-3 w-3" />
                        {thema.lehrmittel}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {thema.anzahlLektionen && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                        <Clock className="h-3 w-3" />
                        {thema.anzahlLektionen} Lektionen
                      </Badge>
                    )}
                    {thema.beschreibung && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {thema.beschreibung}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}

              {themenGrouped[zeitraum].length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Keine Themen
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
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedThema.thema}</DialogTitle>
                {selectedThema.lehrmittel && (
                  <DialogDescription className="flex items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4" />
                    {selectedThema.lehrmittel}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Beschreibung */}
                {selectedThema.beschreibung && (
                  <div>
                    <h4 className="font-semibold mb-2">Beschreibung</h4>
                    <p className="text-sm text-muted-foreground">{selectedThema.beschreibung}</p>
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

                {/* Zeitraum */}
                {selectedThema.zeitraum && (
                  <div>
                    <h4 className="font-semibold mb-2">Zeitraum</h4>
                    <p className="text-sm text-muted-foreground">
                      {ZEITRAUM_LABELS[selectedThema.zeitraum]}
                    </p>
                  </div>
                )}

                {/* Links */}
                <div className="space-y-2">
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
                  {selectedThema.pictsBuchen && (
                    <a
                      href={selectedThema.pictsBuchen}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      PICTS buchen
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
