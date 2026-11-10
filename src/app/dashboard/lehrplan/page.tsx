"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Kompetenz, Regelstandard } from "@/types";
import { getRegelstandardsByLPCode } from "@/lib/data/regelstandards";
import { getVorlagenBezuege } from "@/lib/data/lehrmittel-vorlagen";
import { fachIndex, normalizeFach } from "@/lib/data/lehrmittel-kategorien";
import { getLp21FachbereichFarbe } from "@/lib/data/lp21-data";
import { GraduationCap, Search, Lightbulb, BookOpen, ExternalLink, CheckCircle, XCircle, FileText, Target, Library } from "lucide-react";
import Link from "next/link";

// Reihenfolge der Kompetenzbereiche
const BEREICH_ORDER = ["Medien", "Informatik", "Anwendungskompetenzen"];

// Farben für Kompetenzbereiche
const BEREICH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Medien": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  "Informatik": { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  "Anwendungskompetenzen": { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
};

// Pseudo-Code für die MIA-Ansicht (Airtable-Kompetenzen inkl. Unterrichtsideen)
const MIA = "MIA";

// Natürliche Sortierung von LP-Codes (D.1.A.1.b vor D.1.A.10.a)
function compareLpCode(a: string, b: string): number {
  return a.localeCompare(b, "de", { numeric: true });
}

/** "D.4.B.1.c" → "D.4" (Kompetenzbereich) */
function kbCodeOf(lpCode: string): string {
  return lpCode.split(".").slice(0, 2).join(".");
}

/** "D.4.B.1.c" → "D.4.B.1" (Kompetenz) */
function kompetenzCodeOf(lpCode: string): string {
  const parts = lpCode.split(".");
  return parts.length > 2 ? parts.slice(0, -1).join(".") : lpCode;
}

interface Lp21StrukturKb {
  code: string;
  bezeichnung: string;
  kompetenzen: { code: string; bezeichnung: string }[];
}

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

function LehrplanPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [kompetenzen, setKompetenzen] = useState<Kompetenz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedZyklus, setSelectedZyklus] = useState<string | null>(null);
  const [selectedKompetenz, setSelectedKompetenz] = useState<Kompetenz | null>(null);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Fach-Auswahl: MIA (Standard) oder ein per LP21-Sync geladener Fachbereich
  const [fach, setFach] = useState<string>(searchParams.get("fach") || MIA);
  const [fachListe, setFachListe] = useState<{ code: string; name: string }[]>([]);
  const [lp21Kompetenzen, setLp21Kompetenzen] = useState<Kompetenz[]>([]);
  const [lp21Struktur, setLp21Struktur] = useState<Lp21StrukturKb[]>([]);
  const [lp21Loading, setLp21Loading] = useState(false);

  // Verfügbare Fachbereiche (aus dem LP21-Sync) laden
  useEffect(() => {
    if (!user) return;
    fetch("/api/kompetenzen/lp21/struktur")
      .then((res) => res.json())
      .then((data) => {
        const list: { code: string; name: string }[] = (data.fachbereiche || [])
          .filter((f: { code: string }) => f.code !== "MI" && f.code !== "IB")
          .map((f: { code: string; name: string }) => ({ code: f.code, name: f.name || f.code }));
        // Dedupe + Sortierung nach App-Reihenfolge der Fächer
        const seen = new Set<string>();
        const uniq = list.filter((f) => (seen.has(f.code) ? false : (seen.add(f.code), true)));
        uniq.sort((a, b) => {
          const fa = normalizeFach(a.code);
          const fb = normalizeFach(b.code);
          return (fa ? fachIndex(fa) : 999) - (fb ? fachIndex(fb) : 999) || a.name.localeCompare(b.name);
        });
        setFachListe(uniq);
      })
      .catch((err) => console.error("Error loading Fachbereiche:", err));
  }, [user]);

  // Kompetenzstufen + Struktur eines LP21-Fachbereichs laden
  useEffect(() => {
    if (!user || fach === MIA) return;
    let cancelled = false;
    setLp21Loading(true);
    Promise.all([
      fetch(`/api/kompetenzen/lp21?fachbereich=${encodeURIComponent(fach)}`).then((r) => r.json()),
      fetch(`/api/kompetenzen/lp21/struktur?fachbereich=${encodeURIComponent(fach)}`).then((r) => r.json()),
    ])
      .then(([stufenData, strukturData]) => {
        if (cancelled) return;
        const mapped: Kompetenz[] = (stufenData.kompetenzstufen || []).map(
          (k: Kompetenz & { id: string }) => ({
            id: k.id || k.lpCode || "",
            name: k.name,
            lpCode: k.lpCode,
            kompetenzbereich: k.kompetenzbereich,
            kompetenz: k.kompetenz,
            kompetenzstufe: k.kompetenzstufe,
            zyklus: k.zyklus,
            klassenstufe: k.klassenstufe,
            grundanspruch: k.grundanspruch,
            orientierungspunkt: k.orientierungspunkt,
            source: "lp21" as const,
          })
        );
        setLp21Kompetenzen(mapped);
        setLp21Struktur(strukturData.kompetenzbereiche || []);
      })
      .catch((err) => console.error("Error loading LP21 Kompetenzen:", err))
      .finally(() => {
        if (!cancelled) setLp21Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, fach]);

  const waehleFach = (code: string) => {
    setFach(code);
    setSelectedKompetenz(null);
    // URL aktualisieren (teilbar), ohne Navigation
    const url = new URL(window.location.href);
    if (code === MIA) url.searchParams.delete("fach");
    else url.searchParams.set("fach", code);
    window.history.replaceState(null, "", url.toString());
  };

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

  // Auto-open Kompetenz from URL search param
  useEffect(() => {
    if (!loading && kompetenzen.length > 0 && searchTerm && !hasAutoOpened) {
      // If search term looks like an LP code, try to open that specific one
      const lpCodeMatch = fach === MIA && searchTerm.match(/^(MI|IB)\.\d+\.\d+\.[a-z]$/i);
      if (lpCodeMatch) {
        const matchingK = kompetenzen.find(
          (k) => k.lpCode?.toLowerCase() === searchTerm.toLowerCase()
        );
        if (matchingK) {
          setSelectedKompetenz(matchingK);
          setHasAutoOpened(true);
        }
      }
    }
  }, [loading, kompetenzen, searchTerm, hasAutoOpened, fach]);

  // LP-Code eines anderen Fachs in der Suche (z.B. ?search=D.4.B.1.c) → Fach wechseln + öffnen
  useEffect(() => {
    if (hasAutoOpened || !searchTerm) return;
    const m = searchTerm.match(/^([A-Za-z0-9]+)\.\d+/);
    if (!m || /^(MI|IB)$/i.test(m[1])) return;
    const code = fachListe.find((f) => f.code.toLowerCase() === m[1].toLowerCase())?.code;
    if (code && fach !== code) {
      setFach(code);
      return;
    }
    if (fach !== MIA && !lp21Loading && lp21Kompetenzen.length > 0) {
      const hit = lp21Kompetenzen.find((k) => k.lpCode?.toLowerCase() === searchTerm.toLowerCase());
      if (hit) setSelectedKompetenz(hit);
      setHasAutoOpened(true);
    }
  }, [searchTerm, fachListe, fach, lp21Loading, lp21Kompetenzen, hasAutoOpened]);

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

  // Alle Zyklen extrahieren (nur gültige Zyklen 1-3)
  const VALID_ZYKLEN = ["Zyklus 1", "Zyklus 2", "Zyklus 3"];
  const aktiveKompetenzen = fach === MIA ? kompetenzen : lp21Kompetenzen;
  const alleZyklen = [...new Set(aktiveKompetenzen.flatMap((k) => k.zyklus || []))]
    .filter((z) => VALID_ZYKLEN.includes(z))
    .sort();

  const getBereichColors = (bereich: string) => {
    return BEREICH_COLORS[bereich] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" };
  };

  // Helper: Get related Regelstandards for a Kompetenz
  const getRelatedRegelstandards = (lpCode: string | undefined): Regelstandard[] => {
    if (!lpCode) return [];
    return getRegelstandardsByLPCode(lpCode);
  };

  // LP21-Fachbereich: Kompetenzbereich → Kompetenz → Kompetenzstufen
  const fachFarbe = fach === MIA ? "#6366F1" : getLp21FachbereichFarbe(fach);
  const lp21Gruppen = (() => {
    if (fach === MIA) return [];
    const q = searchTerm.trim().toLowerCase();
    const kbName = new Map(lp21Struktur.map((kb) => [kb.code, kb.bezeichnung]));
    const kName = new Map(
      lp21Struktur.flatMap((kb) => kb.kompetenzen.map((k) => [k.code, k.bezeichnung] as const))
    );
    const byKb = new Map<string, Map<string, Kompetenz[]>>();
    lp21Kompetenzen.forEach((k) => {
      if (!k.lpCode) return;
      if (selectedZyklus && !k.zyklus?.includes(selectedZyklus)) return;
      if (
        q &&
        !k.lpCode.toLowerCase().includes(q) &&
        !k.kompetenz?.toLowerCase().includes(q) &&
        !k.kompetenzstufe?.toLowerCase().includes(q)
      )
        return;
      const kb = kbCodeOf(k.lpCode);
      const ko = kompetenzCodeOf(k.lpCode);
      if (!byKb.has(kb)) byKb.set(kb, new Map());
      const m = byKb.get(kb)!;
      m.set(ko, [...(m.get(ko) || []), k]);
    });
    return Array.from(byKb.entries())
      .sort(([a], [b]) => compareLpCode(a, b))
      .map(([kbCode, kompetenzenMap]) => {
        const kompetenzen = Array.from(kompetenzenMap.entries())
          .sort(([a], [b]) => compareLpCode(a, b))
          .map(([code, stufen]) => ({
            code,
            titel: kName.get(code) || stufen[0]?.kompetenzstufe || "",
            stufen: stufen.sort((x, y) => compareLpCode(x.lpCode || "", y.lpCode || "")),
          }));
        const first = kompetenzen[0]?.stufen[0];
        return {
          code: kbCode,
          titel: kbName.get(kbCode) || first?.kompetenzbereich || kbCode,
          kompetenzen,
          anzahl: kompetenzen.reduce((n, k) => n + k.stufen.length, 0),
        };
      });
  })();
  const fachName =
    fach === MIA ? "Medien und Informatik" : fachListe.find((f) => f.code === fach)?.name || fach;

  const renderCard = (
    k: Kompetenz,
    bereichLabel: string,
    colors: { bg: string; text: string; border: string },
    options?: { hideKompetenzstufe?: boolean }
  ) => (
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
                                {bereichLabel}
                              </Badge>

                              {/* Kompetenz Text */}
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {k.kompetenz}
                              </p>

                              {/* Kompetenzstufe */}
                              {k.kompetenzstufe && !options?.hideKompetenzstufe && (
                                <p className="text-sm line-clamp-2">
                                  {k.kompetenzstufe}
                                </p>
                              )}

                              {/* Grundanspruch & Orientierungspunkt */}
                              <div className="flex items-center gap-1 flex-wrap">
                                {k.grundanspruch?.toLowerCase() === "ja" ? (
                                  <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Grundanspruch
                                  </Badge>
                                ) : k.grundanspruch?.toLowerCase() === "nein" ? (
                                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    kein Grundanspruch
                                  </Badge>
                                ) : null}
                                {k.orientierungspunkt && (
                                  <Badge className="bg-orange-100 text-orange-800 border-0 text-xs">
                                    <Target className="h-3 w-3 mr-1" />
                                    Orientierungspunkt
                                  </Badge>
                                )}
                              </div>

                              {/* Zyklus & Klassenstufe */}
                              <div className="flex flex-wrap gap-1">
                                {k.zyklus?.filter((z) => VALID_ZYKLEN.includes(z)).map((z) => (
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

                              {/* Lehrmittel-Bezüge (aus Jahresplanungsvorlagen) */}
                              {getVorlagenBezuege(k.lpCode, k.zyklus).length > 0 && (
                                <div className="pt-2 border-t space-y-1">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Library className="h-3 w-3 shrink-0" />
                                    <span>In Lehrmitteln</span>
                                  </div>
                                  {getVorlagenBezuege(k.lpCode, k.zyklus).slice(0, 2).map((b) => (
                                    <Link
                                      key={`${b.vorlageId}-${b.blockTitel}`}
                                      href="/dashboard/lehrmittel"
                                      onClick={(e) => e.stopPropagation()}
                                      className="block text-xs text-primary hover:underline truncate"
                                    >
                                      {b.lehrmittel} – {b.blockTitel}
                                    </Link>
                                  ))}
                                  {getVorlagenBezuege(k.lpCode, k.zyklus).length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{getVorlagenBezuege(k.lpCode, k.zyklus).length - 2} weitere
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Regelstandards (Kanton SO) */}
                              {getRelatedRegelstandards(k.lpCode).length > 0 && (
                                <div className="pt-2 border-t space-y-1">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <FileText className="h-3 w-3 shrink-0" />
                                    <span>Regelstandards SO</span>
                                  </div>
                                  {getRelatedRegelstandards(k.lpCode).slice(0, 2).map((rs) => (
                                    <Link
                                      key={rs.rsCode}
                                      href={`/dashboard/regelstandards?search=${encodeURIComponent(rs.rsCode)}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 text-xs text-teal-600 hover:underline truncate"
                                    >
                                      <span className="font-mono">{rs.rsCode}</span>
                                    </Link>
                                  ))}
                                  {getRelatedRegelstandards(k.lpCode).length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{getRelatedRegelstandards(k.lpCode).length - 2} weitere
                                    </span>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
  );

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
              {fach === MIA
                ? "Medien und Informatik mit verlinkten Unterrichtsideen"
                : `Lehrplan 21 – ${fachName}: Kompetenzbereiche, Kompetenzen und Kompetenzstufen`}
            </p>
          </div>

          {/* Fach-Auswahl */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Fachbereich wählen">
            {[{ code: MIA, name: "Medien und Informatik" }, ...fachListe].map((f) => {
              const aktiv = fach === f.code;
              const farbe = f.code === MIA ? "#6366F1" : getLp21FachbereichFarbe(f.code);
              return (
                <button
                  key={f.code}
                  type="button"
                  role="tab"
                  aria-selected={aktiv}
                  onClick={() => waehleFach(f.code)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    aktiv ? "text-white border-transparent" : "bg-card hover:bg-muted"
                  }`}
                  style={aktiv ? { backgroundColor: farbe } : undefined}
                >
                  {!aktiv && (
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: farbe }} aria-hidden />
                  )}
                  {f.name}
                </button>
              );
            })}
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

          {fach === MIA ? (<>
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
                        {items.map((k) => renderCard(k, bereich, colors))}
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
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
                    <div className="text-2xl font-bold text-orange-600">
                      {kompetenzen.filter((k) => k.orientierungspunkt).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Orientierungspunkte</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{alleZyklen.length}</div>
                    <div className="text-sm text-muted-foreground">Zyklen</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </>) : lp21Loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">{fachName} wird geladen...</p>
              </div>
            </div>
          ) : lp21Gruppen.length > 0 ? (
            <>
              <Accordion type="multiple" className="space-y-4">
                {lp21Gruppen.map((kb) => (
                  <AccordionItem
                    key={kb.code}
                    value={kb.code}
                    className="border rounded-lg bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-3 text-left">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: fachFarbe }}
                        >
                          {kb.code}
                        </div>
                        <div>
                          <div className="font-semibold">{kb.titel}</div>
                          <div className="text-sm text-muted-foreground">
                            {kb.kompetenzen.length} {kb.kompetenzen.length === 1 ? "Kompetenz" : "Kompetenzen"} ·{" "}
                            {kb.anzahl} Kompetenzstufen
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-6">
                      {kb.kompetenzen.map((ko) => (
                        <div key={ko.code} className="space-y-3">
                          <h4 className="text-sm font-semibold">
                            <span className="font-mono mr-2">{ko.code}</span>
                            <span className="font-normal text-muted-foreground">{ko.titel}</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {ko.stufen.map((k) =>
                              renderCard(
                                k,
                                kb.titel,
                                { bg: "bg-muted", text: "text-foreground", border: "border-muted" },
                                { hideKompetenzstufe: ko.titel === k.kompetenzstufe }
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{lp21Kompetenzen.length}</div>
                      <div className="text-sm text-muted-foreground">Kompetenzstufen</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{lp21Gruppen.length}</div>
                      <div className="text-sm text-muted-foreground">Kompetenzbereiche</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {lp21Kompetenzen.filter((k) => k.orientierungspunkt).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Orientierungspunkte</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {lp21Kompetenzen.filter((k) => getVorlagenBezuege(k.lpCode, k.zyklus).length > 0).length}
                      </div>
                      <div className="text-sm text-muted-foreground">In Lehrmitteln</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {lp21Kompetenzen.length > 0
                  ? "Keine Kompetenzen gefunden für die gewählten Filter."
                  : `Für ${fachName} sind noch keine Kompetenzen synchronisiert (Daten-Sync → LP21).`}
              </p>
            </div>
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

                  {/* Grundanspruch & Orientierungspunkt */}
                  <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Orientierungspunkt</h4>
                      {selectedKompetenz.orientierungspunkt ? (
                        <Badge className="bg-orange-100 text-orange-800 border-0">
                          <Target className="h-3 w-3 mr-1" />
                          Ja
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Nein</span>
                      )}
                    </div>
                  </div>

                  {/* Zyklus & Klassenstufe */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Zyklus</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedKompetenz.zyklus?.filter((z) => VALID_ZYKLEN.includes(z)).map((z) => (
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

                  {/* Lehrmittel-Bezüge */}
                  {getVorlagenBezuege(selectedKompetenz.lpCode, selectedKompetenz.zyklus).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Library className="h-4 w-4 text-primary" />
                        In Lehrmitteln ({getVorlagenBezuege(selectedKompetenz.lpCode, selectedKompetenz.zyklus).length})
                      </h4>
                      <div className="space-y-2">
                        {getVorlagenBezuege(selectedKompetenz.lpCode, selectedKompetenz.zyklus).map((b) => (
                          <Link
                            key={`${b.vorlageId}-${b.blockTitel}`}
                            href="/dashboard/lehrmittel"
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                          >
                            <div>
                              <span className="font-medium group-hover:text-primary transition-colors">
                                {b.blockTitel}
                              </span>
                              <span className="text-sm text-muted-foreground ml-2">({b.lehrmittel})</span>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regelstandards (Kanton Solothurn) */}
                  {getRelatedRegelstandards(selectedKompetenz.lpCode).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-teal-600" />
                        Regelstandards Kanton Solothurn ({getRelatedRegelstandards(selectedKompetenz.lpCode).length})
                      </h4>
                      <div className="space-y-2">
                        {getRelatedRegelstandards(selectedKompetenz.lpCode).map((rs) => (
                          <Link
                            key={rs.rsCode}
                            href={`/dashboard/regelstandards?search=${encodeURIComponent(rs.rsCode)}`}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-teal-700">{rs.rsCode}</span>
                              <div>
                                <span className="font-medium group-hover:text-teal-600 transition-colors">
                                  {rs.kompetenz}
                                </span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({rs.zyklus}, {rs.klassenstufe})
                                </span>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-teal-600 transition-colors" />
                          </Link>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Diese Regelstandards sind spezifisch für den Kanton Solothurn.
                      </p>
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

export default function LehrplanPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Wird geladen...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <LehrplanPageContent />
    </Suspense>
  );
}
