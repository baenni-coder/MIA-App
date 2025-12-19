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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Kompetenz } from "@/types";
import { GraduationCap, Search, BookOpen, Lightbulb } from "lucide-react";

export default function LehrplanPage() {
  const { user } = useAuth();
  const [kompetenzen, setKompetenzen] = useState<Kompetenz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZyklus, setSelectedZyklus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetch("/api/kompetenzen")
        .then((res) => res.json())
        .then((data) => {
          setKompetenzen(data.kompetenzen || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading kompetenzen:", err);
          setLoading(false);
        });
    }
  }, [user]);

  // Gruppiere nach Kompetenzbereich
  const gruppiertNachBereich = kompetenzen.reduce((acc, k) => {
    const bereich = k.kompetenzbereich || "Ohne Bereich";
    if (!acc[bereich]) {
      acc[bereich] = [];
    }
    acc[bereich].push(k);
    return acc;
  }, {} as Record<string, Kompetenz[]>);

  // Filter anwenden
  const filteredBereiche = Object.entries(gruppiertNachBereich)
    .map(([bereich, items]) => {
      const filtered = items.filter((k) => {
        const matchesSearch =
          !searchTerm ||
          k.lpCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          k.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          k.kompetenz?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesZyklus =
          !selectedZyklus || k.zyklus?.includes(selectedZyklus);

        return matchesSearch && matchesZyklus;
      });
      return { bereich, items: filtered };
    })
    .filter(({ items }) => items.length > 0)
    .sort((a, b) => a.bereich.localeCompare(b.bereich));

  // Alle Zyklen extrahieren
  const alleZyklen = [...new Set(kompetenzen.flatMap((k) => k.zyklus || []))].sort();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <GraduationCap className="h-8 w-8" />
              Lehrplan Kompetenzen
            </h2>
            <p className="text-muted-foreground mt-2">
              Übersicht aller MIA-Kompetenzen mit verlinkten Unterrichtsideen
            </p>
          </div>

          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Suche nach LP-Code, Name oder Kompetenz..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    variant={selectedZyklus === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedZyklus(null)}
                  >
                    Alle Zyklen
                  </Badge>
                  {alleZyklen.map((zyklus) => (
                    <Badge
                      key={zyklus}
                      variant={selectedZyklus === zyklus ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedZyklus(zyklus)}
                    >
                      {zyklus}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Kompetenzen werden geladen...</p>
              </div>
            </div>
          ) : filteredBereiche.length > 0 ? (
            <Accordion type="multiple" defaultValue={[filteredBereiche[0]?.bereich]} className="space-y-4">
              {filteredBereiche.map(({ bereich, items }) => (
                <AccordionItem
                  key={bereich}
                  value={bereich}
                  className="border rounded-lg bg-card overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{bereich}</div>
                        <div className="text-sm text-muted-foreground">
                          {items.length} {items.length === 1 ? "Kompetenz" : "Kompetenzen"}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-24">LP Code</TableHead>
                            <TableHead>Kompetenz</TableHead>
                            <TableHead className="w-28">Zyklus</TableHead>
                            <TableHead className="w-48">Unterrichtsideen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((k) => (
                            <TableRow key={k.id}>
                              <TableCell className="font-mono text-sm font-medium">
                                {k.lpCode}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{k.name}</div>
                                {k.kompetenz && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {k.kompetenz}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {k.zyklus?.map((z) => (
                                    <Badge key={z} variant="secondary" className="text-xs">
                                      {z}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                {k.unterrichtsideen && k.unterrichtsideen.length > 0 ? (
                                  <div className="space-y-1">
                                    {k.unterrichtsideen.map((u) => (
                                      <div
                                        key={u.id}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <Lightbulb className="h-3 w-3 text-yellow-500 shrink-0" />
                                        <span className="text-primary font-medium truncate">
                                          {u.name}
                                        </span>
                                        {u.lehrmittel && (
                                          <span className="text-xs text-muted-foreground">
                                            ({u.lehrmittel})
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm || selectedZyklus
                  ? "Keine Kompetenzen gefunden für die gewählten Filter."
                  : "Keine Kompetenzen gefunden."}
              </p>
            </div>
          )}

          {/* Statistik */}
          {!loading && kompetenzen.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{kompetenzen.length}</div>
                    <div className="text-sm text-muted-foreground">Kompetenzen</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {Object.keys(gruppiertNachBereich).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Kompetenzbereiche</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {kompetenzen.filter((k) => k.unterrichtsideen?.length).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Mit Unterrichtsideen</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{alleZyklen.length}</div>
                    <div className="text-sm text-muted-foreground">Zyklen</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
