"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Circle,
  Diamond,
  BookOpen,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import {
  getAktuellesSchuljahr,
  getMondayOfWeek,
  getFridayOfWeek,
  istFerienWoche,
  istFerienWocheCustom,
} from "@/lib/data/lp21-data";
import type { JahresplanEinheit, JahresplanStatus, SchulferienCustom, TeamMember } from "@/types";

// Status-Konfiguration
const STATUS_CONFIG: Record<
  JahresplanStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  geplant: {
    label: "Geplant",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: <Clock className="h-4 w-4" />,
  },
  durchgefuehrt: {
    label: "Durchgeführt",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  reflektiert: {
    label: "Reflektiert",
    color: "bg-green-100 text-green-800 border-green-300",
    icon: <MessageSquare className="h-4 w-4" />,
  },
};

export default function WochenansichtPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, userProfile } = useAuth();

  const kw = parseInt(params.kw as string) || 1;
  const schuljahr = searchParams.get("schuljahr") || getAktuellesSchuljahr();
  const jahr = parseInt(searchParams.get("jahr") || new Date().getFullYear().toString());
  const teamId = searchParams.get("teamId") || "";
  const teamParam = teamId ? `&teamId=${teamId}` : "";

  const [einheiten, setEinheiten] = useState<JahresplanEinheit[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [customFerien, setCustomFerien] = useState<SchulferienCustom[]>([]);
  const [klassenBezeichnung, setKlassenBezeichnung] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Wocheninformationen
  const montag = useMemo(() => getMondayOfWeek(kw, jahr), [kw, jahr]);
  const freitag = useMemo(() => getFridayOfWeek(kw, jahr), [kw, jahr]);
  const ferienInfo = useMemo(() => {
    // Custom-Ferien haben Priorität
    if (customFerien.length > 0) {
      return istFerienWocheCustom(customFerien, kw, jahr);
    }
    return istFerienWoche("SO_BeLoSe", schuljahr, kw, jahr);
  }, [schuljahr, kw, jahr, customFerien]);

  // Einheiten und Custom-Ferien laden
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();

        const [einheitenRes, ferienRes, klassenRes] = await Promise.all([
          fetch(
            `/api/jahresplanung?schuljahr=${encodeURIComponent(schuljahr)}${teamParam}`,
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
          // Nur Einheiten für diese Woche filtern
          const wochenEinheiten = (data.einheiten || []).filter(
            (e: JahresplanEinheit) =>
              e.zeitraumStart <= kw && e.zeitraumEnde >= kw
          );
          setEinheiten(wochenEinheiten);
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

        // Team-Mitglieder laden (für Namens-Anzeige pro Einheit)
        if (teamId) {
          const teamRes = await fetch(`/api/planungsteams/${teamId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (teamRes.ok) {
            const data = await teamRes.json();
            setTeamMembers(data.team?.members || []);
          }
        } else {
          setTeamMembers([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, schuljahr, kw, teamId, teamParam]);

  // Status ändern
  const handleStatusChange = async (einheitId: string, newStatus: JahresplanStatus) => {
    if (!user) return;

    try {
      setSaving(einheitId);
      const token = await user.getIdToken();
      await fetch(`/api/jahresplanung/${einheitId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      // Lokal aktualisieren
      setEinheiten((prev) =>
        prev.map((e) => (e.id === einheitId ? { ...e, status: newStatus } : e))
      );
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setSaving(null);
    }
  };

  // Notizen speichern
  const handleNotizChange = async (einheitId: string, notizen: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      await fetch(`/api/jahresplanung/${einheitId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notizen }),
      });

      // Lokal aktualisieren
      setEinheiten((prev) =>
        prev.map((e) => (e.id === einheitId ? { ...e, notizen } : e))
      );
    } catch (error) {
      console.error("Error saving notizen:", error);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("de-CH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // Nachbar-Wochen berechnen
  const prevWeek = useMemo(() => {
    if (kw === 1) return { kw: 52, jahr: jahr - 1 };
    return { kw: kw - 1, jahr };
  }, [kw, jahr]);

  const nextWeek = useMemo(() => {
    if (kw === 52) return { kw: 1, jahr: jahr + 1 };
    return { kw: kw + 1, jahr };
  }, [kw, jahr]);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { WochenplanungPDF } = await import("@/components/JahresplanungPDF");

      const blob = await pdf(
        <WochenplanungPDF
          schuljahr={schuljahr}
          kw={kw}
          jahr={jahr}
          einheiten={einheiten}
          istFerien={ferienInfo.istFerien}
          ferienName={ferienInfo.ferienName}
          lehrerName={userProfile && "name" in userProfile ? userProfile.name : undefined}
          klasse={klassenBezeichnung || (userProfile && "stufe" in userProfile ? userProfile.stufe : undefined)}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Wochenplanung-KW${kw}-${schuljahr.replace("/", "-")}.pdf`;
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

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/jahresplanung/quartal/${kw >= 33 && kw <= 41 ? 1 : kw >= 42 || kw <= 7 ? 2 : kw <= 14 ? 3 : 4}?schuljahr=${schuljahr}${teamParam}`}
              >
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/jahresplanung/woche/${prevWeek.kw}?schuljahr=${schuljahr}&jahr=${prevWeek.jahr}${teamParam}`}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  </Link>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    Kalenderwoche {kw}
                  </h1>
                  <Link
                    href={`/dashboard/jahresplanung/woche/${nextWeek.kw}?schuljahr=${schuljahr}&jahr=${nextWeek.jahr}${teamParam}`}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
                <p className="text-gray-600">
                  {formatDate(montag)} – {formatDate(freitag)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
              {!ferienInfo.istFerien && (
                <Link
                  href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}&kw=${kw}${teamParam}`}
                >
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Einheit hinzufügen
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Ferienhinweis */}
          {ferienInfo.istFerien && (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700">
                  {ferienInfo.ferienName || "Ferienwochen"}
                </h3>
                <p className="text-gray-500 mt-1">
                  In dieser Woche findet kein regulärer Unterricht statt
                </p>
              </CardContent>
            </Card>
          )}

          {/* Einheiten */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !ferienInfo.istFerien && einheiten.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Keine Einheiten geplant
                </h3>
                <p className="text-gray-500 mb-4">
                  Fügen Sie Unterrichtseinheiten für diese Woche hinzu
                </p>
                <Link
                  href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}&kw=${kw}${teamParam}`}
                >
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Einheit erstellen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {einheiten.map((einheit) => (
                <Card key={einheit.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor:
                              einheit.fachbereichFarbe || "#6b7280",
                          }}
                        />
                        <div>
                          <CardTitle className="text-lg">
                            {einheit.titel}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            {einheit.fachbereichName} · KW {einheit.zeitraumStart}
                            –{einheit.zeitraumEnde}
                            {teamId &&
                              (() => {
                                const member = teamMembers.find(
                                  (m) => m.userId === einheit.teacherId
                                );
                                return member ? ` · ${member.name}` : "";
                              })()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Beurteilungs-Marker für diese KW */}
                        {(einheit.beurteilungen || [])
                          .filter(
                            (b) =>
                              kw >= b.kalenderwoche &&
                              kw <= (b.kalenderwocheEnde ?? b.kalenderwoche)
                          )
                          .map((b, bIdx) => (
                            <Badge key={bIdx} variant="outline" className="flex items-center gap-1">
                              {b.typ === "formativ" ? (
                                <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
                              ) : (
                                <Diamond className="h-3 w-3 fill-orange-500 text-orange-500" />
                              )}
                              {b.typ === "formativ" ? "Formativ" : "Summativ"}
                            </Badge>
                          ))}

                        {/* Status-Buttons */}
                        <div className="flex rounded-lg overflow-hidden border">
                          {(
                            Object.keys(STATUS_CONFIG) as JahresplanStatus[]
                          ).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(einheit.id, status)}
                              disabled={saving === einheit.id}
                              className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                                einheit.status === status
                                  ? STATUS_CONFIG[status].color
                                  : "bg-white hover:bg-gray-50"
                              }`}
                            >
                              {STATUS_CONFIG[status].icon}
                              <span className="hidden sm:inline">
                                {STATUS_CONFIG[status].label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Lernziele */}
                    {einheit.lernziele && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          Lernziele
                        </h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {einheit.lernziele}
                        </p>
                      </div>
                    )}

                    {/* Kompetenzen */}
                    {einheit.kompetenzenNamen &&
                      einheit.kompetenzenNamen.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">
                            LP21-Kompetenzen
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {einheit.kompetenzenNamen.map((name, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Materialien */}
                    {einheit.materialien && einheit.materialien.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          Materialien
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {einheit.materialien.map((material, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1 text-sm text-gray-600"
                            >
                              {material.startsWith("http") ? (
                                <a
                                  href={material}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Link {i + 1}
                                </a>
                              ) : (
                                <>
                                  <FileText className="h-3 w-3" />
                                  {material}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verknüpfte Schul-Dateien */}
                    {einheit.linkedFileNames && einheit.linkedFileNames.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5" />
                          Verknüpfte Dateien
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {einheit.linkedFileNames.map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reflexionsnotizen */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Reflexion / Notizen
                      </h4>
                      <Textarea
                        placeholder="Notizen zur Durchführung, Reflexion..."
                        value={einheit.notizen || ""}
                        onChange={(e) => {
                          // Lokal aktualisieren
                          setEinheiten((prev) =>
                            prev.map((ein) =>
                              ein.id === einheit.id
                                ? { ...ein, notizen: e.target.value }
                                : ein
                            )
                          );
                        }}
                        onBlur={(e) => handleNotizChange(einheit.id, e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>

                    {/* Bearbeiten-Link */}
                    <div className="flex justify-end">
                      <Link
                        href={`/dashboard/jahresplanung/einheit/${einheit.id}?schuljahr=${schuljahr}${teamParam}`}
                      >
                        <Button variant="outline" size="sm">
                          Bearbeiten
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
