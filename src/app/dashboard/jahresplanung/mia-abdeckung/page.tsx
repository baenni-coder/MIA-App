"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Target,
  CheckCircle2,
  Circle,
  Loader2,
  Download,
  ExternalLink,
  Link as LinkIcon,
  Info,
} from "lucide-react";
import Link from "next/link";
import {
  MiaBereich,
  MiaCoverageResult,
  MiaCoverageStats,
  Stufe,
  Teacher,
} from "@/types";
import { getAktuellesSchuljahr, getSchuljahrListe } from "@/lib/data/lp21-data";

const STUFEN: Stufe[] = [
  "KiGa",
  "1. Klasse",
  "2. Klasse",
  "3. Klasse",
  "4. Klasse",
  "5. Klasse",
  "6. Klasse",
  "7. Klasse",
  "8. Klasse",
  "9. Klasse",
];

const BEREICH_LABELS: Record<MiaBereich, string> = {
  medien: "Medien",
  informatik: "Informatik",
  anwendungskompetenzen: "Anwendungskompetenzen",
};

const BEREICH_COLORS: Record<MiaBereich, string> = {
  medien: "#6366F1",
  informatik: "#0891B2",
  anwendungskompetenzen: "#F59E0B",
};

export default function MiaAbdeckungPage() {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MiaCoverageResult[]>([]);
  const [stats, setStats] = useState<MiaCoverageStats | null>(null);
  const [schuljahr, setSchuljahr] = useState<string>(getAktuellesSchuljahr());
  const [stufeFilter, setStufeFilter] = useState<Stufe | "all">("all");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Lehrer laden + Default-Stufe setzen
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/teachers?userId=${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Lehrer-Profil konnte nicht geladen werden");
        const data: Teacher = await res.json();
        if (cancelled) return;
        setTeacher(data);
        setStufeFilter(data.stufe);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Coverage laden, sobald Lehrer + Filter klar sind
  useEffect(() => {
    if (!user || !teacher) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await user.getIdToken();
        const params = new URLSearchParams();
        params.set("schuljahr", schuljahr);
        params.set("stufe", stufeFilter);
        const res = await fetch(
          `/api/jahresplanung/mia-abdeckung?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Abdeckung konnte nicht geladen werden");
        }
        const data = await res.json();
        if (cancelled) return;
        setResults(data.results || []);
        setStats(data.stats || null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unbekannter Fehler");
          setResults([]);
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, teacher, schuljahr, stufeFilter]);

  // Gruppiere Resultate nach Bereich
  const grouped = useMemo(() => {
    const g: Record<MiaBereich, MiaCoverageResult[]> = {
      medien: [],
      informatik: [],
      anwendungskompetenzen: [],
    };
    results.forEach((r) => g[r.bereich].push(r));
    return g;
  }, [results]);

  const coverageRate = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.covered / stats.total) * 100);
  }, [stats]);

  const handleExportPdf = async () => {
    if (downloadingPdf || !teacher) return;
    setDownloadingPdf(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { default: MiaAbdeckungPDF } = await import(
        "@/components/MiaAbdeckungPDF"
      );
      const blob = await pdf(
        <MiaAbdeckungPDF
          schuljahr={schuljahr}
          lehrerName={teacher.name}
          klasse={teacher.stufe}
          kanton={teacher.kanton}
          stufeFilter={stufeFilter}
          stats={stats!}
          results={results}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MIA-Abdeckung_${schuljahr.replace("/", "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF-Export Fehler:", err);
      alert(
        "PDF-Export fehlgeschlagen: " +
          (err instanceof Error ? err.message : "Unbekannter Fehler")
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Target className="h-8 w-8 text-primary" />
                MIA-Abdeckung
              </h1>
              <p className="text-muted-foreground mt-1">
                Welche MI/IB-Kompetenzen werden in Ihrer Jahresplanung abgedeckt?
              </p>
            </div>
            <Button
              onClick={handleExportPdf}
              disabled={downloadingPdf || loading || !stats}
              variant="outline"
            >
              {downloadingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF exportieren
            </Button>
          </div>

          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Schuljahr:</label>
                  <Select value={schuljahr} onValueChange={setSchuljahr}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getSchuljahrListe(2, 2).map((sj) => (
                        <SelectItem key={sj} value={sj}>
                          {sj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Stufe:</label>
                  <Select
                    value={stufeFilter}
                    onValueChange={(v) => setStufeFilter(v as Stufe | "all")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Stufen</SelectItem>
                      {STUFEN.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {teacher?.kanton === "SO" && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    Kanton SO – Anzeige als IB-Codes
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          {stats && !loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Gesamt-Abdeckung
                    </p>
                    <p className="text-3xl font-bold mt-1">{coverageRate}%</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stats.covered} von {stats.total} Kompetenzstufen
                    </p>
                  </div>
                  {(["medien", "informatik", "anwendungskompetenzen"] as MiaBereich[]).map(
                    (b) => {
                      const data = stats.byBereich[b];
                      const pct =
                        data.total > 0
                          ? Math.round((data.covered / data.total) * 100)
                          : 0;
                      return (
                        <div key={b}>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: BEREICH_COLORS[b] }}
                            />
                            {BEREICH_LABELS[b]}
                          </p>
                          <p className="text-3xl font-bold mt-1">{pct}%</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {data.covered} von {data.total} abgedeckt
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hilfe-Text */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Wie funktioniert die Abdeckung?</p>
              <p>
                Eine Kompetenzstufe gilt als <strong>abgedeckt</strong>, wenn
                sie entweder direkt einer Jahresplanungs-Einheit zugewiesen ist
                <em>oder</em> über das verknüpfte MIA-Thema mitkommt. So sehen
                Sie auf einen Blick, wo Lücken sind – besonders relevant, wenn
                MI/IB integrativ in andere Fächer einfliesst.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Results pro Bereich */}
          {!loading && stats && stats.total === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Keine MI/IB-Kompetenzen gefunden</p>
                <p className="text-sm mt-1">
                  Passt der Stufen-Filter? Oder fehlt ein Sync der
                  Kompetenzen?
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && stats && stats.total > 0 && (
            <Accordion
              type="multiple"
              defaultValue={["medien", "informatik", "anwendungskompetenzen"]}
              className="space-y-3"
            >
              {(["medien", "informatik", "anwendungskompetenzen"] as MiaBereich[]).map(
                (bereich) => {
                  const list = grouped[bereich];
                  if (list.length === 0) return null;
                  const data = stats.byBereich[bereich];
                  return (
                    <AccordionItem
                      key={bereich}
                      value={bereich}
                      className="border rounded-lg overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: BEREICH_COLORS[bereich] }}
                          />
                          <span className="font-semibold">
                            {BEREICH_LABELS[bereich]}
                          </span>
                          <Badge variant="secondary" className="ml-auto mr-3">
                            {data.covered}/{data.total} abgedeckt
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2">
                          {list.map((r) => (
                            <CoverageRow key={r.canonicalCode} result={r} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                }
              )}
            </Accordion>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function CoverageRow({ result }: { result: MiaCoverageResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasEinheiten = result.coveringEinheiten.length > 0;

  return (
    <div
      className={`rounded-md border p-3 transition-colors ${
        result.isCovered
          ? "bg-emerald-50/40 border-emerald-200"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {result.isCovered ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-mono text-sm font-medium">
              {result.displayCode}
            </span>
            <span className="text-sm">{result.competencyName}</span>
            {result.isCovered ? (
              <Badge
                variant="outline"
                className="text-xs border-emerald-300 text-emerald-700"
              >
                Abgedeckt
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-gray-500">
                Nicht abgedeckt
              </Badge>
            )}
          </div>
          {result.kompetenzbereich && (
            <p className="text-xs text-muted-foreground mt-1">
              {result.kompetenzbereich}
            </p>
          )}
          {hasEinheiten && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary mt-1 hover:underline"
            >
              {expanded ? "Einheiten verbergen" : `${result.coveringEinheiten.length} abdeckende Einheit${result.coveringEinheiten.length === 1 ? "" : "en"} anzeigen`}
            </button>
          )}
          {expanded && hasEinheiten && (
            <div className="mt-2 space-y-1">
              {result.coveringEinheiten.map((e) => (
                <Link
                  key={e.einheitId}
                  href={`/dashboard/jahresplanung/einheit/${e.einheitId}`}
                  className="flex items-center gap-2 text-xs text-foreground/80 hover:text-primary px-2 py-1.5 rounded hover:bg-white"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: e.fachbereichFarbe || "#6b7280" }}
                  />
                  <span className="font-medium">{e.fachbereichName || e.fachbereichId}</span>
                  <span className="text-muted-foreground">
                    KW {e.zeitraumStart}
                    {e.zeitraumStart !== e.zeitraumEnde
                      ? `–${e.zeitraumEnde}`
                      : ""}
                  </span>
                  <span className="truncate flex-1">{e.titel}</span>
                  {e.linkedViaMiaTheme && (
                    <span title="Über verknüpftes MIA-Thema abgedeckt">
                      <LinkIcon className="h-3 w-3 text-indigo-600" />
                    </span>
                  )}
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
