"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Kompetenz } from "@/types";
import { GraduationCap, Search, Lightbulb, BookOpen, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

// Reihenfolge der Kompetenzbereiche
const BEREICH_ORDER = ["Medien", "Informatik", "Anwendungskompetenzen"];

// Farben für Kompetenzbereiche
const BEREICH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Medien": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  "Informatik": { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  "Anwendungskompetenzen": { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
};

// Farben für Zyklen
const ZYKLUS_COLORS: Record<string, string> = {
  "Zyklus 1": "bg-amber-100 text-amber-800",
  "Zyklus 2": "bg-sky-100 text-sky-800",
  "Zyklus 3": "bg-violet-100 text-violet-800",
};

// Helper: Parse Querverweis LP Text zu Array von {code, link}
function parseQuerverweisLP(text: string): Array<{ code: string; link?: string }> {
  if (!text) return [];

  const results: Array<{ code: string; link?: string }> = [];

  // Format: [LP.Code](https://...) oder [LP.Code]\n(https://...)
  // Regex für Markdown-Link-Format
  const markdownLinkRegex = /\[([^\]]+)\]\s*\(([^)]+)\)/g;
  let match;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    results.push({
      code: match[1].trim(),
      link: match[2].trim(),
    });
  }

  // Falls keine Markdown-Links gefunden, versuche einfache LP-Codes zu extrahieren
  if (results.length === 0) {
    // Suche nach LP-Code-Patterns wie D.2.B.1.a, MI.1.1.a, NMG.7.4.a etc.
    const codeRegex = /([A-Z]{1,3}\.[0-9]+\.[A-Z]?\.[0-9]+\.[a-z]?|[A-Z]{1,3}\.[0-9]+\.[0-9]+\.[a-z])/gi;
    const codes = text.match(codeRegex);
    if (codes) {
      codes.forEach(code => {
        results.push({ code: code.trim() });
      });
    }
  }

  return results;
}

