"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Calendar,
  AlertTriangle,
  Circle,
  Diamond,
  FileDown,
  Loader2,
  List,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import KanbanQuartal from "@/components/jahresplanung/KanbanQuartal";
import {
  getAktuellesSchuljahr,
  getQuartalSchema,
  getSchulwochenFuerSchuljahr,
  formatDatumKurz,
  getMondayOfWeek,
  getFridayOfWeek,
} from "@/lib/data/lp21-data";

// Labels für Q2-Abschnitte
const Q2_ABSCHNITT_LABELS: Record<string, { label: string; beschreibung: string }> = {
  a: { label: "Herbst → Weihnachten", beschreibung: "Herbstferien bis Weihnachtsferien" },
  b: { label: "Weihnachten → Sport", beschreibung: "Weihnachtsferien bis Sportferien" },
};
import type { JahresplanEinheit, JahresplanStatus, SchulferienCustom } from "@/types";

// Status-Farben
const STATUS_COLORS: Record<JahresplanStatus, string> = {
  geplant: "bg-blue-100 text-blue-800",
  durchgefuehrt: "bg-yellow-100 text-yellow-800",
  reflektiert: "bg-green-100 text-green-800",
};

export default function QuartalsansichtPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, userProfile } = useAuth();

  const quartal = parseInt(params.q as string) || 1;
  const schuljahr = searchParams.get("schuljahr") || getAktuellesSchuljahr();
  const abschnitt = searchParams.get("abschnitt") as "a" | "b" | null;

  const [einheiten, setEinheiten] = useState<JahresplanEinheit[]>([]);
  const [customFerien, setCustomFerien] = useState<SchulferienCustom[]>([]);
  const [klassenBezeichnung, setKlassenBezeichnung] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("jahresplanung-view") as "list" | "kanban") || "list";
    }
    return "list";
  });

  const quartalSchema = useMemo(() => getQuartalSchema(), []);
  const quartalInfo = quartalSchema.find((q) => q.quartal === quartal);

  // Schuljahr-Jahre berechnen (für Q2-Abschnitt-Filterung)
  const [startYear, endYear] = useMemo(() => {
    const [s] = schuljahr.split("/").map(Number);
    return [s, s + 1];
  }, [schuljahr]);

  // Header-Titel: Bei Q2 mit Abschnitt speziellen Titel zeigen
  const headerTitle = useMemo(() => {
    if (quartal === 2 && abschnitt && Q2_ABSCHNITT_LABELS[abschnitt]) {
      return Q2_ABSCHNITT_LABELS[abschnitt].label;
    }
    return quartalInfo?.label || `Quartal ${quartal}`;
  }, [quartal, abschnitt, quartalInfo]);

  const headerSubtitle = useMemo(() => {
    if (quartal === 2 && abschnitt && Q2_ABSCHNITT_LABELS[abschnitt]) {
      return `${schuljahr} · ${Q2_ABSCHNITT_LABELS[abschnitt].beschreibung}`;
    }
    return `${schuljahr} · ${quartalInfo?.typischeWochen || ""}`;
  }, [quartal, abschnitt, quartalInfo, schuljahr]);

  // Wochen für dieses Quartal (mit Custom-Ferien wenn vorhanden)
  // Bei Q2 mit abschnitt: nur Wochen aus dem jeweiligen Halbjahr anzeigen
  const quartalWochen = useMemo(() => {
    const alleWochen = getSchulwochenFuerSchuljahr(
      "SO_BeLoSe",
      schuljahr,
      customFerien.length > 0 ? customFerien : undefined
    );
    let wochen = alleWochen.filter((w) => w.quartal === quartal);

    // Q2 mit Abschnitt: nach Jahr filtern
    if (quartal === 2 && abschnitt === "a") {
      wochen = wochen.filter((w) => w.jahr === startYear);
    } else if (quartal === 2 && abschnitt === "b") {
      wochen = wochen.filter((w) => w.jahr === endYear);
    }

    return wochen;
  }, [schuljahr, quartal, customFerien, abschnitt, startYear, endYear]);

  // Einheiten und Custom-Ferien laden
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();

        const [einheitenRes, ferienRes, klassenRes] = await Promise.all([
          fetch(
            `/api/jahresplanung?schuljahr=${encodeURIComponent(schuljahr)}&quartal=${quartal}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `/api/jahresplanung/ferien?schuljahr=${encodeURIComponent(schuljahr)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(`/api/classes`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (einheitenRes.ok) {
          const data = await einheitenRes.json();
          setEinheiten(data.einheiten || []);
        }

        if (ferienRes.ok) {
          const data = await ferienRes.json();
          setCustomFerien(data.ferien || []);
        }

        if (klassenRes.ok) {
          const data = await klassenRes.json();
          const klassen = data.classes || [];
          if (klassen.length > 0) {
            setKlassenBezeichnung(klassen[0].displayName || klassen[0].name || "");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, schuljahr, quartal]);

  // Einheiten filtern (bei Q2-Abschnitt)
  const gefilterteEinheiten = useMemo(() => {
    if (quartal !== 2 || !abschnitt) return einheiten;
    if (abschnitt === "a") {
      // Herbst→Weihnachten: Einheiten die in KW 42-52 starten
      return einheiten.filter((e) => e.zeitraumStart >= 42);
    }
    // Weihnachten→Sport: Einheiten die in KW 1-7 starten (Neujahrwochen)
    return einheiten.filter((e) => e.zeitraumStart < 42);
  }, [einheiten, quartal, abschnitt]);

  // Einheiten pro Woche gruppieren
  const einheitenProWoche = useMemo(() => {
    const map = new Map<number, JahresplanEinheit[]>();

    gefilterteEinheiten.forEach((einheit) => {
      for (let kw = einheit.zeitraumStart; kw <= einheit.zeitraumEnde; kw++) {
        const current = map.get(kw) || [];
        current.push(einheit);
        map.set(kw, current);
      }
    });

    return map;
  }, [gefilterteEinheiten]);

  // Beurteilungen pro Woche mit Details (für Tooltips)
  const beurteilungenProWoche = useMemo(() => {
    const map = new Map<number, {
      formativ: number;
      summativ: number;
      details: Array<{ typ: string; titel: string; notiz?: string }>;
    }>();

    gefilterteEinheiten.forEach((einheit) => {
      // Neue beurteilungen-Array nutzen
      if (einheit.beurteilungen && einheit.beurteilungen.length > 0) {
        for (const b of einheit.beurteilungen) {
          const current = map.get(b.kalenderwoche) || { formativ: 0, summativ: 0, details: [] };
          if (b.typ === "formativ") current.formativ++;
          else if (b.typ === "summativ") current.summativ++;
          current.details.push({
            typ: b.typ === "formativ" ? "Formativ" : "Summativ",
            titel: einheit.titel,
            notiz: b.notiz,
          });
          map.set(b.kalenderwoche, current);
        }
      } else if (einheit.beurteilungstyp && einheit.beurteilungstyp !== "keine") {
        // Legacy-Fallback
        for (let kw = einheit.zeitraumStart; kw <= einheit.zeitraumEnde; kw++) {
          const current = map.get(kw) || { formativ: 0, summativ: 0, details: [] };
          if (einheit.beurteilungstyp === "formativ") current.formativ++;
          else if (einheit.beurteilungstyp === "summativ") current.summativ++;
          current.details.push({
            typ: einheit.beurteilungstyp === "formativ" ? "Formativ" : "Summativ",
            titel: einheit.titel,
            notiz: einheit.beurteilungsNotiz,
          });
          map.set(kw, current);
        }
      }
    });

    return map;
  }, [gefilterteEinheiten]);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { QuartalsplanungPDF } = await import("@/components/JahresplanungPDF");

      const blob = await pdf(
        <QuartalsplanungPDF
          schuljahr={schuljahr}
          quartal={quartal}
          wochen={quartalWochen}
          einheiten={gefilterteEinheiten}
          lehrerName={userProfile && "name" in userProfile ? userProfile.name : undefined}
          klasse={klassenBezeichnung || (userProfile && "stufe" in userProfile ? userProfile.stufe : undefined)}
        />
      ).toBlob();

      const abschnittSuffix = abschnitt ? abschnitt : "";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quartalsplanung-Q${quartal}${abschnittSuffix}-${schuljahr.replace("/", "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Fehler beim Erstellen des PDFs. Bitte versuchen Sie es erneut.");
    } finally {
      setExporting(false);
    }
  };

  // View toggle
  const toggleView = (mode: "list" | "kanban") => {
    setViewMode(mode);
    localStorage.setItem("jahresplanung-view", mode);
  };

  // Einheit update (für Drag & Drop Reorder)
  const handleEinheitUpdate = async (id: string, data: Record<string, unknown>) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`/api/jahresplanung/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Error updating einheit:", error);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/jahresplanung?schuljahr=${schuljahr}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">
                  {headerTitle}
                </h1>
                <p className="text-gray-600">
                  {headerSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => toggleView("list")}
                  title="Listenansicht"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => toggleView("kanban")}
                  title="Kanban-Ansicht"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={exportPDF}
                disabled={exporting || loading}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                PDF
              </Button>
              <Link
                href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}&quartal=${quartal}`}
              >
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Einheit
                </Button>
              </Link>
            </div>
          </div>

          {/* Legende (nur in Listenansicht) */}
          {viewMode === "list" && (
            <Card>
              <CardContent className="py-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 fill-blue-500 text-blue-500" />
                    <span>Formative Beurteilung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Diamond className="h-4 w-4 fill-orange-500 text-orange-500" />
                    <span>Summative Beurteilung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <span>Ferienwochen</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : viewMode === "kanban" ? (
            /* Kanban-Ansicht */
            gefilterteEinheiten.length === 0 ? (
              <Card className="border-dashed mt-4">
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500 mb-4">
                    Noch keine Einheiten in diesem Quartal geplant
                  </p>
                  <Link
                    href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}&quartal=${quartal}`}
                  >
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Erste Einheit erstellen
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <KanbanQuartal
                einheiten={gefilterteEinheiten}
                schuljahr={schuljahr}
                quartal={quartal}
                onEinheitUpdate={handleEinheitUpdate}
              />
            )
          ) : (
            /* Listenansicht */
            <>
              <div className="space-y-2">
                {quartalWochen.map((woche) => {
                  const wochenEinheiten = einheitenProWoche.get(woche.kw) || [];
                  const beurteilungen = beurteilungenProWoche.get(woche.kw);
                  const hasWarning = beurteilungen && beurteilungen.summativ >= 2;

                  const montag = getMondayOfWeek(woche.kw, woche.jahr);
                  const freitag = getFridayOfWeek(woche.kw, woche.jahr);

                  return (
                    <Link
                      key={`${woche.kw}-${woche.jahr}`}
                      href={`/dashboard/jahresplanung/woche/${woche.kw}?schuljahr=${schuljahr}&jahr=${woche.jahr}`}
                    >
                      <Card
                        className={`hover:border-blue-500 transition-colors cursor-pointer ${
                          woche.istFerien ? "bg-gray-50 opacity-75" : ""
                        }`}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center gap-4">
                            {/* Kalenderwoche */}
                            <div className="w-16 text-center flex-shrink-0">
                              <p className="text-lg font-bold text-blue-600">
                                KW {woche.kw}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDatumKurz(montag)}–{formatDatumKurz(freitag)}
                              </p>
                            </div>

                            {/* Trennlinie */}
                            <div className="w-px h-12 bg-gray-200" />

                            {/* Inhalt */}
                            <div className="flex-1 min-w-0">
                              {woche.istFerien ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  <span>{woche.ferienName || "Ferien"}</span>
                                </div>
                              ) : wochenEinheiten.length === 0 ? (
                                <p className="text-gray-400 italic">
                                  Keine Einheiten geplant
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {wochenEinheiten.map((einheit) => {
                                    // Kompetenzbereich oder Fachbereich anzeigen
                                    const kompetenzLabel =
                                      einheit.kompetenzenNamen && einheit.kompetenzenNamen.length > 0
                                        ? einheit.kompetenzenNamen[0]
                                        : einheit.fachbereichName || einheit.fachbereichId;

                                    return (
                                      <div
                                        key={einheit.id}
                                        className="rounded-md border px-2.5 py-1 max-w-[250px]"
                                        style={{
                                          backgroundColor: `${einheit.fachbereichFarbe || "#6b7280"}10`,
                                          borderColor: `${einheit.fachbereichFarbe || "#6b7280"}40`,
                                        }}
                                      >
                                        <p
                                          className="text-[10px] leading-tight truncate"
                                          style={{ color: einheit.fachbereichFarbe || "#6b7280" }}
                                        >
                                          {kompetenzLabel}
                                        </p>
                                        <p className="text-xs font-medium truncate text-gray-800">
                                          {einheit.titel}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Beurteilungs-Marker mit Tooltip */}
                            {beurteilungen && !woche.istFerien && (
                              <div className="relative group/marker flex items-center gap-2 flex-shrink-0">
                                {beurteilungen.formativ > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Circle className="h-4 w-4 fill-blue-500 text-blue-500" />
                                    {beurteilungen.formativ > 1 && (
                                      <span className="text-xs text-blue-600">
                                        {beurteilungen.formativ}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {beurteilungen.summativ > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Diamond className="h-4 w-4 fill-orange-500 text-orange-500" />
                                    {beurteilungen.summativ > 1 && (
                                      <span className="text-xs text-orange-600">
                                        {beurteilungen.summativ}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {/* Tooltip */}
                                <div className="hidden group-hover/marker:block absolute right-0 top-full mt-1 z-50 w-64 bg-white border rounded-lg shadow-lg p-3 text-sm">
                                  <p className="font-medium mb-1.5">Beurteilungen KW {woche.kw}</p>
                                  <div className="space-y-1.5">
                                    {beurteilungen.details.map((d, i) => (
                                      <div key={i} className="flex items-start gap-2">
                                        {d.typ === "Formativ" ? (
                                          <Circle className="h-3 w-3 fill-blue-500 text-blue-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                          <Diamond className="h-3 w-3 fill-orange-500 text-orange-500 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-xs">
                                            <span className="font-medium">{d.typ}</span>
                                            {" – "}{d.titel}
                                          </p>
                                          {d.notiz && (
                                            <p className="text-xs text-gray-500 truncate">{d.notiz}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Warnung */}
                            {hasWarning && (
                              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>

              {/* Leere State */}
              {gefilterteEinheiten.length === 0 && (
                <Card className="border-dashed mt-4">
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-500 mb-4">
                      Noch keine Einheiten in diesem Quartal geplant
                    </p>
                    <Link
                      href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}&quartal=${quartal}`}
                    >
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Erste Einheit erstellen
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
