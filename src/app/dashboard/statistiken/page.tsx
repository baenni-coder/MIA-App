"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  SchoolClass,
  Student,
  StudentProgress,
  StudentBadge,
  ClassThemeProgress,
} from "@/types";
import {
  BarChart3,
  Users,
  Star,
  Award,
  BookOpen,
  Loader2,
  TrendingUp,
  FileDown,
} from "lucide-react";

interface ClassStats {
  studentCount: number;
  averageRatedCompetencies: number;
  averageRating: number;
  completedThemesCount: number;
  totalBadges: number;
  studentStats: {
    studentId: string;
    studentName: string;
    ratedCount: number;
    averageRating: number;
    badgeCount: number;
    fiveStarCount: number;
  }[];
}

export default function StatistikenPage() {
  const { user, userProfile, getAuthToken } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<ClassStats | null>(null);

  const loadClasses = useCallback(async () => {
    if (!user) return;

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/classes", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.error("Error loading classes:", err);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthToken]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Load stats when class is selected
  useEffect(() => {
    const loadStats = async () => {
      if (!selectedClass || !user) {
        setStats(null);
        return;
      }

      setStatsLoading(true);
      try {
        const token = await getAuthToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Parallel fetch all data
        const [studentsRes, badgesRes, themesRes] = await Promise.all([
          fetch(`/api/students?classId=${selectedClass}`, { headers }),
          fetch(`/api/student-badges?classId=${selectedClass}`, { headers }),
          fetch(`/api/class-themes?classId=${selectedClass}`, { headers }),
        ]);

        const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] };
        const badgesData = badgesRes.ok ? await badgesRes.json() : { studentBadges: [] };
        const themesData = themesRes.ok ? await themesRes.json() : { themes: [] };

        const students: Student[] = studentsData.students || [];
        const studentBadgesMap = new Map<string, StudentBadge[]>();

        for (const entry of badgesData.studentBadges || []) {
          studentBadgesMap.set(entry.studentId, entry.badges || []);
        }

        const completedThemes: ClassThemeProgress[] = themesData.themes || [];

        // Fetch progress for each student
        const studentStats = await Promise.all(
          students.map(async (student) => {
            const progressRes = await fetch(
              `/api/student-progress?studentId=${student.id}`,
              { headers }
            );

            let progress: StudentProgress | null = null;
            if (progressRes.ok) {
              const data = await progressRes.json();
              progress = data.progress;
            }

            const ratings = progress?.ratings || {};
            const ratingValues = Object.values(ratings);
            const ratedCount = ratingValues.length;
            const avgRating =
              ratedCount > 0
                ? ratingValues.reduce((sum, r) => sum + r, 0) / ratedCount
                : 0;
            const fiveStarCount = ratingValues.filter((r) => r === 5).length;
            const badges = studentBadgesMap.get(student.id) || [];

            return {
              studentId: student.id,
              studentName: student.name,
              ratedCount,
              averageRating: avgRating,
              badgeCount: badges.length,
              fiveStarCount,
            };
          })
        );

        // Calculate overall stats
        const totalRated = studentStats.reduce((sum, s) => sum + s.ratedCount, 0);
        const totalRating = studentStats.reduce(
          (sum, s) => sum + s.averageRating * s.ratedCount,
          0
        );
        const totalBadges = studentStats.reduce((sum, s) => sum + s.badgeCount, 0);

        setStats({
          studentCount: students.length,
          averageRatedCompetencies:
            students.length > 0
              ? Math.round(totalRated / students.length)
              : 0,
          averageRating:
            totalRated > 0 ? Math.round((totalRating / totalRated) * 10) / 10 : 0,
          completedThemesCount: completedThemes.length,
          totalBadges,
          studentStats: studentStats.sort((a, b) => b.ratedCount - a.ratedCount),
        });
      } catch (err) {
        console.error("Error loading stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [selectedClass, user, getAuthToken]);

  const exportCSV = () => {
    if (!stats || !selectedClass) return;

    const selectedClassObj = classes.find((c) => c.id === selectedClass);
    const className = selectedClassObj?.name || "Klasse";

    const headers = [
      "Name",
      "Bewertete Kompetenzen",
      "Durchschnitt",
      "5-Sterne",
      "Badges",
    ];
    const rows = stats.studentStats.map((s) => [
      s.studentName,
      s.ratedCount.toString(),
      s.averageRating.toFixed(1),
      s.fiveStarCount.toString(),
      s.badgeCount.toString(),
    ]);

    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Statistik-${className}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Klassen-Statistiken
              </h1>
              <p className="text-gray-500 mt-1">
                Fortschritt und Leistung Ihrer Klassen im Überblick
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Klasse wählen" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stats && (
                <Button variant="outline" onClick={exportCSV}>
                  <FileDown className="h-4 w-4 mr-2" />
                  CSV Export
                </Button>
              )}
            </div>
          </div>

          {!selectedClass ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Wählen Sie eine Klasse aus, um die Statistiken anzuzeigen.
                </p>
              </CardContent>
            </Card>
          ) : statsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : stats ? (
            <>
              {/* Overview Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Schüler</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      {stats.studentCount}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>⌀ Bewertete Kompetenzen</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      {stats.averageRatedCompetencies}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>⌀ Bewertung</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      {stats.averageRating.toFixed(1)} ★
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Bearbeitete Themen</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-500" />
                      {stats.completedThemesCount}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Vergebene Badges</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Award className="h-5 w-5 text-orange-500" />
                      {stats.totalBadges}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Student Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Schüler-Fortschritt</CardTitle>
                  <CardDescription>
                    Detaillierte Übersicht pro Schüler
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.studentStats.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Keine Schüler in dieser Klasse.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stats.studentStats.map((student) => (
                        <div
                          key={student.studentId}
                          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-medium">{student.studentName}</h3>
                              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-4 w-4" />
                                  {student.ratedCount} bewertet
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-4 w-4" />
                                  {student.averageRating.toFixed(1)} ⌀
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  {student.fiveStarCount}x 5★
                                </span>
                                <span className="flex items-center gap-1">
                                  <Award className="h-4 w-4" />
                                  {student.badgeCount} Badges
                                </span>
                              </div>
                            </div>
                            <div className="w-full md:w-48">
                              <div className="text-xs text-gray-500 mb-1 text-right">
                                Fortschritt
                              </div>
                              <Progress
                                value={(student.ratedCount / 87) * 100}
                                className="h-2"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ranking */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top-Lernende</CardTitle>
                    <CardDescription>Meiste bewertete Kompetenzen</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.studentStats.slice(0, 5).map((student, index) => (
                        <div
                          key={student.studentId}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                index === 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : index === 1
                                  ? "bg-gray-100 text-gray-700"
                                  : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-50 text-gray-500"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span className="text-sm">{student.studentName}</span>
                          </div>
                          <span className="text-sm font-medium">
                            {student.ratedCount} Kompetenzen
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Badge-Sammler</CardTitle>
                    <CardDescription>Meiste erhaltene Badges</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[...stats.studentStats]
                        .sort((a, b) => b.badgeCount - a.badgeCount)
                        .slice(0, 5)
                        .map((student, index) => (
                          <div
                            key={student.studentId}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  index === 0
                                    ? "bg-purple-100 text-purple-700"
                                    : index === 1
                                    ? "bg-gray-100 text-gray-700"
                                    : index === 2
                                    ? "bg-pink-100 text-pink-700"
                                    : "bg-gray-50 text-gray-500"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <span className="text-sm">{student.studentName}</span>
                            </div>
                            <span className="text-sm font-medium">
                              {student.badgeCount} Badges
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
