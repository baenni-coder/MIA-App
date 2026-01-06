"use client";

import { useAuth } from "@/contexts/AuthContext";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";
import StudentDashboardLayout from "@/components/StudentDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Student } from "@/types";
import { Star, Trophy, BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const { userProfile } = useAuth();
  const studentProfile = userProfile as Student | null;

  // Placeholder-Daten (später durch echte Daten ersetzen)
  const progressData = {
    totalCompetencies: 87,
    ratedCompetencies: 0,
    averageRating: 0,
    completedThemes: 0,
  };

  const progressPercent = progressData.totalCompetencies > 0
    ? Math.round((progressData.ratedCompetencies / progressData.totalCompetencies) * 100)
    : 0;

  return (
    <StudentProtectedRoute>
      <StudentDashboardLayout>
        <div className="space-y-6">
          {/* Willkommens-Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold">
              Willkommen zurück{studentProfile?.name ? `, ${studentProfile.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-blue-100 mt-2">
              {studentProfile?.className || "Deine Klasse wird geladen..."}
            </p>
          </div>

          {/* Fortschritts-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kompetenzen-Fortschritt */}
            <Card>
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
                      {progressData.ratedCompetencies} von {progressData.totalCompetencies}
                    </span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Badges
                </CardTitle>
                <CardDescription>Deine Auszeichnungen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">0</span>
                  <span className="text-muted-foreground">von 16</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Bewerte Kompetenzen, um Badges zu verdienen!
                </p>
              </CardContent>
            </Card>

            {/* Bearbeitete Themen */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-500" />
                  Themen
                </CardTitle>
                <CardDescription>Von deiner Klasse bearbeitet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{progressData.completedThemes}</span>
                  <span className="text-muted-foreground">Themen</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sieh welche Themen ihr gemacht habt
                </p>
              </CardContent>
            </Card>
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

          {/* Badge-Showcase (Platzhalter) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Deine neuesten Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </StudentDashboardLayout>
    </StudentProtectedRoute>
  );
}
