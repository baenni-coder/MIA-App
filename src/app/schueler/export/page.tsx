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
  BADGE_RARITY_LABELS,
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
  const kompetenzMap = new Map(kompetenzen.map((k) => [k.id, k]));
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
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Deckblatt
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Kompetenzenpass", 105, 40, { align: "center" });

      doc.setFontSize(18);
      doc.setFont("helvetica", "normal");
      doc.text(studentProfile.name, 105, 60, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Klasse: ${studentProfile.className || "Unbekannt"}`, 105, 75, {
        align: "center",
      });
      doc.text(
        `Stand: ${new Date().toLocaleDateString("de-CH", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`,
        105,
        85,
        { align: "center" }
      );

      // Zusammenfassung
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Zusammenfassung", 20, 110);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      let y = 125;

      doc.text(`Bewertete Kompetenzen: ${totalRated} von ${totalKompetenzen}`, 20, y);
      y += 8;
      doc.text(`Durchschnittliche Bewertung: ${averageRating.toFixed(1)} Sterne`, 20, y);
      y += 8;
      doc.text(`Kompetenzen mit 5 Sternen: ${fiveStarCount}`, 20, y);
      y += 8;
      doc.text(`Kompetenzen mit 4+ Sternen: ${fourPlusCount}`, 20, y);
      y += 8;
      doc.text(`Erhaltene Badges: ${badges.length}`, 20, y);
      y += 8;
      doc.text(`Bearbeitete Themen: ${completedThemes.length}`, 20, y);

      // Badges
      if (badges.length > 0) {
        y += 20;
        doc.setFont("helvetica", "bold");
        doc.text("Erhaltene Badges", 20, y);
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        badges.forEach((badge) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          const date = new Date(badge.awardedAt).toLocaleDateString("de-CH");
          doc.text(
            `${badge.badgeEmoji} ${badge.badgeName} (${BADGE_RARITY_LABELS[badge.badgeRarity]}) - ${date}`,
            25,
            y
          );
          y += 7;
        });
      }

      // Neue Seite für Kompetenzen nach Bereich
      doc.addPage();
      y = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Kompetenzen nach Bereich", 20, y);
      y += 15;

      const areas = ["Medien", "Informatik", "Anwendungskompetenzen"];

      areas.forEach((area) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(area, 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const areaKompetenzen = kompetenzen.filter(
          (k) => k.kompetenzbereich === area
        );

        areaKompetenzen.forEach((k) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          const rating = ratings[k.id] || 0;
          const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
          const lpCode = k.lpCode || k.name?.substring(0, 15) || "";

          doc.text(`${lpCode}: ${stars}`, 25, y);
          y += 6;
        });

        y += 10;
      });

      // Bearbeitete Themen
      if (completedThemes.length > 0) {
        if (y > 220) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Bearbeitete Themen", 20, y);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        completedThemes.forEach((theme) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          const date = new Date(theme.markedCompletedAt).toLocaleDateString("de-CH");
          doc.text(`- ${theme.themeName} (${date})`, 25, y);
          y += 6;
        });
      }

      // Footer auf der letzten Seite
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Seite ${i} von ${pageCount}`, 105, 290, { align: "center" });
        doc.text("MIA-App Kompetenzenpass", 20, 290);
      }

      // Download
      doc.save(`Kompetenzenpass-${studentProfile.name.replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Fehler beim Erstellen des PDFs");
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
