"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Thema } from "@/types";
import { BookOpen, FileText, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";

// Feste Thumbnail-Mappings für bestimmte Lehrmittel
// Diese überschreiben die Airtable-Bilder
const LEHRMITTEL_THUMBNAILS: Record<string, string> = {
  "PICTS BeLoSe": "/PICTS_Graffiti.png",
};

export default function LehrmittelPage() {
  const { user } = useAuth();
  const [allThemen, setAllThemen] = useState<Thema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch("/api/themen")
        .then((res) => res.json())
        .then((data) => {
          setAllThemen(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading themen:", err);
          setLoading(false);
        });
    }
  }, [user]);

  // Gruppiere Themen nach Lehrmittel
  const lehrmittelMap = new Map<string, Thema[]>();
  allThemen.forEach((thema) => {
    if (thema.lehrmittel) {
      if (!lehrmittelMap.has(thema.lehrmittel)) {
        lehrmittelMap.set(thema.lehrmittel, []);
      }
      lehrmittelMap.get(thema.lehrmittel)!.push(thema);
    }
  });

  // Sortiere Lehrmittel alphabetisch
  const sortedLehrmittel = Array.from(lehrmittelMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Lehrmittel-Übersicht</h2>
            <p className="text-muted-foreground mt-2">
              Alle verfügbaren Lehrmittel und zugehörige Themen
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Lehrmittel werden geladen...</p>
              </div>
            </div>
          ) : sortedLehrmittel.length > 0 ? (
            <Accordion type="multiple" className="space-y-4">
              {sortedLehrmittel.map(([lehrmittel, themen]) => {
                // Prüfe zuerst das feste Mapping, dann Airtable-Bild
                const bildUrl = LEHRMITTEL_THUMBNAILS[lehrmittel] ||
                  themen.find((t) => t.bildLehrmittel)?.bildLehrmittel;

                return (
                  <AccordionItem
                    key={lehrmittel}
                    value={lehrmittel}
                    className="border rounded-lg bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-4 w-full">
                        {bildUrl ? (
                          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                            <img
                              src={bildUrl}
                              alt={lehrmittel}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback: BookOpen-Icon anzeigen statt kaputtes Bild
                                const parent = e.currentTarget.parentElement as HTMLElement;
                                parent.innerHTML = "";
                                parent.className = "w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0";
                                parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="text-left flex-1">
                          <div className="font-semibold text-lg">{lehrmittel}</div>
                          <div className="text-sm text-muted-foreground">
                            {themen.length} {themen.length === 1 ? "Thema" : "Themen"}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3 pt-2">
                        {[...themen].sort((a, b) => a.thema.localeCompare(b.thema)).map((thema) => (
                          <div
                            key={thema.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              {/* Thema-Name als Link zum Jahresplan */}
                              <Link
                                href={`/dashboard/jahresplan?search=${encodeURIComponent(thema.thema)}&allStufen=true`}
                                className="font-medium text-primary hover:underline flex items-center gap-1"
                              >
                                {thema.thema}
                                <ArrowRight className="h-3 w-3" />
                              </Link>

                              {/* Beschreibung */}
                              {thema.beschreibung && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {thema.beschreibung}
                                </p>
                              )}

                              {/* Klassenstufen & Lektionen */}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {thema.schuljahr.slice(0, 4).map((stufe) => (
                                  <Badge key={stufe} variant="outline" className="text-xs">
                                    {stufe}
                                  </Badge>
                                ))}
                                {thema.schuljahr.length > 4 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{thema.schuljahr.length - 4}
                                  </Badge>
                                )}
                                {thema.anzahlLektionen && (
                                  <Badge variant="secondary" className="text-xs">
                                    {thema.anzahlLektionen} Lektionen
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Keine Lehrmittel gefunden.</p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
