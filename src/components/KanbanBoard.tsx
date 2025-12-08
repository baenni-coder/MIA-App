"use client";

import { Thema, Zeitraum } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

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
  const zeitraumOrder: Zeitraum[] = [
    "Sommerferien-Herbstferien",
    "Herbstferien-Weihnachtsferien",
    "Weihnachtsferien-Winterferien",
    "Winterferien-Frühlingsferien",
    "Frühlingsferien-Sommerferien",
    "Zusatz",
  ];

  return (
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
              <Card key={thema.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm line-clamp-2">
                    {thema.thema}
                  </CardTitle>
                  {thema.lehrmittel && (
                    <CardDescription className="text-xs">
                      {thema.lehrmittel}
                    </CardDescription>
                  )}
                </CardHeader>
                {(thema.beschreibung || thema.anzahlLektionen) && (
                  <CardContent className="p-4 pt-0 space-y-2">
                    {thema.beschreibung && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {thema.beschreibung}
                      </p>
                    )}
                    {thema.anzahlLektionen && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {thema.anzahlLektionen} Lektionen
                        </span>
                      </div>
                    )}
                    {thema.kompetenzenLehrplan && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Kompetenzen:</span>{" "}
                        {thema.kompetenzenLehrplan}
                      </div>
                    )}
                  </CardContent>
                )}
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
  );
}
