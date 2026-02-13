"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  Copy,
  ChevronRight,
  AlertTriangle,
  Users,
  BarChart3,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import {
  getAktuellesSchuljahr,
  getSchuljahrListe,
  getQuartalSchema,
  getSchulwochenFuerSchuljahr,
  getAlleFachbereiche,
} from "@/lib/data/lp21-data";
import type { JahresplanEinheit, SchulferienCustom } from "@/types";

// Typ für Quartal-Daten
interface QuartalData {
  quartal: number;
  label: string;
  einheiten: JahresplanEinheit[];
  wochenCount: number;
  ferienWochenCount: number;
}

export default function JahresplanungPage() {
  const { user } = useAuth();
  const [schuljahr, setSchuljahr] = useState(getAktuellesSchuljahr());
  const [einheiten, setEinheiten] = useState<JahresplanEinheit[]>([]);
  const [sharedEinheiten, setSharedEinheiten] = useState<JahresplanEinheit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromYear, setCopyFromYear] = useState("");
  const [copying, setCopying] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [customFerien, setCustomFerien] = useState<SchulferienCustom[]>([]);

  const schuljahrListe = useMemo(() => getSchuljahrListe(4, 1), []);
  const copySchuljahrListe = useMemo(() => getSchuljahrListe(1, 6), []);
  const quartalSchema = useMemo(() => getQuartalSchema(), []);
  const fachbereiche = useMemo(() => getAlleFachbereiche(), []);

  // Wochen für das Schuljahr berechnen (mit Custom-Ferien wenn vorhanden)
  const schulwochen = useMemo(() => {
    return getSchulwochenFuerSchuljahr(
      "SO_BeLoSe",
      schuljahr,
      customFerien.length > 0 ? customFerien : undefined
    );
  }, [schuljahr, customFerien]);

  // Einheiten und Custom-Ferien laden
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();

        const [einheitenRes, ferienRes] = await Promise.all([
          fetch(
            `/api/jahresplanung?schuljahr=${encodeURIComponent(schuljahr)}&includeShared=true`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `/api/jahresplanung/ferien?schuljahr=${encodeURIComponent(schuljahr)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

        if (einheitenRes.ok) {
          const data = await einheitenRes.json();
          setEinheiten(data.einheiten || []);
          setSharedEinheiten(data.sharedEinheiten || []);
        }

        if (ferienRes.ok) {
          const data = await ferienRes.json();
          setCustomFerien(data.ferien || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, schuljahr]);

  // Quartale mit Einheiten gruppieren
  const quartaleData: QuartalData[] = useMemo(() => {
    return quartalSchema.map((qs) => {
      const quartalEinheiten = einheiten.filter((e) => e.quartal === qs.quartal);
      const quartalWochen = schulwochen.filter((w) => w.quartal === qs.quartal);

      return {
        quartal: qs.quartal,
        label: qs.label,
        einheiten: quartalEinheiten,
        wochenCount: quartalWochen.filter((w) => !w.istFerien).length,
        ferienWochenCount: quartalWochen.filter((w) => w.istFerien).length,
      };
    });
  }, [quartalSchema, einheiten, schulwochen]);

  // Fachbereich-Verteilung berechnen
  const fachbereichVerteilung = useMemo(() => {
    const verteilung = new Map<string, number>();
    einheiten.forEach((e) => {
      const current = verteilung.get(e.fachbereichId) || 0;
      verteilung.set(e.fachbereichId, current + 1);
    });

    return Array.from(verteilung.entries())
      .map(([id, count]) => {
        const fb = fachbereiche.find((f) => f.id === id);
        return {
          id,
          name: fb?.name || id,
          farbe: fb?.farbe || "#6b7280",
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [einheiten, fachbereiche]);

  // Jahresplan kopieren
  const handleCopyJahresplan = async () => {
    if (!user || !copyFromYear) return;

    try {
      setCopying(true);
      const token = await user.getIdToken();
      const response = await fetch("/api/jahresplanung/kopieren", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vonSchuljahr: copyFromYear,
          nachSchuljahr: schuljahr,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.count} Einheiten wurden kopiert!`);
        setShowCopyDialog(false);
        // Neu laden
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error("Error copying jahresplan:", error);
      alert("Fehler beim Kopieren des Jahresplans");
    } finally {
      setCopying(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-600" />
                Jahresplanung
              </h1>
              <p className="text-gray-600 mt-1">
                Planen Sie Ihren Unterricht über alle Fachbereiche
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Schuljahr-Auswahl */}
              <Select value={schuljahr} onValueChange={setSchuljahr}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schuljahrListe.map((sj) => (
                    <SelectItem key={sj} value={sj}>
                      {sj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Ferien verwalten */}
              <Link href={`/dashboard/jahresplanung/ferien?schuljahr=${schuljahr}`}>
                <Button variant="outline">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Ferien
                </Button>
              </Link>

              {/* Vorjahr kopieren */}
              <Button
                variant="outline"
                onClick={() => setShowCopyDialog(true)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Schuljahr kopieren
              </Button>

              {/* Neue Einheit */}
              <Link href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Einheit
                </Button>
              </Link>
            </div>
          </div>

          {/* Statistik-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Einheiten</p>
                    <p className="text-2xl font-bold">{einheiten.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Fachbereiche</p>
                    <p className="text-2xl font-bold">{fachbereichVerteilung.length}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Schulwochen</p>
                    <p className="text-2xl font-bold">
                      {schulwochen.filter((w) => !w.istFerien).length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Von Kolleg:innen</p>
                    <p className="text-2xl font-bold">{sharedEinheiten.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
                {sharedEinheiten.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-1"
                    onClick={() => setShowShared(!showShared)}
                  >
                    {showShared ? "Ausblenden" : "Anzeigen"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fachbereich-Verteilung */}
          {fachbereichVerteilung.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                  Fachbereich-Verteilung
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {fachbereichVerteilung.map((fb) => (
                    <Badge
                      key={fb.id}
                      style={{
                        backgroundColor: `${fb.farbe}20`,
                        color: fb.farbe,
                        borderColor: fb.farbe,
                      }}
                      variant="outline"
                    >
                      {fb.name}: {fb.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quartale */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quartaleData.map((quartal) => (
                <Link
                  key={quartal.quartal}
                  href={`/dashboard/jahresplanung/quartal/${quartal.quartal}?schuljahr=${schuljahr}`}
                >
                  <Card className="hover:border-blue-500 hover:shadow-md transition-all cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{quartal.label}</span>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        {quartal.wochenCount} Schulwochen
                        {quartal.ferienWochenCount > 0 && (
                          <span className="text-gray-400">
                            {" "}
                            · {quartal.ferienWochenCount} Ferienwochen
                          </span>
                        )}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {quartal.einheiten.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">
                          Noch keine Einheiten geplant
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {quartal.einheiten.slice(0, 4).map((einheit) => (
                            <div
                              key={einheit.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    einheit.fachbereichFarbe || "#6b7280",
                                }}
                              />
                              <span className="truncate">{einheit.titel}</span>
                            </div>
                          ))}
                          {quartal.einheiten.length > 4 && (
                            <p className="text-xs text-gray-400">
                              +{quartal.einheiten.length - 4} weitere
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Leere State */}
          {!loading && einheiten.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Noch keine Planung vorhanden
                </h3>
                <p className="text-gray-500 mb-4">
                  Beginnen Sie mit Ihrer Jahresplanung für {schuljahr}
                </p>
                <div className="flex justify-center gap-3">
                  <Link href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Erste Einheit erstellen
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setShowCopyDialog(true)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Schuljahr kopieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Geteilte Einheiten */}
          {showShared && sharedEinheiten.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Planungen von Kolleg:innen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sharedEinheiten.map((einheit) => (
                    <div
                      key={einheit.id}
                      className="flex items-center gap-3 p-2 rounded bg-gray-50"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: einheit.fachbereichFarbe || "#6b7280",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{einheit.titel}</p>
                        <p className="text-sm text-gray-500">
                          {einheit.fachbereichName} · KW {einheit.zeitraumStart}–
                          {einheit.zeitraumEnde}
                        </p>
                      </div>
                      <Badge variant="outline">Q{einheit.quartal}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kopieren-Dialog */}
        <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Jahresplan kopieren</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Kopieren Sie alle Einheiten aus einem anderen Schuljahr nach{" "}
                <strong>{schuljahr}</strong>.
              </p>

              {einheiten.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Es existieren bereits {einheiten.length} Einheiten für{" "}
                    {schuljahr}. Die neuen Einheiten werden hinzugefügt.
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Von Schuljahr</label>
                <Select value={copyFromYear} onValueChange={setCopyFromYear}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Schuljahr wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {copySchuljahrListe
                      .filter((sj) => sj !== schuljahr)
                      .map((sj) => (
                        <SelectItem key={sj} value={sj}>
                          {sj}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCopyDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCopyJahresplan}
                  disabled={!copyFromYear || copying}
                >
                  {copying ? "Kopiere..." : "Kopieren"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
