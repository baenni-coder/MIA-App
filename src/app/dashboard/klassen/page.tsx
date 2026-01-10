"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchoolClass, Stufe, Teacher } from "@/types";
import {
  Plus,
  Users,
  GraduationCap,
  Trash2,
  Edit,
  Loader2,
  UserPlus,
  ArrowRightLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

export default function KlassenPage() {
  const { user, userProfile, getAuthToken, isAdmin } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  // Transfer Dialog State
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferClass, setTransferClass] = useState<SchoolClass | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);

  // Formular-State
  const [className, setClassName] = useState("");
  // Standard-Stufe aus Lehrer-Profil oder Fallback
  const teacherProfile = userProfile as Teacher | null;
  const defaultGrade: Stufe = teacherProfile?.stufe || "5. Klasse";
  const [classGrade, setClassGrade] = useState<Stufe>(defaultGrade);

  const loadClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/classes?teacherId=${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthToken]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Wenn sich das Profil ändert, Standard-Stufe aktualisieren
  useEffect(() => {
    if (teacherProfile?.stufe && !editingClass) {
      setClassGrade(teacherProfile.stufe);
    }
  }, [teacherProfile?.stufe, editingClass]);

  const resetForm = () => {
    setClassName("");
    setClassGrade(defaultGrade);
    setEditingClass(null);
    setError("");
  };

  // Lehrpersonen der gleichen Schule laden für Transfer
  const loadTeachersForTransfer = async () => {
    if (!user || !teacherProfile?.schuleId) return;
    setTeachersLoading(true);
    try {
      const token = await getAuthToken();
      // API-Endpunkt für Lehrpersonen der Schule
      const response = await fetch(`/api/teachers?schuleId=${teacherProfile.schuleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Eigene ID ausfiltern
        const teachers = (data.teachers || []).filter(
          (t: TeacherOption) => t.id !== user.uid
        );
        setAvailableTeachers(teachers);
      }
    } catch (error) {
      console.error("Error loading teachers:", error);
    } finally {
      setTeachersLoading(false);
    }
  };

  const handleOpenTransferDialog = (schoolClass: SchoolClass) => {
    setTransferClass(schoolClass);
    setSelectedTeacherId("");
    setTransferDialogOpen(true);
    loadTeachersForTransfer();
  };

  const handleTransferClass = async () => {
    if (!user || !transferClass || !selectedTeacherId) return;
    setTransferLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/classes/${transferClass.id}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newTeacherId: selectedTeacherId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler bei der Übergabe");
      }

      setTransferDialogOpen(false);
      setTransferClass(null);
      loadClasses();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleOpenDialog = (schoolClass?: SchoolClass) => {
    if (schoolClass) {
      setEditingClass(schoolClass);
      setClassName(schoolClass.name);
      setClassGrade(schoolClass.grade);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    try {
      const token = await getAuthToken();

      if (editingClass) {
        // Klasse aktualisieren
        const response = await fetch(`/api/classes/${editingClass.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: className,
            grade: classGrade,
            displayName: `${classGrade} ${className}`,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Fehler beim Aktualisieren");
        }
      } else {
        // Neue Klasse erstellen
        const response = await fetch("/api/classes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: className,
            grade: classGrade,
            displayName: `${classGrade} ${className}`,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Fehler beim Erstellen");
        }
      }

      handleCloseDialog();
      loadClasses();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("Klasse wirklich löschen? Dies ist nur möglich wenn keine Schüler mehr zugewiesen sind.")) {
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/classes/${classId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Fehler beim Löschen");
        return;
      }

      loadClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Fehler beim Löschen der Klasse");
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Meine Klassen</h1>
              <p className="text-muted-foreground">
                Verwalte deine Klassen und Schüler
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Klasse
            </Button>
          </div>

          {/* Dialog für Klasse erstellen/bearbeiten */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingClass ? "Klasse bearbeiten" : "Neue Klasse erstellen"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingClass
                        ? "Bearbeite die Klassendaten"
                        : "Erstelle eine neue Klasse für deine Schüler"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {error && (
                      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="className">Klassenbezeichnung</Label>
                      <Input
                        id="className"
                        placeholder="z.B. a, b, oder Müller"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Die Bezeichnung wird mit der Stufe kombiniert (z.B. &quot;5. Klasse a&quot;)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="classGrade">Klassenstufe</Label>
                      <Select
                        value={classGrade}
                        onValueChange={(value) => setClassGrade(value as Stufe)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Stufe auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {STUFEN.map((stufe) => (
                            <SelectItem key={stufe} value={stufe}>
                              {stufe}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {className && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm">
                          <span className="font-medium">Vorschau:</span>{" "}
                          {classGrade} {className}
                        </p>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                    >
                      Abbrechen
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingClass ? "Speichern" : "Erstellen"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Klassen-Liste */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Noch keine Klassen</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  Erstelle deine erste Klasse, um Schüler hinzuzufügen und den
                  Kompetenzenpass zu nutzen.
                </p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Klasse erstellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((schoolClass) => (
                <Card
                  key={schoolClass.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/klassen/${schoolClass.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {schoolClass.displayName || schoolClass.name}
                        </CardTitle>
                        <CardDescription>{schoolClass.grade}</CardDescription>
                      </div>
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(schoolClass)}
                          title="Bearbeiten"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenTransferDialog(schoolClass)}
                          title="Klasse übergeben"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(schoolClass.id)}
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {schoolClass.studentCount}{" "}
                        {schoolClass.studentCount === 1 ? "Schüler" : "Schüler"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Transfer Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Klasse übergeben</DialogTitle>
              <DialogDescription>
                Übergib die Klasse &quot;{transferClass?.displayName || transferClass?.name}&quot; an eine andere Lehrperson.
                Diese Person wird dann zum Klassenlehrer und kann die Klasse verwalten.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {teachersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableTeachers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Keine anderen Lehrpersonen in deiner Schule gefunden.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Neue Lehrperson auswählen</Label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={setSelectedTeacherId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Lehrperson wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTeacherId && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <strong>Hinweis:</strong> Nach der Übergabe hast du keinen Zugriff mehr auf diese Klasse,
                    es sei denn, du bist PICTS-Admin.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleTransferClass}
                disabled={transferLoading || !selectedTeacherId}
              >
                {transferLoading && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Übergeben
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
