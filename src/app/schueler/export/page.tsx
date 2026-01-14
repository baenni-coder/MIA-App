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
import { Button } from "@/components/ui/button";
import {
  Student,
  StudentProgress,
  StudentBadge,
  Kompetenz,
  ClassThemeProgress,
} from "@/types";
import {
  FileDown,
  Loader2,
  FileText,
  Award,
  BookOpen,
  Star,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

export default function ExportPage() {
  const { user, userProfile, getAuthToken } = useAuth();
  const studentProfile = userProfile as Student | null;
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [completedThemes, setCompletedThemes] = useState<ClassThemeProgress[]>([]);
  const [kompetenzen, setKompetenzen] = useState<Kompetenz[]>([]);

  const loadData = useCallback(async () => {
    if (!user || !studentProfile) return;

    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [progressRes, badgesRes, themesRes, kompRes] = await Promise.all([
        fetch(`/api/student-progress?studentId=${studentProfile.id}`, { headers }),
        fetch(`/api/student-progress/badges?studentId=${studentProfile.id}`, { headers }),
        fetch(`/api/class-themes?classId=${studentProfile.classId}`, { headers }),
        fetch("/api/kompetenzen", { headers }),
      ]);

      if (progressRes.ok) {
        const data = await progressRes.json();
        setProgress(data.progress || null);
      }

      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setBadges(data.badges || []);
      }

      if (themesRes.ok) {
        const data = await themesRes.json();
        setCompletedThemes(data.themes || []);
      }

      if (kompRes.ok) {
        const data = await kompRes.json();
        setKompetenzen(data.kompetenzen || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, studentProfile, getAuthToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Berechne Statistiken
  const ratings = progress?.ratings || {};
  const ratingEntries = Object.entries(ratings);
  const totalRated = ratingEntries.length;
  const totalKompetenzen = kompetenzen.length;
  const fiveStarCount = ratingEntries.filter(([, r]) => r === 5).length;
  const fourPlusCount = ratingEntries.filter(([, r]) => r >= 4).length;
  const averageRating =
    totalRated > 0
      ? ratingEntries.reduce((sum, [, r]) => sum + r, 0) / totalRated
      : 0;

  // Kompetenzen nach Bereichen gruppieren
  const ratedByArea: Record<string, { rated: number; total: number; avgRating: number }> = {};

  kompetenzen.forEach((k) => {
    const area = k.kompetenzbereich || "Sonstige";
    if (!ratedByArea[area]) {
      ratedByArea[area] = { rated: 0, total: 0, avgRating: 0 };
    }
    ratedByArea[area].total++;
    if (ratings[k.id]) {
      ratedByArea[area].rated++;
      ratedByArea[area].avgRating += ratings[k.id];
    }
  });

  Object.keys(ratedByArea).forEach((area) => {
    if (ratedByArea[area].rated > 0) {
      ratedByArea[area].avgRating /= ratedByArea[area].rated;
    }
  });

  const exportAsPDF = async () => {
    if (!studentProfile) return;

    setExporting(true);
    try {
      // Dynamisch importieren für bessere Bundle-Größe
      const { pdf } = await import("@react-pdf/renderer");
      const { KompetenzenpassPDF } = await import("@/components/KompetenzenpassPDF");

      // Base URL für Assets (Logo, etc.)
      const baseUrl = window.location.origin;

      // PDF-Dokument erstellen
      const blob = await pdf(
        <KompetenzenpassPDF
          student={studentProfile}
          progress={progress}
          badges={badges}
          kompetenzen={kompetenzen}
          completedThemes={completedThemes}
          baseUrl={baseUrl}
        />
      ).toBlob();

      // Download-Link erstellen und klicken
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Kompetenzenpass-${studentProfile.name.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Fehler beim Erstellen des PDFs. Bitte versuche es erneut.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <StudentProtectedRoute>
        <StudentDashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        </StudentDashboardLayout>
      </StudentProtectedRoute>
    );
  }

  return (
    <StudentProtectedRoute>
      <StudentDashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileDown className="h-6 w-6" />
              Kompetenzenpass exportieren
            </h1>
            <p className="text-gray-500 mt-1">
              Erstelle ein PDF mit deinem aktuellen Lernfortschritt
            </p>
          </div>

          {/* Vorschau */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Bewertete Kompetenzen</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  {totalRated} / {totalKompetenzen}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Durchschnitt: {averageRating.toFixed(1)} ★
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Erhaltene Badges</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-500" />
                  {badges.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {fiveStarCount}x 5-Sterne Kompetenzen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Bearbeitete Themen</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  {completedThemes.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Im Unterricht behandelt
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top-Kompetenzen</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {fourPlusCount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Mit 4+ Sternen bewertet
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bereiche Übersicht */}
          <Card>
            <CardHeader>
              <CardTitle>Fortschritt nach Bereich</CardTitle>
              <CardDescription>
                Deine Bewertungen in den verschiedenen MIA-Bereichen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Medien", "Informatik", "Anwendungskompetenzen"].map((area) => {
                  const stats = ratedByArea[area] || { rated: 0, total: 0, avgRating: 0 };
                  const percentage =
                    stats.total > 0 ? (stats.rated / stats.total) * 100 : 0;

                  return (
                    <div key={area} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{area}</span>
                        <span className="text-muted-foreground">
                          {stats.rated} / {stats.total} bewertet
                          {stats.rated > 0 && ` (⌀ ${stats.avgRating.toFixed(1)}★)`}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF erstellen
              </CardTitle>
              <CardDescription>
                Dein Kompetenzenpass als PDF-Dokument zum Ausdrucken oder Speichern
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                onClick={exportAsPDF}
                disabled={exporting}
                className="w-full md:w-auto"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    PDF wird erstellt...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Kompetenzenpass als PDF herunterladen
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Das PDF enthält eine Übersicht deiner Kompetenzbewertungen, erhaltenen
                Badges und bearbeiteten Themen.
              </p>
            </CardContent>
          </Card>
        </div>
      </StudentDashboardLayout>
    </StudentProtectedRoute>
  );
}
