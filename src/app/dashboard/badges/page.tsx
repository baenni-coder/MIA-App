"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Badge,
  BadgeRarity,
  SchoolClass,
  Student,
  StudentBadge,
  BADGE_RARITY_COLORS,
  BADGE_RARITY_LABELS,
} from "@/types";
import {
  Plus,
  Award,
  Trash2,
  Loader2,
  Users,
  Settings,
  Gift,
  Sparkles,
} from "lucide-react";

export default function BadgesPage() {
  const { user, userProfile, getAuthToken } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Badge Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBadge, setNewBadge] = useState({
    name: "",
    emoji: "",
    description: "",
    rarity: "common" as BadgeRarity,
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Award Badge Dialog
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedBadge, setSelectedBadge] = useState<string>("");
  const [awardReason, setAwardReason] = useState("");
  const [awardLoading, setAwardLoading] = useState(false);

  // Student badges view
  const [classStudentBadges, setClassStudentBadges] = useState<
    { studentId: string; studentName: string; badges: StudentBadge[] }[]
  >([]);
  const [viewingClass, setViewingClass] = useState<string>("");

  const loadBadges = useCallback(async () => {
    if (!user) return;

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/badges", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges || []);
      }
    } catch (err) {
      console.error("Error loading badges:", err);
      setError("Fehler beim Laden der Badges");
    }
  }, [user, getAuthToken]);

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
    }
  }, [user, getAuthToken]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadBadges(), loadClasses()]);
      setLoading(false);
    };
    init();
  }, [loadBadges, loadClasses]);

  // Load students when class is selected
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedClass || !user) {
        setStudents([]);
        return;
      }

      try {
        const token = await getAuthToken();
        const response = await fetch(`/api/students?classId=${selectedClass}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
        }
      } catch (err) {
        console.error("Error loading students:", err);
      }
    };

    loadStudents();
  }, [selectedClass, user, getAuthToken]);

  // Load student badges when viewing class changes
  useEffect(() => {
    const loadClassBadges = async () => {
      if (!viewingClass || !user) {
        setClassStudentBadges([]);
        return;
      }

      try {
        const token = await getAuthToken();

        // Get students for the class
        const studentsResponse = await fetch(`/api/students?classId=${viewingClass}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!studentsResponse.ok) return;

        const studentsData = await studentsResponse.json();
        const classStudents = studentsData.students || [];

        // Get badges for each student
        const badgesResponse = await fetch(`/api/student-badges?classId=${viewingClass}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!badgesResponse.ok) return;

        const badgesData = await badgesResponse.json();
        const studentBadgesMap = new Map<string, StudentBadge[]>();

        for (const entry of badgesData.studentBadges || []) {
          studentBadgesMap.set(entry.studentId, entry.badges);
        }

        const result = classStudents.map((student: Student) => ({
          studentId: student.id,
          studentName: student.name,
          badges: studentBadgesMap.get(student.id) || [],
        }));

        setClassStudentBadges(result);
      } catch (err) {
        console.error("Error loading class badges:", err);
      }
    };

    loadClassBadges();
  }, [viewingClass, user, getAuthToken]);

  const handleCreateBadge = async () => {
    if (!newBadge.name || !newBadge.emoji || !newBadge.description) {
      setError("Bitte alle Felder ausfüllen");
      return;
    }

    setCreateLoading(true);
    setError("");

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/badges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBadge),
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setNewBadge({ name: "", emoji: "", description: "", rarity: "common" });
        await loadBadges();
      } else {
        const data = await response.json();
        setError(data.error || "Fehler beim Erstellen");
      }
    } catch (err) {
      console.error("Error creating badge:", err);
      setError("Fehler beim Erstellen des Badges");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm("Badge wirklich löschen?")) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/badges/${badgeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await loadBadges();
      } else {
        const data = await response.json();
        setError(data.error || "Fehler beim Löschen");
      }
    } catch (err) {
      console.error("Error deleting badge:", err);
      setError("Fehler beim Löschen des Badges");
    }
  };

  const handleAwardBadge = async () => {
    if (!selectedStudent || !selectedBadge) {
      setError("Bitte Schüler und Badge auswählen");
      return;
    }

    setAwardLoading(true);
    setError("");

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/student-badges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudent,
          badgeId: selectedBadge,
          reason: awardReason,
        }),
      });

      if (response.ok) {
        setAwardDialogOpen(false);
        setSelectedStudent("");
        setSelectedBadge("");
        setAwardReason("");
        // Reload class badges if viewing
        if (viewingClass === selectedClass) {
          setViewingClass("");
          setTimeout(() => setViewingClass(selectedClass), 100);
        }
      } else {
        const data = await response.json();
        setError(data.error || "Fehler beim Vergeben");
      }
    } catch (err) {
      console.error("Error awarding badge:", err);
      setError("Fehler beim Vergeben des Badges");
    } finally {
      setAwardLoading(false);
    }
  };

  const handleRevokeBadge = async (studentBadgeId: string, studentId: string) => {
    if (!confirm("Badge wirklich entfernen?")) return;

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/student-badges", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentBadgeId, studentId }),
      });

      if (response.ok) {
        // Reload badges
        if (viewingClass) {
          setViewingClass("");
          setTimeout(() => setViewingClass(viewingClass), 100);
        }
      } else {
        const data = await response.json();
        setError(data.error || "Fehler beim Entfernen");
      }
    } catch (err) {
      console.error("Error revoking badge:", err);
    }
  };

  const initializeSystemBadges = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/badges?initSystem=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await loadBadges();
      }
    } catch (err) {
      console.error("Error initializing badges:", err);
    }
  };

  const systemBadges = badges.filter((b) => b.isSystem);
  const customBadges = badges.filter((b) => !b.isSystem);

  const manualBadges = badges.filter(
    (b) => b.criteria.type === "manual" || !b.isSystem
  );

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
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="h-6 w-6" />
              Badge-Verwaltung
            </h1>
            <p className="text-gray-500 mt-1">
              Verwalten Sie Badges und vergeben Sie diese an Schüler
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border">
            <Button onClick={() => setAwardDialogOpen(true)}>
              <Gift className="h-4 w-4 mr-2" />
              Badge vergeben
            </Button>
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Eigenes Badge
            </Button>
          </div>

          {/* Award Badge Dialog */}
          <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
            <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Badge vergeben</DialogTitle>
                    <DialogDescription>
                      Vergeben Sie ein Badge manuell an einen Schüler
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Klasse</Label>
                      <Select
                        value={selectedClass}
                        onValueChange={(value) => {
                          setSelectedClass(value);
                          setSelectedStudent("");
                        }}
                      >
                        <SelectTrigger>
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
                    </div>

                    {selectedClass && (
                      <div className="space-y-2">
                        <Label>Schüler</Label>
                        <Select
                          value={selectedStudent}
                          onValueChange={setSelectedStudent}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Schüler wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Badge</Label>
                      <Select
                        value={selectedBadge}
                        onValueChange={setSelectedBadge}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Badge wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {manualBadges.map((badge) => (
                            <SelectItem key={badge.id} value={badge.id}>
                              <span className="flex items-center gap-2">
                                <span>{badge.emoji}</span>
                                <span>{badge.name}</span>
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: badge.color + "20",
                                    color: badge.color,
                                  }}
                                >
                                  {BADGE_RARITY_LABELS[badge.rarity]}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Begründung (optional)</Label>
                      <Textarea
                        value={awardReason}
                        onChange={(e) => setAwardReason(e.target.value)}
                        placeholder="Warum erhält der Schüler dieses Badge?"
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setAwardDialogOpen(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleAwardBadge}
                      disabled={awardLoading || !selectedStudent || !selectedBadge}
                    >
                      {awardLoading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Vergeben
                    </Button>
                  </DialogFooter>
                </DialogContent>
          </Dialog>

          {/* Create Badge Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Eigenes Badge erstellen</DialogTitle>
                    <DialogDescription>
                      Erstellen Sie ein individuelles Badge für Ihre Schule
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-1 space-y-2">
                        <Label>Emoji</Label>
                        <Input
                          value={newBadge.emoji}
                          onChange={(e) =>
                            setNewBadge({ ...newBadge, emoji: e.target.value })
                          }
                          placeholder="🎯"
                          className="text-center text-2xl"
                          maxLength={4}
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={newBadge.name}
                          onChange={(e) =>
                            setNewBadge({ ...newBadge, name: e.target.value })
                          }
                          placeholder="z.B. Klassenchampion"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={newBadge.description}
                        onChange={(e) =>
                          setNewBadge({ ...newBadge, description: e.target.value })
                        }
                        placeholder="Wofür wird dieses Badge vergeben?"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Seltenheit</Label>
                      <Select
                        value={newBadge.rarity}
                        onValueChange={(value: BadgeRarity) =>
                          setNewBadge({ ...newBadge, rarity: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: BADGE_RARITY_COLORS.common }}
                              />
                              Gewöhnlich
                            </span>
                          </SelectItem>
                          <SelectItem value="rare">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: BADGE_RARITY_COLORS.rare }}
                              />
                              Selten
                            </span>
                          </SelectItem>
                          <SelectItem value="epic">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: BADGE_RARITY_COLORS.epic }}
                              />
                              Episch
                            </span>
                          </SelectItem>
                          <SelectItem value="legendary">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: BADGE_RARITY_COLORS.legendary }}
                              />
                              Legendär
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newBadge.emoji && newBadge.name && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-2">Vorschau:</p>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{newBadge.emoji}</span>
                          <div>
                            <p className="font-medium">{newBadge.name}</p>
                            <p className="text-sm text-gray-500">
                              {newBadge.description || "Beschreibung..."}
                            </p>
                            <span
                              className="text-xs px-2 py-0.5 rounded mt-1 inline-block"
                              style={{
                                backgroundColor:
                                  BADGE_RARITY_COLORS[newBadge.rarity] + "20",
                                color: BADGE_RARITY_COLORS[newBadge.rarity],
                              }}
                            >
                              {BADGE_RARITY_LABELS[newBadge.rarity]}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleCreateBadge}
                      disabled={
                        createLoading ||
                        !newBadge.name ||
                        !newBadge.emoji ||
                        !newBadge.description
                      }
                    >
                      {createLoading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Erstellen
                    </Button>
                  </DialogFooter>
            </DialogContent>
          </Dialog>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Tabs defaultValue="badges">
            <TabsList>
              <TabsTrigger value="badges" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Alle Badges
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Schüler-Badges
              </TabsTrigger>
            </TabsList>

            <TabsContent value="badges" className="space-y-6 mt-4">
              {/* System Badges */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        System-Badges
                      </CardTitle>
                      <CardDescription>
                        Automatisch vergebene Badges basierend auf Fortschritt
                      </CardDescription>
                    </div>
                    {systemBadges.length === 0 && userProfile?.role !== "teacher" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={initializeSystemBadges}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Initialisieren
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {systemBadges.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Keine System-Badges vorhanden.
                      {userProfile?.role !== "teacher" && (
                        <span> Klicken Sie auf &quot;Initialisieren&quot; um die Standard-Badges zu erstellen.</span>
                      )}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {systemBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                          style={{ borderColor: badge.color + "40" }}
                        >
                          <div className="text-center">
                            <span className="text-4xl">{badge.emoji}</span>
                            <p className="font-medium mt-2 text-sm">
                              {badge.name}
                            </p>
                            <span
                              className="text-xs px-2 py-0.5 rounded mt-1 inline-block"
                              style={{
                                backgroundColor: badge.color + "20",
                                color: badge.color,
                              }}
                            >
                              {BADGE_RARITY_LABELS[badge.rarity]}
                            </span>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                              {badge.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Eigene Badges
                  </CardTitle>
                  <CardDescription>
                    Von Ihnen erstellte Badges für Ihre Schule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {customBadges.length === 0 ? (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Noch keine eigenen Badges erstellt.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setCreateDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Erstes Badge erstellen
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {customBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow group relative"
                          style={{ borderColor: badge.color + "40" }}
                        >
                          <button
                            onClick={() => handleDeleteBadge(badge.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                          <div className="text-center">
                            <span className="text-4xl">{badge.emoji}</span>
                            <p className="font-medium mt-2 text-sm">
                              {badge.name}
                            </p>
                            <span
                              className="text-xs px-2 py-0.5 rounded mt-1 inline-block"
                              style={{
                                backgroundColor: badge.color + "20",
                                color: badge.color,
                              }}
                            >
                              {BADGE_RARITY_LABELS[badge.rarity]}
                            </span>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                              {badge.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vergebene Badges nach Klasse</CardTitle>
                  <CardDescription>
                    Wählen Sie eine Klasse um die Badges der Schüler zu sehen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select value={viewingClass} onValueChange={setViewingClass}>
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Klasse auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {viewingClass && classStudentBadges.length === 0 && (
                      <p className="text-gray-500 text-center py-8">
                        Keine Schüler in dieser Klasse gefunden.
                      </p>
                    )}

                    {classStudentBadges.length > 0 && (
                      <div className="space-y-4">
                        {classStudentBadges.map((studentData) => (
                          <div
                            key={studentData.studentId}
                            className="p-4 border rounded-lg bg-white"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-medium">{studentData.studentName}</h3>
                              <span className="text-sm text-gray-500">
                                {studentData.badges.length} Badge
                                {studentData.badges.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {studentData.badges.length === 0 ? (
                              <p className="text-sm text-gray-400">
                                Noch keine Badges
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {studentData.badges.map((badge) => (
                                  <div
                                    key={badge.id}
                                    className="group relative inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm"
                                    style={{
                                      backgroundColor:
                                        BADGE_RARITY_COLORS[badge.badgeRarity] + "20",
                                    }}
                                    title={`${badge.badgeName} - ${badge.reason || "Automatisch"}`}
                                  >
                                    <span>{badge.badgeEmoji}</span>
                                    <span className="text-xs">{badge.badgeName}</span>
                                    {badge.awardedBy !== "system" && (
                                      <button
                                        onClick={() =>
                                          handleRevokeBadge(badge.id, studentData.studentId)
                                        }
                                        className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-red-200 rounded transition-opacity"
                                        title="Badge entfernen"
                                      >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
