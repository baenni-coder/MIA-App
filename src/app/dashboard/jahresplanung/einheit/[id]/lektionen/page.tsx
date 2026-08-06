"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import LektionEditor from "@/components/LektionEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  BookOpen,
  Layers,
} from "lucide-react";
import type {
  CustomLektion,
  EinheitLektionsplanung,
  JahresplanEinheit,
} from "@/types";

export default function EinheitLektionenPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const einheitId = params.id as string;

  const [einheit, setEinheit] = useState<JahresplanEinheit | null>(null);
  const [planungen, setPlanungen] = useState<EinheitLektionsplanung[]>([]);
  const [lessonsByPlanung, setLessonsByPlanung] = useState<
    Record<string, CustomLektion[]>
  >({});
  const [loading, setLoading] = useState(true);

  // Dialog: Lektionsplanung erstellen/bearbeiten
  const [showPlanungDialog, setShowPlanungDialog] = useState(false);
  const [editingPlanung, setEditingPlanung] =
    useState<EinheitLektionsplanung | null>(null);
  const [planungName, setPlanungName] = useState("");
  const [planungBeschreibung, setPlanungBeschreibung] = useState("");
  const [savingPlanung, setSavingPlanung] = useState(false);

  // Dialog: Lektion erstellen/bearbeiten
  const [showLektionEditor, setShowLektionEditor] = useState(false);
  const [activePlanungId, setActivePlanungId] = useState<string | null>(null);
  const [editingLektion, setEditingLektion] = useState<CustomLektion | null>(
    null
  );

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const authHeader = useCallback(async () => {
    const token = await user?.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  // Lektionen einer Planung laden
  const loadLessons = useCallback(
    async (planungId: string) => {
      if (!user) return;
      try {
        const headers = await authHeader();
        const res = await fetch(
          `/api/custom-lektionen?lektionsplanungId=${planungId}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          setLessonsByPlanung((prev) => ({
            ...prev,
            [planungId]: data.lektionen || [],
          }));
        }
      } catch (error) {
        console.error("Error loading lessons:", error);
      }
    },
    [user, authHeader]
  );

  // Einheit + Planungen + Lektionen laden
  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await authHeader();

      const einheitRes = await fetch(`/api/jahresplanung/${einheitId}`, {
        headers,
      });
      if (einheitRes.ok) {
        const data = await einheitRes.json();
        setEinheit(data.einheit);
      } else if (einheitRes.status === 404) {
        alert("Einheit nicht gefunden");
        router.push("/dashboard/jahresplanung");
        return;
      }

      const planungRes = await fetch(
        `/api/jahresplanung/${einheitId}/lektionsplanungen`,
        { headers }
      );
      if (planungRes.ok) {
        const data = await planungRes.json();
        const list: EinheitLektionsplanung[] = data.lektionsplanungen || [];
        setPlanungen(list);
        // Lektionen aller Planungen parallel laden
        await Promise.all(list.map((p) => loadLessons(p.id)));
      }
    } catch (error) {
      console.error("Error loading einheit lektionen:", error);
    } finally {
      setLoading(false);
    }
  }, [user, einheitId, authHeader, loadLessons, router]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // --- Lektionsplanung Dialog ---
  const openNewPlanung = () => {
    setEditingPlanung(null);
    setPlanungName("");
    setPlanungBeschreibung("");
    setShowPlanungDialog(true);
  };

  const openEditPlanung = (p: EinheitLektionsplanung) => {
    setEditingPlanung(p);
    setPlanungName(p.name);
    setPlanungBeschreibung(p.beschreibung || "");
    setShowPlanungDialog(true);
  };

  const savePlanung = async () => {
    if (!planungName.trim()) {
      alert("Bitte einen Namen eingeben");
      return;
    }
    setSavingPlanung(true);
    try {
      const headers = {
        ...(await authHeader()),
        "Content-Type": "application/json",
      };
      const body = JSON.stringify({
        name: planungName.trim(),
        beschreibung: planungBeschreibung.trim(),
      });

      const url = editingPlanung
        ? `/api/jahresplanung/${einheitId}/lektionsplanungen/${editingPlanung.id}`
        : `/api/jahresplanung/${einheitId}/lektionsplanungen`;
      const method = editingPlanung ? "PUT" : "POST";

      const res = await fetch(url, { method, headers, body });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Speichern");
      }
      setShowPlanungDialog(false);
      await loadAll();
    } catch (error) {
      console.error("Error saving planung:", error);
      alert("Fehler beim Speichern: " + (error as Error).message);
    } finally {
      setSavingPlanung(false);
    }
  };

  const deletePlanung = async (p: EinheitLektionsplanung) => {
    if (
      !confirm(
        `Lektionsplanung "${p.name}" und alle darin enthaltenen Lektionen wirklich löschen?`
      )
    )
      return;
    setDeletingId(p.id);
    try {
      const headers = await authHeader();
      const res = await fetch(
        `/api/jahresplanung/${einheitId}/lektionsplanungen/${p.id}`,
        { method: "DELETE", headers }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Löschen");
      }
      await loadAll();
    } catch (error) {
      console.error("Error deleting planung:", error);
      alert("Fehler beim Löschen: " + (error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Lektion Dialog ---
  const openNewLektion = (planungId: string) => {
    setActivePlanungId(planungId);
    setEditingLektion(null);
    setShowLektionEditor(true);
  };

  const openEditLektion = (planungId: string, lektion: CustomLektion) => {
    setActivePlanungId(planungId);
    setEditingLektion(lektion);
    setShowLektionEditor(true);
  };

  const handleLektionSuccess = async () => {
    setShowLektionEditor(false);
    const planungId = activePlanungId;
    setEditingLektion(null);
    setActivePlanungId(null);
    if (planungId) await loadLessons(planungId);
  };

  const deleteLektion = async (planungId: string, lektionId: string) => {
    if (!confirm("Möchten Sie diese Lektion wirklich löschen?")) return;
    setDeletingId(lektionId);
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/custom-lektionen/${lektionId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Löschen");
      }
      await loadLessons(planungId);
    } catch (error) {
      console.error("Error deleting lektion:", error);
      alert("Fehler beim Löschen: " + (error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() =>
                router.push(
                  `/dashboard/jahresplanung/einheit/${einheitId}?schuljahr=${
                    einheit?.schuljahr || ""
                  }`
                )
              }
              className="mb-4"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Zurück zur Einheit
            </Button>

            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Layers className="h-7 w-7 text-blue-600" />
                  Lektionsplanungen
                </h1>
                {einheit && (
                  <p className="text-gray-600 mt-2">
                    Einheit: <strong>{einheit.titel}</strong>
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                  Eine Einheit kann mehrere Lektionsplanungen enthalten – z.B.
                  eine pro Fachaspekt oder eine integrative MIA-Planung. Jede
                  Planung hat ihre eigene Liste von Lektionen.
                </p>
              </div>
              <Button onClick={openNewPlanung}>
                <Plus className="mr-2 h-4 w-4" />
                Neue Lektionsplanung
              </Button>
            </div>
          </div>

          {/* Planungen */}
          {planungen.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Layers className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-4">
                  Noch keine Lektionsplanung angelegt.
                </p>
                <Button onClick={openNewPlanung}>
                  <Plus className="mr-2 h-4 w-4" />
                  Erste Lektionsplanung erstellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {planungen.map((planung) => {
                const lessons = lessonsByPlanung[planung.id] || [];
                return (
                  <Card key={planung.id} className="border-blue-100">
                    <CardHeader className="bg-blue-50/50 rounded-t-lg">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                            {planung.name}
                            <Badge variant="secondary" className="ml-1">
                              {lessons.length} Lektion
                              {lessons.length === 1 ? "" : "en"}
                            </Badge>
                          </CardTitle>
                          {planung.beschreibung && (
                            <p className="text-sm text-gray-600 mt-1">
                              {planung.beschreibung}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPlanung(planung)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deletePlanung(planung)}
                            disabled={deletingId === planung.id}
                          >
                            {deletingId === planung.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      {lessons.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          Noch keine Lektionen in dieser Planung.
                        </p>
                      ) : (
                        lessons.map((lektion) => (
                          <div
                            key={lektion.id}
                            className="border rounded-lg p-3"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline">
                                    {lektion.lektion}
                                  </Badge>
                                  <span className="font-medium">
                                    {lektion.eindeutigeBezeichnung}
                                  </span>
                                </div>
                                {lektion.kiZusammenfassung && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {lektion.kiZusammenfassung}
                                  </p>
                                )}
                                {lektion.material &&
                                  lektion.material.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {lektion.material.map((m) => (
                                        <Badge
                                          key={m}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {m}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    openEditLektion(planung.id, lektion)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    deleteLektion(planung.id, lektion.id)
                                  }
                                  disabled={deletingId === lektion.id}
                                >
                                  {deletingId === lektion.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openNewLektion(planung.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Neue Lektion
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Dialog: Lektionsplanung erstellen/bearbeiten */}
          <Dialog open={showPlanungDialog} onOpenChange={setShowPlanungDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPlanung
                    ? "Lektionsplanung bearbeiten"
                    : "Neue Lektionsplanung"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={planungName}
                    onChange={(e) => setPlanungName(e.target.value)}
                    placeholder="z.B. Lektionsplanung Deutsch"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Beschreibung</label>
                  <Textarea
                    value={planungBeschreibung}
                    onChange={(e) => setPlanungBeschreibung(e.target.value)}
                    placeholder="Optionale Kurzbeschreibung..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPlanungDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={savePlanung} disabled={savingPlanung}>
                  {savingPlanung && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Speichern
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Lektion erstellen/bearbeiten */}
          <Dialog open={showLektionEditor} onOpenChange={setShowLektionEditor}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLektion
                    ? "Lektion bearbeiten"
                    : "Neue Lektion erstellen"}
                </DialogTitle>
              </DialogHeader>
              {activePlanungId && (
                <LektionEditor
                  einheitId={einheitId}
                  lektionsplanungId={activePlanungId}
                  onSuccess={handleLektionSuccess}
                  onCancel={() => setShowLektionEditor(false)}
                  initialData={editingLektion || undefined}
                  mode={editingLektion ? "edit" : "create"}
                  lektionId={editingLektion?.id}
                  order={
                    (lessonsByPlanung[activePlanungId]?.length || 0) + 1
                  }
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
