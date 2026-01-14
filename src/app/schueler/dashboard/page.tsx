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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Student,
  StudentProgress,
  StudentBadge,
  ClassThemeProgress,
  BADGE_RARITY_COLORS,
  BADGE_RARITY_LABELS,
} from "@/types";
import { Star, Trophy, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export default function StudentDashboardPage() {
  const { user, userProfile } = useAuth();
  const studentProfile = userProfile as Student | null;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [completedThemes, setCompletedThemes] = useState<ClassThemeProgress[]>(
    []
  );
  const [totalCompetencies, setTotalCompetencies] = useState(87);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user || !studentProfile) return;

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch progress, badges, and completed themes in parallel
      const [progressResponse, badgesResponse, themesResponse, compResponse] =
        await Promise.all([
          fetch(`/api/student-progress?studentId=${studentProfile.id}`, {
            headers,
          }),
          fetch(`/api/student-progress/badges?studentId=${studentProfile.id}`, {
            headers,
          }),
          fetch(`/api/class-themes?classId=${studentProfile.classId}`, {
            headers,
          }),
          fetch("/api/kompetenzen", { headers }),
        ]);

      if (progressResponse.ok) {
        const data = await progressResponse.json();
        setProgress(data.progress);
      }

      if (badgesResponse.ok) {
        const data = await badgesResponse.json();
        setBadges(data.badges || []);
      }

      if (themesResponse.ok) {
        const data = await themesResponse.json();
        setCompletedThemes(data.themes || []);
      }

      if (compResponse.ok) {
        const data = await compResponse.json();
        setTotalCompetencies(data.kompetenzen?.length || 87);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, studentProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate progress stats
  const ratedCompetencies = Object.values(progress?.ratings || {}).filter(
    (r) => r > 0
  ).length;
  const ratingsArray = Object.values(progress?.ratings || {}).filter(
    (r) => r > 0
  );
  const averageRating =
    ratingsArray.length > 0
      ? Math.round(
          (ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length) *
            10
        ) / 10
      : 0;
  const progressPercent =
    totalCompetencies > 0
      ? Math.round((ratedCompetencies / totalCompetencies) * 100)
      : 0;

  // Get recent badges (last 3)
  const recentBadges = badges.slice(0, 3);

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
          {/* Willkommens-Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold">
              Willkommen zurück
              {studentProfile?.name
                ? `, ${studentProfile.name.split(" ")[0]}`
                : ""}
              !
            </h1>
            <p className="text-blue-100 mt-2">
              {studentProfile?.className || "Deine Klasse wird geladen..."}
            </p>
          </div>

          {/* Fortschritts-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kompetenzen-Fortschritt */}
            <Link href="/schueler/kompetenzen">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Kompetenzen
                  </CardTitle>
                  <CardDescription>Dein Bewertungsfortschritt</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={progressPercent} className="h-3" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {ratedCompetencies} von {totalCompetencies}
                      </span>
                      <span className="font-medium">{progressPercent}%</span>
                    </div>
                    {averageRating > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>Durchschnitt: {averageRating} Sterne</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Badges */}
            <Link href="/schueler/badges">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Badges
                  </CardTitle>
                  <CardDescription>Deine Auszeichnungen</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold">{badges.length}</span>
                    <span className="text-muted-foreground">von 16</span>
                  </div>
                  {badges.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      Bewerte Kompetenzen, um Badges zu verdienen!
                    </p>
                  ) : (
                    <div className="flex gap-1 mt-2">
                      {recentBadges.map((badge) => (
                        <span
                          key={badge.id}
                          className="text-2xl"
                          title={badge.badgeName}
                        >
                          {badge.badgeEmoji}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Bearbeitete Themen */}
            <Link href="/schueler/themen">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-500" />
                    Themen
                  </CardTitle>
                  <CardDescription>Von deiner Klasse bearbeitet</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold">
                      {completedThemes.length}
                    </span>
                    <span className="text-muted-foreground">Themen</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {completedThemes.length === 0
                      ? "Noch keine Themen bearbeitet"
                      : "Sieh welche Themen ihr gemacht habt"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Kompetenzen bewerten</CardTitle>
                <CardDescription>
                  Schätze deine Fähigkeiten in verschiedenen Bereichen ein
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/schueler/kompetenzen">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600">
                    Zu den Kompetenzen
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Deine Badges</CardTitle>
                <CardDescription>
                  Sieh dir deine Auszeichnungen und Erfolge an
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/schueler/badges">
                  <Button variant="outline" className="w-full">
                    Badge-Sammlung öffnen
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Badge-Showcase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Deine neuesten Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {badges.length === 0 ? (
                <div className="flex flex-wrap gap-4 justify-center py-8">
                  <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">🎯</div>
                    <p className="text-sm">
                      Noch keine Badges verdient.
                      <br />
                      Bewerte deine ersten Kompetenzen!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.slice(0, 8).map((badge) => (
                    <div
                      key={badge.id}
                      className={cn(
                        "p-4 rounded-lg text-center transition-all hover:scale-105",
                        "bg-gradient-to-br from-white to-gray-50 border"
                      )}
                      style={{
                        borderColor: BADGE_RARITY_COLORS[badge.badgeRarity],
                      }}
                    >
                      <span className="text-3xl block mb-2">
                        {badge.badgeEmoji}
                      </span>
                      <h4 className="font-medium text-sm">{badge.badgeName}</h4>
                      <Badge
                        variant="outline"
                        className="mt-2 text-xs"
                        style={{
                          color: BADGE_RARITY_COLORS[badge.badgeRarity],
                          borderColor: BADGE_RARITY_COLORS[badge.badgeRarity],
                        }}
                      >
                        {BADGE_RARITY_LABELS[badge.badgeRarity]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {badges.length > 8 && (
                <div className="mt-4 text-center">
                  <Link href="/schueler/badges">
                    <Button variant="ghost" className="text-blue-600">
                      Alle {badges.length} Badges anzeigen
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Themes Preview */}
          {completedThemes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-500" />
                  Zuletzt bearbeitete Themen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completedThemes.slice(0, 5).map((theme) => (
                    <div
                      key={theme.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{theme.themeName}</h4>
                        {theme.zeitraum && (
                          <p className="text-xs text-muted-foreground">
                            {theme.zeitraum}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {theme.competencyIds.length} Kompetenzen
                      </Badge>
                    </div>
                  ))}
                </div>
                {completedThemes.length > 5 && (
                  <div className="mt-4 text-center">
                    <Link href="/schueler/themen">
                      <Button variant="ghost" className="text-blue-600">
                        Alle {completedThemes.length} Themen anzeigen
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </StudentDashboardLayout>
    </StudentProtectedRoute>
  );
}
