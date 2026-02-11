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
} from "lucide-react";
import Link from "next/link";
import {
  getAktuellesSchuljahr,
  getQuartalSchema,
  getSchulwochenFuerSchuljahr,
  formatDatumKurz,
  getMondayOfWeek,
  getFridayOfWeek,
} from "@/lib/data/lp21-data";
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
  const { user } = useAuth();

  const quartal = parseInt(params.q as string) || 1;
  const schuljahr = searchParams.get("schuljahr") || getAktuellesSchuljahr();

  const [einheiten, setEinheiten] = useState<JahresplanEinheit[]>([]);
  const [customFerien, setCustomFerien] = useState<SchulferienCustom[]>([]);
  const [loading, setLoading] = useState(true);

  const quartalSchema = useMemo(() => getQuartalSchema(), []);
  const quartalInfo = quartalSchema.find((q) => q.quartal === quartal);

  // Wochen für dieses Quartal (mit Custom-Ferien wenn vorhanden)
  const quartalWochen = useMemo(() => {
    const alleWochen = getSchulwochenFuerSchuljahr(
      "SO_BeLoSe",
      schuljahr,
      customFerien.length > 0 ? customFerien : undefined
    );
    return alleWochen.filter((w) => w.quartal === quartal);
  }, [schuljahr, quartal, customFerien]);

  // Einheiten und Custom-Ferien laden
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();

        const [einheitenRes, ferienRes] = await Promise.all([
          fetch(
            `/api/jahresplanung?schuljahr=${encodeURIComponent(schuljahr)}&quartal=${quartal}`,
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
  }, [user, schuljahr, quartal]);

  // Einheiten pro Woche gruppieren
  const einheitenProWoche = useMemo(() => {
    const map = new Map<number, JahresplanEinheit[]>();

    einheiten.forEach((einheit) => {
      for (let kw = einheit.zeitraumStart; kw <= einheit.zeitraumEnde; kw++) {
        const current = map.get(kw) || [];
        current.push(einheit);
        map.set(kw, current);
      }
    });

    return map;
  }, [einheiten]);

  // Beurteilungen pro Woche zählen
  const beurteilungenProWoche = useMemo(() => {
    const map = new Map<number, { formativ: number; summativ: number }>();

    einheiten.forEach((einheit) => {
      if (einheit.beurteilungstyp === "keine") return;

      for (let kw = einheit.zeitraumStart; kw <= einheit.zeitraumEnde; kw++) {
        const current = map.get(kw) || { formativ: 0, summativ: 0 };
        if (einheit.beurteilungstyp === "formativ") {
          current.formativ++;
        } else if (einheit.beurteilungstyp === "summativ") {
          current.summativ++;
        }
        map.set(kw, current);
      }
    });

    return map;
  }, [einheiten]);

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
                  {quartalInfo?.label || `Quartal ${quartal}`}
                </h1>
                <p className="text-gray-600">
                  {schuljahr} · {quartalInfo?.typischeWochen}
                </p>
              </div>
            </div>

            <Link
              href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}&quartal=${quartal}`}
            >
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Einheit
              </Button>
            </Link>
          </div>

          {/* Legende */}
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

          {/* Wochenübersicht */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
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
                                {wochenEinheiten.map((einheit) => (
                                  <Badge
                                    key={einheit.id}
                                    style={{
                                      backgroundColor: `${einheit.fachbereichFarbe || "#6b7280"}20`,
                                      color: einheit.fachbereichFarbe || "#6b7280",
                                      borderColor: einheit.fachbereichFarbe || "#6b7280",
                                    }}
                                    variant="outline"
                                    className="max-w-[200px] truncate"
                                  >
                                    {einheit.titel}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Beurteilungs-Marker */}
                          {beurteilungen && !woche.istFerien && (
                            <div className="flex items-center gap-2 flex-shrink-0">
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
          )}

          {/* Leere State */}
          {!loading && einheiten.length === 0 && (
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
