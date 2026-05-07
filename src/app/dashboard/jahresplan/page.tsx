"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import KanbanBoard from "@/components/KanbanBoard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Thema, Zeitraum, Teacher, Stufe, Fachbereich, FACHBEREICHE } from "@/types";
import { Search, X, Layers } from "lucide-react";
import SoIntegrationHinweis from "@/components/SoIntegrationHinweis";

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

function JahresplanContent() {
  const { user, getAuthToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search");
  const allStufenParam = searchParams.get("allStufen") === "true";
  const [themenGrouped, setThemenGrouped] = useState<Record<Zeitraum, Thema[]> | null>(null);
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStufe, setSelectedStufe] = useState<Stufe | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || "");
  const [integrationFilter, setIntegrationFilter] = useState<Fachbereich | "all">("all");

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Get auth token for teachers API
        const token = await getAuthToken();
        if (!token) {
          console.error("No auth token available");
          setLoading(false);
          return;
        }

        // Erst Lehrer-Daten laden, um die Stufe zu bekommen
        const teacherRes = await fetch(`/api/teachers?userId=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!teacherRes.ok) {
          throw new Error(`HTTP ${teacherRes.status}`);
        }

        const data: Teacher = await teacherRes.json();
        setTeacherData(data);

        // Verwende selectedStufe falls gesetzt, sonst die Stufe des Lehrers
        const currentStufe = selectedStufe || data.stufe;

        // Wenn allStufen=true (von Lehrplan-Link), lade ALLE Themen
        // Sonst nur Themen für die aktuelle Stufe
        // Bei vorhandener schuleId wird curated=true angehängt; die API
        // liefert den kuratierten Schul-Jahresplan nur, wenn die Schule auch
        // wirklich im curated-Modus ist, sonst fällt sie automatisch auf das
        // bisherige (offene) Verhalten zurück.
        const params = new URLSearchParams();
        params.set("grouped", "true");
        if (!(allStufenParam && searchQuery)) {
          params.set("stufe", currentStufe);
        }
        if (data.schuleId) {
          params.set("schuleId", data.schuleId);
          params.set("curated", "true");
        }
        const themenUrl = `/api/themen?${params.toString()}`;

        const themenRes = await fetch(themenUrl);
        const themenData = await themenRes.json();
        setThemenGrouped(themenData);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, getAuthToken, selectedStufe, allStufenParam, searchQuery]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Jahresplan</h2>
            <p className="text-muted-foreground mt-2">
              {teacherData
                ? `Ihr MIA-Jahresplan für ${selectedStufe || teacherData.stufe}`
                : "Wird geladen..."}
            </p>
          </div>

          <SoIntegrationHinweis teacher={teacherData} />

          {teacherData && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Suchfeld */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Thema suchen..."
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && localSearchQuery.trim()) {
                        router.push(`/dashboard/jahresplan?search=${encodeURIComponent(localSearchQuery.trim())}&allStufen=true`);
                      }
                    }}
                    className="pl-9 pr-8"
                  />
                  {localSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => {
                        setLocalSearchQuery("");
                        router.push("/dashboard/jahresplan");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (localSearchQuery.trim()) {
                      router.push(`/dashboard/jahresplan?search=${encodeURIComponent(localSearchQuery.trim())}&allStufen=true`);
                    }
                  }}
                  disabled={!localSearchQuery.trim()}
                >
                  Suchen
                </Button>
              </div>

              {/* Stufen-Auswahl */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Stufe:</label>
                <Select
                  value={selectedStufe || teacherData.stufe}
                  onValueChange={(value) => {
                    setSelectedStufe(value as Stufe);
                    setLoading(true);
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUFEN.map((stufe) => (
                      <SelectItem key={stufe} value={stufe}>
                        {stufe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStufe && selectedStufe !== teacherData.stufe && (
                  <span className="text-sm text-muted-foreground">
                    (Temp.)
                  </span>
                )}
              </div>

              {/* Integrationsfach-Filter */}
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Integrationsfach:</label>
                <Select
                  value={integrationFilter}
                  onValueChange={(value) =>
                    setIntegrationFilter(value as Fachbereich | "all")
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Themen</SelectItem>
                    {FACHBEREICHE.map((fb) => (
                      <SelectItem key={fb.value} value={fb.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: fb.farbe }}
                          />
                          <span>{fb.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Jahresplan wird geladen...</p>
              </div>
            </div>
          ) : themenGrouped ? (
            <KanbanBoard
              themenGrouped={themenGrouped}
              schulePictsBuchen={teacherData?.schule?.pictsBuchen}
              searchQuery={searchQuery || undefined}
              filterQuery={localSearchQuery}
              integrationFilter={
                integrationFilter === "all" ? null : integrationFilter
              }
              userStufe={teacherData?.stufe}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Keine Themen für Ihre Stufe gefunden.
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function JahresplanPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Jahresplan wird geladen...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <JahresplanContent />
    </Suspense>
  );
}
