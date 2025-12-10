"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thema, Stufe } from "@/types";
import { BookOpen, ExternalLink } from "lucide-react";

export default function LehrmittelPage() {
  const { user } = useAuth();
  const [allThemen, setAllThemen] = useState<Thema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Lade alle Themen (ohne Stufen-Filter)
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sortedLehrmittel.map(([lehrmittel, themen]) => {
                // Nehme das erste Bild aus den Themen
                const bildUrl = themen.find((t) => t.bildLehrmittel)?.bildLehrmittel;

                return (
                  <Card key={lehrmittel} className="hover:shadow-lg transition-shadow">
                    {bildUrl && (
                      <div className="w-full h-48 bg-muted overflow-hidden rounded-t-lg">
                        <img
                          src={bildUrl}
                          alt={lehrmittel}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{lehrmittel}</CardTitle>
                      </div>
                      <CardDescription>
                        {themen.length} {themen.length === 1 ? "Thema" : "Themen"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Themen auflisten */}
                      <div className="space-y-2">
                        {themen.map((thema) => (
                          <div
                            key={thema.id}
                            className="text-sm border-l-2 border-primary/30 pl-3 py-1"
                          >
                            <div className="font-medium">{thema.thema}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {thema.schuljahr.slice(0, 3).map((stufe) => (
                                <Badge key={stufe} variant="outline" className="text-xs">
                                  {stufe}
                                </Badge>
                              ))}
                              {thema.schuljahr.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{thema.schuljahr.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Links zu Unterlagen */}
                      {themen.some((t) => t.unterlagen) && (
                        <div className="pt-2 border-t">
                          {themen
                            .filter((t) => t.unterlagen)
                            .map((thema) => (
                              <a
                                key={thema.id}
                                href={thema.unterlagen}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Unterlagen: {thema.thema}
                              </a>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
