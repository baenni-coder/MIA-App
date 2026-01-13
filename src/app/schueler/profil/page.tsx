"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";
import StudentDashboardLayout from "@/components/StudentDashboardLayout";
import { StudentAvatar, AvatarEditor, generateRandomSeed } from "@/components/StudentAvatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Student,
  AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
} from "@/types";
import {
  User,
  Mail,
  School,
  Users,
  Pencil,
  Loader2,
  Check,
  Star,
  Trophy,
  BookOpen,
} from "lucide-react";

export default function StudentProfilePage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const studentProfile = userProfile as Student | null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editAvatarOpen, setEditAvatarOpen] = useState(false);
  const [tempAvatarConfig, setTempAvatarConfig] = useState<AvatarConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    ratedCompetencies: 0,
    totalCompetencies: 87,
    badges: 0,
    themes: 0,
  });

  // Aktuelle Avatar-Konfiguration
  const currentAvatarConfig: AvatarConfig = studentProfile?.avatarConfig || {
    ...DEFAULT_AVATAR_CONFIG,
    seed: studentProfile?.id || generateRandomSeed(),
  };

  // Stats laden
  const fetchStats = useCallback(async () => {
    if (!user || !studentProfile) return;

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [progressRes, badgesRes, themesRes, compRes] = await Promise.all([
        fetch(`/api/student-progress?studentId=${studentProfile.id}`, { headers }),
        fetch(`/api/student-progress/badges?studentId=${studentProfile.id}`, { headers }),
        fetch(`/api/class-themes?classId=${studentProfile.classId}`, { headers }),
        fetch("/api/kompetenzen", { headers }),
      ]);

      let ratedCompetencies = 0;
      let badges = 0;
      let themes = 0;
      let totalCompetencies = 87;

      if (progressRes.ok) {
        const data = await progressRes.json();
        if (data.progress?.ratings) {
          ratedCompetencies = Object.values(data.progress.ratings as Record<string, number>).filter((r) => r > 0).length;
        }
      }

      if (badgesRes.ok) {
        const data = await badgesRes.json();
        badges = data.badges?.length || 0;
      }

      if (themesRes.ok) {
        const data = await themesRes.json();
        themes = data.themes?.length || 0;
      }

      if (compRes.ok) {
        const data = await compRes.json();
        totalCompetencies = data.kompetenzen?.length || 87;
      }

      setStats({ ratedCompetencies, totalCompetencies, badges, themes });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user, studentProfile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Avatar-Dialog öffnen
  const handleOpenAvatarEditor = () => {
    setTempAvatarConfig({ ...currentAvatarConfig });
    setEditAvatarOpen(true);
  };

  // Avatar speichern
  const handleSaveAvatar = async () => {
    if (!user || !studentProfile || !tempAvatarConfig) return;

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/students/${studentProfile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarConfig: tempAvatarConfig }),
      });

      if (response.ok) {
        setEditAvatarOpen(false);
        setSuccessMessage("Avatar gespeichert!");
        // Profil neu laden
        await refreshProfile();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const error = await response.json();
        console.error("Error saving avatar:", error);
      }
    } catch (error) {
      console.error("Error saving avatar:", error);
    } finally {
      setSaving(false);
    }
  };

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
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Erfolgs-Nachricht */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Check className="h-5 w-5" />
              {successMessage}
            </div>
          )}

          {/* Profil-Header mit Avatar */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-24 md:h-32" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16">
                {/* Avatar */}
                <div className="relative group">
                  <StudentAvatar
                    config={currentAvatarConfig}
                    size="xl"
                    showBorder
                    className="ring-4 ring-white"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleOpenAvatarEditor}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                {/* Name und Klasse */}
                <div className="flex-1 text-center sm:text-left pb-2">
                  <h1 className="text-2xl font-bold">
                    {studentProfile?.name || "Schüler"}
                  </h1>
                  <p className="text-muted-foreground">
                    {studentProfile?.className || "Klasse wird geladen..."}
                  </p>
                </div>

                {/* Avatar bearbeiten Button (Mobile) */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAvatarEditor}
                  className="sm:hidden gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Avatar ändern
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistiken */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="text-center p-4">
              <div className="flex justify-center mb-2">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold">{stats.ratedCompetencies}</div>
              <div className="text-xs text-muted-foreground">Kompetenzen</div>
            </Card>
            <Card className="text-center p-4">
              <div className="flex justify-center mb-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold">{stats.badges}</div>
              <div className="text-xs text-muted-foreground">Badges</div>
            </Card>
            <Card className="text-center p-4">
              <div className="flex justify-center mb-2">
                <BookOpen className="h-6 w-6 text-green-500" />
              </div>
              <div className="text-2xl font-bold">{stats.themes}</div>
              <div className="text-xs text-muted-foreground">Themen</div>
            </Card>
          </div>

          {/* Profil-Informationen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Meine Daten
              </CardTitle>
              <CardDescription>
                Deine Kontoinformationen (nur lesbar)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{studentProfile?.name}</div>
                </div>
              </div>

              {/* E-Mail */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">E-Mail</div>
                  <div className="font-medium">{studentProfile?.email}</div>
                </div>
              </div>

              {/* Klasse */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Klasse</div>
                  <div className="font-medium">{studentProfile?.className}</div>
                </div>
                <Badge variant="secondary">Schüler</Badge>
              </div>

              {/* Lehrperson */}
              {studentProfile?.teacherName && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <School className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Lehrperson</div>
                    <div className="font-medium">{studentProfile.teacherName}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info-Hinweis */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <p className="text-sm text-blue-700">
                Du kannst deinen Avatar jederzeit ändern. Klicke einfach auf das Stift-Symbol
                bei deinem Profilbild oder den Button &quot;Avatar ändern&quot;.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Avatar-Editor Dialog */}
        <Dialog open={editAvatarOpen} onOpenChange={setEditAvatarOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Avatar anpassen</DialogTitle>
              <DialogDescription>
                Gestalte deinen persönlichen Avatar
              </DialogDescription>
            </DialogHeader>

            {tempAvatarConfig && (
              <AvatarEditor
                config={tempAvatarConfig}
                onChange={setTempAvatarConfig}
              />
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setEditAvatarOpen(false)}
                disabled={saving}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveAvatar}
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Speichern
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StudentDashboardLayout>
    </StudentProtectedRoute>
  );
}
