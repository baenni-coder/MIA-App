"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Regelstandard, Teacher } from "@/types";
import {
  REGELSTANDARDS,
  HANDLUNGSFELDER,
  getRegelstandardsByLPCode,
} from "@/lib/data/regelstandards";
import {
  GraduationCap,
  Search,
  BookOpen,
  ExternalLink,
  MapPin,
} from "lucide-react";
import Link from "next/link";

// Farben für Handlungsfelder
const HANDLUNGSFELD_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
  2: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  3: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" },
  4: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  5: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  6: { bg: "bg-pink-50", text: "text-pink-800", border: "border-pink-200" },
  7: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
};

// Farben für Zyklen
const ZYKLUS_COLORS: Record<string, string> = {
  "Zyklus 1": "bg-amber-100 text-amber-800",
  "Zyklus 2": "bg-sky-100 text-sky-800",
  "Zyklus 3": "bg-violet-100 text-violet-800",
};

// Farben für Dimensionen
const DIMENSION_COLORS: Record<string, { bg: string; text: string }> = {
  "Dimension Zugang: Zugang finden, Handhaben, Anwenden": { bg: "bg-emerald-100", text: "text-emerald-800" },
  "Dimension Verständnis: Verstehen, Einordnen, Orientieren": { bg: "bg-indigo-100", text: "text-indigo-800" },
};

function RegelstandardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAuthToken } = useAuth();
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedZyklus, setSelectedZyklus] = useState<string | null>(null);
  const [selectedRegelstandard, setSelectedRegelstandard] = useState<Regelstandard | null>(null);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Lade Teacher-Daten um Kanton zu prüfen
  useEffect(() => {
    const loadTeacherData = async () => {
      if (!user) return;

      try {
        const token = await getAuthToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/teachers?userId=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setTeacherData(data);
        }
      } catch (err) {
        console.error("Error loading teacher data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTeacherData();
  }, [user, getAuthToken]);

  // Prüfe ob User aus Solothurn ist
  const isSolothurn = teacherData?.kanton === "SO";

  // Auto-open Regelstandard from URL search param
  useEffect(() => {
    if (!loading && isSolothurn && searchTerm && !hasAutoOpened) {
      // If search term looks like an RS code, try to open that specific one
      const rsCodeMatch = searchTerm.match(/^RS\.\d+\.\d+\.[a-z]$/i);
      if (rsCodeMatch) {
        const matchingRS = REGELSTANDARDS.find(
          (rs) => rs.rsCode.toLowerCase() === searchTerm.toLowerCase()
        );
        if (matchingRS) {
          setSelectedRegelstandard(matchingRS);
          setHasAutoOpened(true);
        }
      }
    }
  }, [loading, isSolothurn, searchTerm, hasAutoOpened]);

  // Filtere Regelstandards
  const filteredRegelstandards = REGELSTANDARDS.filter((rs) => {
    // Suchfilter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !rs.rsCode.toLowerCase().includes(search) &&
        !rs.kompetenz.toLowerCase().includes(search) &&
        !rs.kompetenzstufe.toLowerCase().includes(search) &&
        !rs.handlungsfeld.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    // Zyklus-Filter
    if (selectedZyklus && rs.zyklus !== selectedZyklus) {
      return false;
    }

    return true;
  });

  // Gruppiere nach Handlungsfeld
  const gruppiertNachHandlungsfeld = filteredRegelstandards.reduce(
    (acc, rs) => {
      const key = rs.handlungsfeldNummer;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(rs);
      return acc;
    },
    {} as Record<number, Regelstandard[]>
  );

  // Statistiken
  const totalCount = filteredRegelstandards.length;

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Wird geladen...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // Wenn User nicht aus Solothurn ist, zeige Hinweis
  if (!isSolothurn) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold">Regelstandards</h1>
              </div>
            </div>

            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <MapPin className="h-5 w-5 text-amber-600" />
                  Kantonsspezifische Inhalte
                </CardTitle>
              </CardHeader>
              <CardContent className="text-amber-700">
                <p className="mb-3">
                  Die Regelstandards sind spezifisch für den <strong>Kanton Solothurn</strong>.
                  Diese Seite ist nur für Lehrpersonen verfügbar, die im Kanton Solothurn unterrichten.
                </p>
                <p className="mb-3">
                  Ihr aktueller Unterrichtskanton:{" "}
                  <strong>{teacherData?.kanton || "Nicht angegeben"}</strong>
                </p>
                <p>
                  Sie können Ihren Unterrichtskanton in Ihrem{" "}
                  <Link href="/dashboard" className="text-primary underline">
                    Profil
                  </Link>{" "}
                  ändern.
                </p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <GraduationCap className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Regelstandards Solothurn</h1>
                <p className="text-muted-foreground">
                  Kompetenzen für Medien, Informatik und Anwendungen
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              Kanton Solothurn
            </Badge>
          </div>

          {/* Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen nach RS-Code, Kompetenz oder Beschreibung..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={selectedZyklus === null ? "default" : "outline"}
                className="cursor-pointer px-3 py-1"
                onClick={() => setSelectedZyklus(null)}
              >
                Alle
              </Badge>
              {["Zyklus 1", "Zyklus 2", "Zyklus 3"].map((z) => (
                <Badge
                  key={z}
                  variant={selectedZyklus === z ? "default" : "outline"}
                  className={`cursor-pointer px-3 py-1 ${
                    selectedZyklus === z ? "" : ZYKLUS_COLORS[z]
                  }`}
                  onClick={() => setSelectedZyklus(selectedZyklus === z ? null : z)}
                >
                  {z}
                </Badge>
              ))}
            </div>
          </div>

          {/* Statistik */}
          <div className="mb-6 text-sm text-muted-foreground">
            {totalCount} Regelstandard{totalCount !== 1 ? "s" : ""} gefunden
          </div>

          {/* Accordion nach Handlungsfeld */}
          <Accordion
            type="multiple"
            defaultValue={HANDLUNGSFELDER.map((h) => `hf-${h.nummer}`)}
            className="space-y-4"
          >
            {HANDLUNGSFELDER.map((hf) => {
              const regelstandards = gruppiertNachHandlungsfeld[hf.nummer] || [];
              if (regelstandards.length === 0) return null;

              const colors = HANDLUNGSFELD_COLORS[hf.nummer];

              return (
                <AccordionItem
                  key={hf.nummer}
                  value={`hf-${hf.nummer}`}
                  className={`border rounded-lg ${colors.border}`}
                >
                  <AccordionTrigger
                    className={`px-4 py-3 hover:no-underline ${colors.bg} rounded-t-lg`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={`${colors.bg} ${colors.text} border ${colors.border}`}>
                        HF {hf.nummer}
                      </Badge>
                      <span className={`font-semibold ${colors.text}`}>
                        {hf.kurzname}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({regelstandards.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {regelstandards.map((rs) => (
                        <Card
                          key={rs.rsCode}
                          className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                          style={{
                            borderLeftColor: HANDLUNGSFELD_COLORS[rs.handlungsfeldNummer].text
                              .replace("text-", "")
                              .replace("-800", ""),
                          }}
                          onClick={() => setSelectedRegelstandard(rs)}
                        >
                          <CardContent className="p-4">
                            {/* RS Code prominent */}
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-mono font-bold text-lg text-primary">
                                {rs.rsCode}
                              </span>
                              <Badge
                                variant="outline"
                                className={ZYKLUS_COLORS[rs.zyklus] || ""}
                              >
                                {rs.zyklus}
                              </Badge>
                            </div>

                            {/* Kompetenz */}
                            <h3 className="font-semibold text-sm mb-2">{rs.kompetenz}</h3>

                            {/* Dimension */}
                            <Badge
                              variant="outline"
                              className={`text-xs mb-2 ${
                                DIMENSION_COLORS[rs.dimension]?.bg || ""
                              } ${DIMENSION_COLORS[rs.dimension]?.text || ""}`}
                            >
                              {rs.dimension.includes("Zugang") ? "Zugang" : "Verständnis"}
                            </Badge>

                            {/* Klassenstufe */}
                            <div className="text-xs text-muted-foreground mb-2">
                              Klassenstufe: {rs.klassenstufe}
                            </div>

                            {/* Kurze Beschreibung */}
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {rs.kompetenzstufe}
                            </p>

                            {/* LP-Codes */}
                            {rs.kompetenzenLehrplan.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {rs.kompetenzenLehrplan.slice(0, 3).map((lpCode) => (
                                  <Badge
                                    key={lpCode}
                                    variant="secondary"
                                    className="text-xs font-mono"
                                  >
                                    {lpCode}
                                  </Badge>
                                ))}
                                {rs.kompetenzenLehrplan.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{rs.kompetenzenLehrplan.length - 3}
                                  </Badge>
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

          {/* Detail Dialog */}
          <Dialog
            open={!!selectedRegelstandard}
            onOpenChange={() => setSelectedRegelstandard(null)}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {selectedRegelstandard && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <span className="font-mono text-2xl text-primary">
                        {selectedRegelstandard.rsCode}
                      </span>
                      <Badge
                        className={
                          HANDLUNGSFELD_COLORS[selectedRegelstandard.handlungsfeldNummer]
                            ?.bg +
                          " " +
                          HANDLUNGSFELD_COLORS[selectedRegelstandard.handlungsfeldNummer]
                            ?.text
                        }
                      >
                        HF {selectedRegelstandard.handlungsfeldNummer}
                      </Badge>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 mt-4">
                    {/* Kompetenz */}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedRegelstandard.kompetenz}
                      </h3>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={ZYKLUS_COLORS[selectedRegelstandard.zyklus]}
                      >
                        {selectedRegelstandard.zyklus}
                      </Badge>
                      <Badge variant="outline">
                        Klassenstufe: {selectedRegelstandard.klassenstufe}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${
                          DIMENSION_COLORS[selectedRegelstandard.dimension]?.bg || ""
                        } ${DIMENSION_COLORS[selectedRegelstandard.dimension]?.text || ""}`}
                      >
                        {selectedRegelstandard.dimension.includes("Zugang")
                          ? "Zugang"
                          : "Verständnis"}
                      </Badge>
                    </div>

                    {/* Handlungsfeld */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <span className="text-sm text-muted-foreground">Handlungsfeld:</span>
                      <p className="font-medium">{selectedRegelstandard.handlungsfeld}</p>
                    </div>

                    {/* Dimension */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <span className="text-sm text-muted-foreground">Dimension:</span>
                      <p className="font-medium">{selectedRegelstandard.dimension}</p>
                    </div>

                    {/* Kompetenzstufe */}
                    <div>
                      <span className="text-sm text-muted-foreground">Kompetenzstufe:</span>
                      <p className="mt-1 text-gray-800">
                        {selectedRegelstandard.kompetenzstufe}
                      </p>
                    </div>

                    {/* Verknüpfte Lehrplan-Kompetenzen */}
                    {selectedRegelstandard.kompetenzenLehrplan.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="font-semibold">
                            Verknüpfte Lehrplan-Kompetenzen
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedRegelstandard.kompetenzenLehrplan.map((lpCode) => (
                            <Link
                              key={lpCode}
                              href={`/dashboard/lehrplan?search=${encodeURIComponent(lpCode)}`}
                              className="inline-flex"
                            >
                              <Badge
                                variant="outline"
                                className="font-mono cursor-pointer hover:bg-primary hover:text-white transition-colors"
                              >
                                {lpCode}
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </Badge>
                            </Link>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Klicken Sie auf einen LP-Code, um zur Lehrplan-Seite zu navigieren.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function RegelstandardsPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Wird geladen...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <RegelstandardsPageContent />
    </Suspense>
  );
}
