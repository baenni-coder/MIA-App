"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SchoolClass, Student, ClassThemeProgress, Thema, PendingRating, CompetencyIndicator, StudentArtifact } from "@/types";
import TeacherArtifactViewer from "@/components/TeacherArtifactViewer";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Upload,
  Trash2,
  Edit,
  Loader2,
  Key,
  Mail,
  GraduationCap,
  Copy,
  Check,
  AlertCircle,
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  X,
  Clock,
  Star,
  Lightbulb,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface BulkImportResult {
  email: string;
  name: string;
  password: string;
  error?: string;
}

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: classId } = use(params);
  const router = useRouter();
  const { user, userProfile, getAuthToken } = useAuth();

  // Class data
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Add student dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");

  // Edit student dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Bulk import dialog
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkImportResult[] | null>(null);

  // Delete confirmation
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Password reset
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Theme progress state
  const [completedThemes, setCompletedThemes] = useState<ClassThemeProgress[]>([]);
  const [availableThemes, setAvailableThemes] = useState<Thema[]>([]);
  const [markThemeDialogOpen, setMarkThemeDialogOpen] = useState(false);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");
  const [markThemeLoading, setMarkThemeLoading] = useState<string | null>(null);
  const [unmarkThemeId, setUnmarkThemeId] = useState<string | null>(null);
  const [unmarkLoading, setUnmarkLoading] = useState(false);

  // Pending ratings state
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingRating, setAdjustingRating] = useState<PendingRating | null>(null);
  const [adjustedValue, setAdjustedValue] = useState(0);

  // Indicators for pending ratings (competencyId -> indicator)
  const [indicators, setIndicators] = useState<Record<string, CompetencyIndicator>>({});

  // Artifacts for pending ratings (studentId_competencyId -> artifacts)
  const [pendingArtifacts, setPendingArtifacts] = useState<Record<string, StudentArtifact[]>>({});
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);

  const loadClassData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getAuthToken();

      // Load class info
      const classResponse = await fetch(`/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!classResponse.ok) {
        if (classResponse.status === 404) {
          router.push("/dashboard/klassen");
          return;
        }
        throw new Error("Failed to load class");
      }

      const classData = await classResponse.json();
      setSchoolClass(classData.class);

      // Load students, completed themes, available themes, and pending ratings in parallel
      const [studentsResponse, themesResponse, availableResponse, pendingResponse] = await Promise.all([
        fetch(`/api/students?classId=${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/class-themes?classId=${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // Load themes for the class grade (grouped=true returns object with zeitraum keys)
        fetch(`/api/themen?stufe=${encodeURIComponent(classData.class.grade)}&grouped=true`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // Load pending ratings for this class
        fetch(`/api/pending-ratings?classId=${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStudents(studentsData.students || []);
      }

      if (themesResponse.ok) {
        const themesData = await themesResponse.json();
        setCompletedThemes(themesData.themes || []);
      }

      if (availableResponse.ok) {
        const availableData = await availableResponse.json();
        // Flatten grouped themes into a single array
        const allThemes: Thema[] = [];
        if (availableData && typeof availableData === "object") {
          Object.values(availableData).forEach((group) => {
            if (Array.isArray(group)) {
              allThemes.push(...group);
            }
          });
        }
        setAvailableThemes(allThemes);
      }

      let loadedPendingRatings: PendingRating[] = [];
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        loadedPendingRatings = pendingData.pendingRatings || [];
        setPendingRatings(loadedPendingRatings);
      }

      // Fetch indicators for pending rating competencies
      if (loadedPendingRatings.length > 0) {
        const competencyIds = [...new Set(loadedPendingRatings.map((pr) => pr.competencyId))].join(",");
        const indicatorsResponse = await fetch(
          `/api/competency-indicators?competencyIds=${competencyIds}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (indicatorsResponse.ok) {
          const indicatorsData = await indicatorsResponse.json();
          setIndicators(indicatorsData.indicators || {});
        }

        // Fetch artifacts for each pending rating (student + competency combination)
        setLoadingArtifacts(true);
        const artifactsMap: Record<string, StudentArtifact[]> = {};
        await Promise.all(
          loadedPendingRatings.map(async (pr) => {
            const key = `${pr.studentId}_${pr.competencyId}`;
            const artifactsResponse = await fetch(
              `/api/student-artifacts?studentId=${pr.studentId}&competencyId=${pr.competencyId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (artifactsResponse.ok) {
              const artifactsData = await artifactsResponse.json();
              artifactsMap[key] = artifactsData.artifacts || [];
            }
          })
        );
        setPendingArtifacts(artifactsMap);
        setLoadingArtifacts(false);
      }
    } catch (error) {
      console.error("Error loading class data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, classId, getAuthToken, router]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Add single student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    setNewStudentPassword("");

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: studentEmail,
          name: studentName,
          classId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Erstellen");
      }

      setNewStudentPassword(data.password);
      loadClassData();
    } catch (error: unknown) {
      setAddError(
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setAddLoading(false);
    }
  };

  const resetAddDialog = () => {
    setStudentName("");
    setStudentEmail("");
    setAddError("");
    setNewStudentPassword("");
    setAddDialogOpen(false);
  };

  // Edit student
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditDialogOpen(true);
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditLoading(true);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }

      setEditDialogOpen(false);
      setEditingStudent(null);
      loadClassData();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setEditLoading(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async () => {
    if (!deleteStudentId) return;
    setDeleteLoading(true);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/students/${deleteStudentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      setDeleteStudentId(null);
      loadClassData();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!resetPasswordId) return;
    setResetLoading(true);
    setNewPassword("");

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/students/${resetPasswordId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "resetPassword" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Zurücksetzen");
      }

      setNewPassword(data.password);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
      setResetPasswordId(null);
    } finally {
      setResetLoading(false);
    }
  };

  // Bulk import
  const handleBulkImport = async () => {
    setBulkLoading(true);
    setBulkResults(null);

    try {
      // Parse input: "Name, Email" or "Name\tEmail" per line
      const lines = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const students = lines.map((line) => {
        const parts = line.includes("\t")
          ? line.split("\t")
          : line.split(",").map((p) => p.trim());
        return {
          name: parts[0]?.trim() || "",
          email: parts[1]?.trim() || "",
        };
      }).filter((s) => s.name && s.email);

      if (students.length === 0) {
        alert("Keine gültigen Schüler-Daten gefunden. Format: Name, Email");
        setBulkLoading(false);
        return;
      }

      const token = await getAuthToken();
      const response = await fetch("/api/students/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ students, classId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Import");
      }

      // Combine successful and failed results
      const allResults = [
        ...(data.successful || []),
        ...(data.failed || []),
      ];
      setBulkResults(allResults);
      loadClassData();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setBulkLoading(false);
    }
  };

  const resetBulkDialog = () => {
    setBulkText("");
    setBulkResults(null);
    setBulkDialogOpen(false);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Mark theme as completed
  const handleMarkTheme = async (theme: Thema) => {
    if (!schoolClass) return;
    setMarkThemeLoading(theme.id);

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/class-themes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId,
          themeId: theme.id,
          themeName: theme.thema,
          themeDescription: theme.beschreibung,
          competencyIds: theme.kompetenzen?.map((k) => k.id) || [],
          competencyNames: theme.kompetenzen?.map((k) => k.name || k.lpCode || "Unbekannt") || [],
          zeitraum: theme.zeitraum,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || "Fehler beim Markieren";
        throw new Error(errorMsg);
      }

      loadClassData();
      setMarkThemeDialogOpen(false);
      setThemeSearchQuery("");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setMarkThemeLoading(null);
    }
  };

  // Unmark theme
  const handleUnmarkTheme = async () => {
    if (!unmarkThemeId) return;
    setUnmarkLoading(true);

    try {
      const token = await getAuthToken();
      const response = await fetch(
        `/api/class-themes?classId=${classId}&themeId=${unmarkThemeId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Entfernen");
      }

      setUnmarkThemeId(null);
      loadClassData();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setUnmarkLoading(false);
    }
  };

  // Confirm a pending rating (accept student's rating)
  const handleConfirmRating = async (pendingRating: PendingRating) => {
    setConfirmingId(pendingRating.id);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/pending-ratings/${pendingRating.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "confirm" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Bestätigen");
      }

      // Remove from local state
      setPendingRatings((prev) => prev.filter((pr) => pr.id !== pendingRating.id));
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setConfirmingId(null);
    }
  };

  // Open adjust dialog
  const handleOpenAdjustDialog = (pendingRating: PendingRating) => {
    setAdjustingRating(pendingRating);
    setAdjustedValue(pendingRating.studentRating);
    setAdjustDialogOpen(true);
  };

  // Adjust a pending rating (change to different rating)
  const handleAdjustRating = async () => {
    if (!adjustingRating) return;
    setConfirmingId(adjustingRating.id);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/pending-ratings/${adjustingRating.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "adjust",
          teacherRating: adjustedValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Anpassen");
      }

      // Remove from local state
      setPendingRatings((prev) => prev.filter((pr) => pr.id !== adjustingRating.id));
      setAdjustDialogOpen(false);
      setAdjustingRating(null);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setConfirmingId(null);
    }
  };

  // Confirm all pending ratings
  const handleConfirmAll = async () => {
    if (pendingRatings.length === 0) return;

    const confirmAll = confirm(
      `Möchtest du wirklich alle ${pendingRatings.length} Bewertungen bestätigen?`
    );
    if (!confirmAll) return;

    setConfirmingId("all");

    try {
      const token = await getAuthToken();

      // Confirm each rating one by one
      for (const pr of pendingRatings) {
        await fetch(`/api/pending-ratings/${pr.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "confirm" }),
        });
      }

      // Clear all from local state
      setPendingRatings([]);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
      loadClassData(); // Reload to get current state
    } finally {
      setConfirmingId(null);
    }
  };

  // Handle artifact comment added
  const handleArtifactCommentAdded = (studentId: string, competencyId: string, artifactId: string, comment: string) => {
    const key = `${studentId}_${competencyId}`;
    setPendingArtifacts((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((a) =>
        a.id === artifactId
          ? { ...a, teacherComment: comment, teacherCommentByName: userProfile?.name || "Lehrperson" }
          : a
      ),
    }));
  };

  // Handle artifact comment removed
  const handleArtifactCommentRemoved = (studentId: string, competencyId: string, artifactId: string) => {
    const key = `${studentId}_${competencyId}`;
    setPendingArtifacts((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((a) =>
        a.id === artifactId
          ? { ...a, teacherComment: undefined, teacherCommentBy: undefined, teacherCommentByName: undefined }
          : a
      ),
    }));
  };

  // Filter themes for marking
  const completedThemeIds = new Set(completedThemes.map((t) => t.themeId));
  const filteredThemesForMarking = availableThemes.filter((theme) => {
    // Exclude already completed
    if (completedThemeIds.has(theme.id)) return false;
    // Apply search filter
    if (themeSearchQuery) {
      const query = themeSearchQuery.toLowerCase();
      return (
        theme.thema?.toLowerCase().includes(query) ||
        theme.beschreibung?.toLowerCase().includes(query) ||
        theme.lehrmittel?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!schoolClass) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Klasse nicht gefunden</p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/klassen")}>
              Zurück zur Übersicht
            </Button>
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/klassen")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {schoolClass.displayName || schoolClass.name}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                {schoolClass.grade}
                <span className="mx-2">•</span>
                <Users className="h-4 w-4" />
                {students.length} {students.length === 1 ? "Schüler:in" : "Schüler:innen"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk-Import
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Schüler:in hinzufügen
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={pendingRatings.length > 0 ? "confirmations" : "students"} className="space-y-4">
            <TabsList>
              <TabsTrigger value="confirmations" className="gap-2">
                <Clock className="h-4 w-4" />
                Bestätigungen
                {pendingRatings.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {pendingRatings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="students" className="gap-2">
                <Users className="h-4 w-4" />
                Schüler:innen ({students.length})
              </TabsTrigger>
              <TabsTrigger value="themes" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Bearbeitete Themen ({completedThemes.length})
              </TabsTrigger>
            </TabsList>

            {/* Confirmations Tab */}
            <TabsContent value="confirmations">
              {pendingRatings.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">Alles bestätigt!</h3>
                    <p className="text-muted-foreground text-center max-w-sm mt-2">
                      Es gibt keine ausstehenden Bewertungen zur Bestätigung.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Ausstehende Bestätigungen</CardTitle>
                      <CardDescription>
                        {pendingRatings.length} Bewertung{pendingRatings.length !== 1 && "en"} warten auf deine Bestätigung
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleConfirmAll}
                      disabled={confirmingId === "all"}
                    >
                      {confirmingId === "all" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Alle bestätigen
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingRatings.map((pr) => {
                        const artifactKey = `${pr.studentId}_${pr.competencyId}`;
                        const artifacts = pendingArtifacts[artifactKey] || [];
                        return (
                          <div
                            key={pr.id}
                            className="p-4 border rounded-lg bg-amber-50 border-amber-200 space-y-3"
                          >
                            {/* Header with student info and buttons */}
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{pr.studentName}</span>
                                  <Badge variant="outline">{pr.competencyName}</Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>Selbstbewertung:</span>
                                  <span className="text-amber-600 font-medium">
                                    {"⭐".repeat(pr.studentRating)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenAdjustDialog(pr)}
                                  disabled={confirmingId === pr.id}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Anpassen
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmRating(pr)}
                                  disabled={confirmingId === pr.id}
                                >
                                  {confirmingId === pr.id ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4 mr-1" />
                                  )}
                                  Bestätigen
                                </Button>
                              </div>
                            </div>

                            {/* Artifacts section */}
                            {artifacts.length > 0 && (
                              <div className="pt-3 border-t border-amber-200">
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <Upload className="h-4 w-4" />
                                  Belege ({artifacts.length})
                                </h4>
                                <TeacherArtifactViewer
                                  artifacts={artifacts}
                                  onCommentAdded={(artifactId, comment) =>
                                    handleArtifactCommentAdded(pr.studentId, pr.competencyId, artifactId, comment)
                                  }
                                  onCommentRemoved={(artifactId) =>
                                    handleArtifactCommentRemoved(pr.studentId, pr.competencyId, artifactId)
                                  }
                                  getAuthToken={getAuthToken}
                                  teacherName={userProfile?.name || "Lehrperson"}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students">
              {students.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Noch keine Schüler:innen</h3>
                    <p className="text-muted-foreground text-center max-w-sm mt-2">
                      Füge Schüler:innen einzeln hinzu oder nutze den Bulk-Import für
                      mehrere auf einmal.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk-Import
                      </Button>
                      <Button onClick={() => setAddDialogOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Schüler:in hinzufügen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Schüler:innen</CardTitle>
                    <CardDescription>
                      Verwalte die Schüler:innen dieser Klasse
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Name</th>
                            <th className="px-4 py-3 text-left font-medium">E-Mail</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                            <th className="px-4 py-3 text-right font-medium">Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, idx) => (
                            <tr
                              key={student.id}
                              className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}
                            >
                              <td className="px-4 py-3 font-medium">{student.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  {student.email}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {student.lastActive ? (
                                  <Badge variant="default">Aktiv</Badge>
                                ) : (
                                  <Badge variant="secondary">Noch nie angemeldet</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(student)}
                                    title="Bearbeiten"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setResetPasswordId(student.id)}
                                    title="Passwort zurücksetzen"
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteStudentId(student.id)}
                                    title="Löschen"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Themes Tab */}
            <TabsContent value="themes">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Bearbeitete Themen</CardTitle>
                    <CardDescription>
                      Markiere Themen, die ihr im Unterricht behandelt habt. Diese werden den Schüler:innen angezeigt.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setMarkThemeDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thema markieren
                  </Button>
                </CardHeader>
                <CardContent>
                  {completedThemes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Noch keine Themen markiert</h3>
                      <p className="text-muted-foreground text-center max-w-sm mt-2">
                        Markiere Themen als bearbeitet, damit deine Schüler:innen sehen können, welche Kompetenzen sie schon trainiert haben.
                      </p>
                      <Button className="mt-4" onClick={() => setMarkThemeDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Erstes Thema markieren
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedThemes.map((theme) => (
                        <div
                          key={theme.id}
                          className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <h3 className="font-medium">{theme.themeName}</h3>
                            </div>
                            {theme.themeDescription && (
                              <p className="text-sm text-muted-foreground line-clamp-2 ml-7">
                                {theme.themeDescription}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 ml-7 text-xs text-muted-foreground">
                              <span>
                                Markiert am{" "}
                                {new Date(theme.markedCompletedAt).toLocaleDateString("de-CH")}
                              </span>
                              <span>{theme.competencyIds.length} Kompetenzen</span>
                              {theme.zeitraum && (
                                <Badge variant="outline" className="text-xs">
                                  {theme.zeitraum}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setUnmarkThemeId(theme.themeId)}
                            title="Markierung entfernen"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Add Student Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={(open) => !open && resetAddDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schüler:in hinzufügen</DialogTitle>
              <DialogDescription>
                Erstelle einen neuen Schüler-Account für diese Klasse.
              </DialogDescription>
            </DialogHeader>

            {newStudentPassword ? (
              // Success state - show password
              <div className="space-y-4 py-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium mb-2">
                    ✓ Schüler:in erfolgreich erstellt!
                  </p>
                  <p className="text-sm text-green-700 mb-4">
                    Bitte notiere das Passwort - es wird nur einmal angezeigt:
                  </p>
                  <div className="flex items-center gap-2 bg-white p-3 rounded border">
                    <code className="flex-1 font-mono text-lg">{newStudentPassword}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newStudentPassword, "new")}
                    >
                      {copiedId === "new" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={resetAddDialog}>Fertig</Button>
                </DialogFooter>
              </div>
            ) : (
              // Form state
              <form onSubmit={handleAddStudent}>
                <div className="space-y-4 py-4">
                  {addError && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {addError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="studentName">Name</Label>
                    <Input
                      id="studentName"
                      placeholder="Max Mustermann"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentEmail">E-Mail</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      placeholder="max.mustermann@schule.ch"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      required
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Ein sicheres Passwort wird automatisch generiert und nach dem
                    Erstellen angezeigt.
                  </p>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-800">
                      Bitte stellen Sie sicher, dass die Einwilligung der Erziehungsberechtigten zur Datenverarbeitung vorliegt, bevor Sie Schüler-Accounts erstellen.
                      Weitere Informationen finden Sie in unserer{" "}
                      <a href="/datenschutz" target="_blank" className="underline">Datenschutzerklärung</a>.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetAddDialog}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={addLoading}>
                    {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Erstellen
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleEditStudent}>
              <DialogHeader>
                <DialogTitle>Schüler:in bearbeiten</DialogTitle>
                <DialogDescription>
                  Bearbeite die Daten von {editingStudent?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input value={editingStudent?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">
                    Die E-Mail-Adresse kann nicht geändert werden.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Speichern
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Adjust Rating Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bewertung anpassen</DialogTitle>
              <DialogDescription>
                {adjustingRating && (
                  <>
                    Passe die Bewertung von <strong>{adjustingRating.studentName}</strong> für{" "}
                    <strong>{adjustingRating.competencyName}</strong> an.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {adjustingRating && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    Schüler-Selbstbewertung:{" "}
                    <span className="font-medium">{"⭐".repeat(adjustingRating.studentRating)}</span>
                  </p>
                </div>

                {/* Show indicator if available */}
                {indicators[adjustingRating.competencyId] && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Stern-Beschreibungen
                    </h4>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {[1, 2, 3, 4, 5].map((starLevel) => {
                        const indicator = indicators[adjustingRating.competencyId];
                        const indicatorKey = `star${starLevel}` as keyof typeof indicator.indicators;
                        const description = indicator.indicators[indicatorKey];
                        return (
                          <div
                            key={starLevel}
                            className={`flex gap-2 items-start p-2 rounded-lg text-xs ${
                              adjustedValue === starLevel
                                ? "bg-blue-100 border border-blue-200"
                                : "bg-muted/50"
                            }`}
                          >
                            <div className="flex gap-0.5 pt-0.5 shrink-0">
                              {[...Array(starLevel)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400"
                                />
                              ))}
                            </div>
                            <p className="text-muted-foreground">{description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Deine Bewertung</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        type="button"
                        variant={adjustedValue === rating ? "default" : "outline"}
                        size="lg"
                        className="flex-1"
                        onClick={() => setAdjustedValue(rating)}
                      >
                        <Star
                          className={`h-5 w-5 ${
                            adjustedValue >= rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Gewählt: {"⭐".repeat(adjustedValue)}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAdjustDialogOpen(false)}
                disabled={!!confirmingId}
              >
                Abbrechen
              </Button>
              <Button onClick={handleAdjustRating} disabled={!!confirmingId}>
                {confirmingId ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Bewertung speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteStudentId} onOpenChange={() => setDeleteStudentId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schüler:in löschen?</DialogTitle>
              <DialogDescription>
                Möchtest du diese:n Schüler:in wirklich löschen? Der Account und alle
                zugehörigen Daten werden unwiderruflich gelöscht.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteStudentId(null)}
                disabled={deleteLoading}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteStudent}
                disabled={deleteLoading}
              >
                {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog
          open={!!resetPasswordId}
          onOpenChange={() => {
            setResetPasswordId(null);
            setNewPassword("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Passwort zurücksetzen</DialogTitle>
              <DialogDescription>
                {newPassword
                  ? "Das neue Passwort wurde generiert."
                  : "Möchtest du das Passwort dieses Schülers zurücksetzen?"}
              </DialogDescription>
            </DialogHeader>

            {newPassword ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 mb-3">
                    Bitte notiere das neue Passwort:
                  </p>
                  <div className="flex items-center gap-2 bg-white p-3 rounded border">
                    <code className="flex-1 font-mono text-lg">{newPassword}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newPassword, "reset")}
                    >
                      {copiedId === "reset" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setResetPasswordId(null);
                      setNewPassword("");
                    }}
                  >
                    Fertig
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setResetPasswordId(null)}
                  disabled={resetLoading}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleResetPassword} disabled={resetLoading}>
                  {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Passwort zurücksetzen
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={bulkDialogOpen} onOpenChange={(open) => !open && resetBulkDialog()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schüler:innen importieren</DialogTitle>
              <DialogDescription>
                Importiere mehrere Schüler:innen auf einmal. Ein Passwort wird automatisch
                für jeden Schüler generiert.
              </DialogDescription>
            </DialogHeader>

            {bulkResults ? (
              // Results state
              <div className="space-y-4 py-4">
                <div className="max-h-[400px] overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">E-Mail</th>
                        <th className="px-3 py-2 text-left">Passwort</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((result, idx) => (
                        <tr
                          key={idx}
                          className={result.error ? "bg-red-50" : "bg-green-50"}
                        >
                          <td className="px-3 py-2">
                            {result.error ? (
                              <Badge variant="destructive">Fehler</Badge>
                            ) : (
                              <Badge variant="default">OK</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">{result.name}</td>
                          <td className="px-3 py-2">{result.email}</td>
                          <td className="px-3 py-2">
                            {result.error ? (
                              <span className="text-red-600 text-xs">{result.error}</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <code className="font-mono">{result.password}</code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    copyToClipboard(result.password, `bulk-${idx}`)
                                  }
                                >
                                  {copiedId === `bulk-${idx}` ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {bulkResults.filter((r) => !r.error).length} von {bulkResults.length}{" "}
                    erfolgreich importiert
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Copy all passwords
                      const text = bulkResults
                        .filter((r) => !r.error)
                        .map((r) => `${r.name}\t${r.email}\t${r.password}`)
                        .join("\n");
                      copyToClipboard(text, "all");
                    }}
                  >
                    {copiedId === "all" ? (
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Alle kopieren
                  </Button>
                </div>

                <DialogFooter>
                  <Button onClick={resetBulkDialog}>Fertig</Button>
                </DialogFooter>
              </div>
            ) : (
              // Input state
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Schülerliste (Name, E-Mail pro Zeile)</Label>
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`Max Mustermann, max@schule.ch
Anna Beispiel, anna@schule.ch
Tom Test, tom@schule.ch`}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: Name, E-Mail (kommagetrennt) oder Name[Tab]E-Mail
                    (Tab-getrennt, z.B. aus Excel)
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    Bitte stellen Sie sicher, dass die Einwilligung der Erziehungsberechtigten zur Datenverarbeitung vorliegt.{" "}
                    <a href="/datenschutz" target="_blank" className="underline">Datenschutzerklärung</a>
                  </p>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={resetBulkDialog}>
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleBulkImport}
                    disabled={bulkLoading || !bulkText.trim()}
                  >
                    {bulkLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Importieren
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Mark Theme Dialog */}
        <Dialog
          open={markThemeDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setMarkThemeDialogOpen(false);
              setThemeSearchQuery("");
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Thema als bearbeitet markieren</DialogTitle>
              <DialogDescription>
                Wähle ein Thema aus, das ihr im Unterricht behandelt habt.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Thema suchen..."
                  value={themeSearchQuery}
                  onChange={(e) => setThemeSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Theme List */}
              <div className="flex-1 overflow-auto border rounded-lg">
                {filteredThemesForMarking.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mb-2" />
                    <p className="text-sm">
                      {themeSearchQuery
                        ? "Keine Themen gefunden"
                        : "Alle Themen wurden bereits markiert"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredThemesForMarking.map((theme) => (
                      <div
                        key={theme.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{theme.thema}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {theme.lehrmittel && (
                              <Badge variant="outline" className="text-xs">
                                {theme.lehrmittel}
                              </Badge>
                            )}
                            {theme.zeitraum && (
                              <Badge variant="secondary" className="text-xs">
                                {theme.zeitraum}
                              </Badge>
                            )}
                            {theme.anzahlLektionen && (
                              <span>{theme.anzahlLektionen} Lektionen</span>
                            )}
                            {theme.kompetenzen && theme.kompetenzen.length > 0 && (
                              <span>{theme.kompetenzen.length} Kompetenzen</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleMarkTheme(theme)}
                          disabled={markThemeLoading === theme.id}
                        >
                          {markThemeLoading === theme.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Markieren
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unmark Theme Confirmation */}
        <Dialog open={!!unmarkThemeId} onOpenChange={() => setUnmarkThemeId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Markierung entfernen?</DialogTitle>
              <DialogDescription>
                Möchtest du die Markierung für dieses Thema wirklich entfernen?
                Die Schüler:innen sehen dann nicht mehr, dass dieses Thema bearbeitet wurde.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUnmarkThemeId(null)}
                disabled={unmarkLoading}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleUnmarkTheme}
                disabled={unmarkLoading}
              >
                {unmarkLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Entfernen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