export default function LehrplanPage() {
  const { user } = useAuth();
  const [kompetenzen, setKompetenzen] = useState<Kompetenz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZyklus, setSelectedZyklus] = useState<string | null>(null);
  const [selectedKompetenz, setSelectedKompetenz] = useState<Kompetenz | null>(null);

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
    // Sortiere nach definierter Reihenfolge
    .sort((a, b) => {
      const indexA = BEREICH_ORDER.indexOf(a.bereich);
      const indexB = BEREICH_ORDER.indexOf(b.bereich);
      if (indexA === -1 && indexB === -1) return a.bereich.localeCompare(b.bereich);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  // Alle Zyklen extrahieren
  const alleZyklen = [...new Set(kompetenzen.flatMap((k) => k.zyklus || []))].sort();

  const getBereichColors = (bereich: string) => {
    return BEREICH_COLORS[bereich] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" };
  };

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
            <Accordion type="multiple" defaultValue={BEREICH_ORDER} className="space-y-4">
              {filteredBereiche.map(({ bereich, items }) => {
                const colors = getBereichColors(bereich);
                return (
                  <AccordionItem
                    key={bereich}
                    value={bereich}
                    className="border rounded-lg bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                          <GraduationCap className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">{bereich}</div>
                          <div className="text-sm text-muted-foreground">
                            {items.length} {items.length === 1 ? "Kompetenz" : "Kompetenzen"}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {items.map((k) => (
                          <Card
                            key={k.id}
                            className={`cursor-pointer hover:shadow-md transition-shadow border-t-4 ${colors.border}`}
                            onClick={() => setSelectedKompetenz(k)}
                          >
                            <CardContent className="p-4 space-y-3">
                              {/* LP Code */}
                              <div className="font-mono text-lg font-bold">
                                {k.lpCode}
                              </div>

                              {/* Kompetenzbereich Badge */}
                              <Badge className={`${colors.bg} ${colors.text} border-0`}>
                                {bereich}
                              </Badge>

                              {/* Kompetenz Text */}
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {k.kompetenz}
                              </p>

                              {/* Kompetenzstufe */}
                              {k.kompetenzstufe && (
                                <p className="text-sm line-clamp-2">
                                  {k.kompetenzstufe}
                                </p>
                              )}

                              {/* Grundanspruch */}
                              <div className="flex items-center gap-1">
                                {k.grundanspruch?.toLowerCase() === "ja" ? (
                                  <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Ja
                                  </Badge>
                                ) : k.grundanspruch?.toLowerCase() === "nein" ? (
                                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    nein
                                  </Badge>
                                ) : null}
                              </div>

                              {/* Zyklus & Klassenstufe */}
                              <div className="flex flex-wrap gap-1">
                                {k.zyklus?.map((z) => (
                                  <Badge
                                    key={z}
                                    className={`text-xs ${ZYKLUS_COLORS[z] || "bg-gray-100 text-gray-800"}`}
                                  >
                                    {z}
                                  </Badge>
                                ))}
                                {k.klassenstufe?.map((ks) => (
                                  <Badge key={ks} variant="outline" className="text-xs">
                                    {ks}
                                  </Badge>
                                ))}
                              </div>

                              {/* Querverweis */}
                              {k.querverweisLP && (
                                <div className="flex flex-wrap gap-1">
                                  {parseQuerverweisLP(k.querverweisLP).slice(0, 4).map((qv, idx) => (
                                    qv.link ? (
                                      <a
                                        key={idx}
                                        href={qv.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs font-mono bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 hover:text-slate-800 transition-colors"
                                      >
                                        {qv.code}
                                      </a>
                                    ) : (
                                      <span
                                        key={idx}
                                        className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600"
                                      >
                                        {qv.code}
                                      </span>
                                    )
                                  ))}
                                  {parseQuerverweisLP(k.querverweisLP).length > 4 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{parseQuerverweisLP(k.querverweisLP).length - 4}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Unterrichtsideen */}
                              {k.unterrichtsideen && k.unterrichtsideen.length > 0 && (
                                <div className="pt-2 border-t space-y-1">
                                  {k.unterrichtsideen.slice(0, 3).map((u) => (
                                    <Link
                                      key={u.id}
                                      href={`/dashboard/jahresplan?search=${encodeURIComponent(u.name)}&allStufen=true`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 text-xs text-primary hover:underline truncate"
                                    >
                                      <Lightbulb className="h-3 w-3 text-yellow-500 shrink-0" />
                                      <span className="truncate">{u.name}</span>
                                    </Link>
                                  ))}
                                  {k.unterrichtsideen.length > 3 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{k.unterrichtsideen.length - 3} weitere
                                    </span>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
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

        {/* Detail Dialog */}
        <Dialog open={!!selectedKompetenz} onOpenChange={() => setSelectedKompetenz(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedKompetenz && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span className="font-mono text-2xl">{selectedKompetenz.lpCode}</span>
                    <Badge className={`${getBereichColors(selectedKompetenz.kompetenzbereich || "").bg} ${getBereichColors(selectedKompetenz.kompetenzbereich || "").text} border-0`}>
                      {selectedKompetenz.kompetenzbereich}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Kompetenz */}
                  {selectedKompetenz.kompetenz && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Kompetenz</h4>
                      <p>{selectedKompetenz.kompetenz}</p>
                    </div>
                  )}

                  {/* Kompetenzstufe */}
                  {selectedKompetenz.kompetenzstufe && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Kompetenzstufe</h4>
                      <p>{selectedKompetenz.kompetenzstufe}</p>
                    </div>
                  )}

                  {/* Grundanspruch */}
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">Grundanspruch</h4>
                    {selectedKompetenz.grundanspruch?.toLowerCase() === "ja" ? (
                      <Badge className="bg-green-100 text-green-800 border-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ja
                      </Badge>
                    ) : selectedKompetenz.grundanspruch?.toLowerCase() === "nein" ? (
                      <Badge className="bg-red-100 text-red-800 border-0">
                        <XCircle className="h-3 w-3 mr-1" />
                        Nein
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Zyklus & Klassenstufe */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Zyklus</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedKompetenz.zyklus?.map((z) => (
                          <Badge
                            key={z}
                            className={`${ZYKLUS_COLORS[z] || "bg-gray-100 text-gray-800"}`}
                          >
                            {z}
                          </Badge>
                        )) || <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Klassenstufe</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedKompetenz.klassenstufe?.map((ks) => (
                          <Badge key={ks} variant="outline">
                            {ks}
                          </Badge>
                        )) || <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                  </div>

                  {/* Querverweis */}
                  {selectedKompetenz.querverweisLP && parseQuerverweisLP(selectedKompetenz.querverweisLP).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Querverweis LP</h4>
                      <div className="flex flex-wrap gap-2">
                        {parseQuerverweisLP(selectedKompetenz.querverweisLP).map((qv, idx) => (
                          qv.link ? (
                            <a
                              key={idx}
                              href={qv.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-sm bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 hover:text-slate-900 transition-colors"
                            >
                              {qv.code}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span
                              key={idx}
                              className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-700"
                            >
                              {qv.code}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unterrichtsideen */}
                  {selectedKompetenz.unterrichtsideen && selectedKompetenz.unterrichtsideen.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Unterrichtsideen ({selectedKompetenz.unterrichtsideen.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedKompetenz.unterrichtsideen.map((u) => (
                          <Link
                            key={u.id}
                            href={`/dashboard/jahresplan?search=${encodeURIComponent(u.name)}&allStufen=true`}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <BookOpen className="h-4 w-4 text-primary shrink-0" />
                              <div>
                                <span className="font-medium group-hover:text-primary transition-colors">
                                  {u.name}
                                </span>
                                {u.lehrmittel && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({u.lehrmittel})
                                  </span>
                                )}
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
