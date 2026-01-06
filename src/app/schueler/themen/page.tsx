"use client";

import { useAuth } from "@/contexts/AuthContext";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";
import StudentDashboardLayout from "@/components/StudentDashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Student, ClassThemeProgress, Zeitraum } from "@/types";
import { BookOpen, Calendar, Tag, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Zeitraum Farben
const ZEITRAUM_COLORS: Record<Zeitraum, string> = {
  "Sommerferien-Herbstferien": "bg-orange-100 text-orange-800 border-orange-200",
  "Herbstferien-Weihnachtsferien": "bg-red-100 text-red-800 border-red-200",
  "Weihnachtsferien-Winterferien": "bg-blue-100 text-blue-800 border-blue-200",
  "Winterferien-Frühlingsferien": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Frühlingsferien-Sommerferien": "bg-green-100 text-green-800 border-green-200",
  Zusatz: "bg-gray-100 text-gray-800 border-gray-200",
};

// Zeitraum Labels (kürzere Version)
const ZEITRAUM_LABELS: Record<Zeitraum, string> = {
  "Sommerferien-Herbstferien": "Sommer - Herbst",
  "Herbstferien-Weihnachtsferien": "Herbst - Weihnachten",
  "Weihnachtsferien-Winterferien": "Weihnachten - Winter",
  "Winterferien-Frühlingsferien": "Winter - Frühling",
  "Frühlingsferien-Sommerferien": "Frühling - Sommer",
  Zusatz: "Zusatz",
};

export default function StudentThemenPage() {
  const { user, userProfile } = useAuth();
  const studentProfile = userProfile as Student | null;

  const [loading, setLoading] = useState(true);
  const [themes, setThemes] = useState<ClassThemeProgress[]>([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user || !studentProfile) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/class-themes?classId=${studentProfile.classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setThemes(data.themes || []);
      }
    } catch (error) {
      console.error("Error fetching themes:", error);
    } finally {
      setLoading(false);
    }
  }, [user, studentProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group themes by zeitraum
  const themesByZeitraum = themes.reduce(
    (acc, theme) => {
      const zeitraum = theme.zeitraum || "Zusatz";
      if (!acc[zeitraum]) acc[zeitraum] = [];
      acc[zeitraum].push(theme);
      return acc;
    },
    {} as Record<string, ClassThemeProgress[]>
  );

  // Calculate total competencies covered
  const allCompetencyIds = new Set(themes.flatMap((t) => t.competencyIds));

  if (loading) {
    return (
      <StudentProtectedRoute>
        <StudentDashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </StudentDashboardLayout>
      </StudentProtectedRoute>
    );
  }

  return (
    <StudentProtectedRoute>
      <StudentDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-green-500" />
              Bearbeitete Themen
            </h1>
            <p className="text-muted-foreground">
              Themen, die ihr in deiner Klasse behandelt habt
            </p>
          </div>

          {/* Stats Card */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {themes.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Themen bearbeitet
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {allCompetencyIds.size}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Kompetenzen abgedeckt
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Object.keys(themesByZeitraum).length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Zeiträume
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Themes by Zeitraum */}
          {Object.entries(themesByZeitraum).map(([zeitraum, zeitraumThemes]) => (
            <Card key={zeitraum}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {ZEITRAUM_LABELS[zeitraum as Zeitraum] || zeitraum}
                </CardTitle>
                <CardDescription>
                  {zeitraumThemes.length} Thema{zeitraumThemes.length !== 1 && "en"} in diesem
                  Zeitraum
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {zeitraumThemes.map((theme) => (
                    <div
                      key={theme.id}
                      className="p-4 bg-muted/30 rounded-lg border"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold">{theme.themeName}</h3>
                          {theme.themeDescription && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {theme.themeDescription}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Bearbeitet am{" "}
                              {new Date(
                                theme.markedCompletedAt
                              ).toLocaleDateString("de-CH", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {theme.zeitraum && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                ZEITRAUM_COLORS[theme.zeitraum as Zeitraum]
                              )}
                            >
                              {ZEITRAUM_LABELS[theme.zeitraum as Zeitraum]}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {theme.competencyIds.length} Kompetenzen
                          </Badge>
                        </div>
                      </div>

                      {/* Competency Names */}
                      {theme.competencyNames && theme.competencyNames.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium mb-2 text-muted-foreground">
                            Behandelte Kompetenzen:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {theme.competencyNames.slice(0, 5).map((name, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs bg-white"
                              >
                                {name}
                              </Badge>
                            ))}
                            {theme.competencyNames.length > 5 && (
                              <Badge variant="outline" className="text-xs bg-white">
                                +{theme.competencyNames.length - 5} weitere
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {themes.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Noch keine Themen bearbeitet
                </h3>
                <p className="text-muted-foreground">
                  Deine Lehrperson wird Themen als bearbeitet markieren, sobald
                  ihr sie im Unterricht behandelt habt.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </StudentDashboardLayout>
    </StudentProtectedRoute>
  );
}
