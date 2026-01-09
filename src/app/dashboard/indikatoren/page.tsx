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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompetencyIndicator, Kompetenz, Teacher } from "@/types";
import {
  Star,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  CheckCircle2,
  Globe,
  Building,
} from "lucide-react";

export default function IndikatorenPage() {
  const { user, userProfile, getAuthToken } = useAuth();
  const teacherProfile = userProfile as Teacher | null;

  const [indicators, setIndicators] = useState<CompetencyIndicator[]>([]);
  const [competencies, setCompetencies] = useState<Kompetenz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<CompetencyIndicator | null>(null);
  const [deletingIndicator, setDeletingIndicator] = useState<CompetencyIndicator | null>(null);

  // Form states
  const [selectedCompetencyId, setSelectedCompetencyId] = useState("");
  const [star1, setStar1] = useState("");
  const [star2, setStar2] = useState("");
  const [star3, setStar3] = useState("");
  const [star4, setStar4] = useState("");
  const [star5, setStar5] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = teacherProfile?.role === "picts_admin" || teacherProfile?.role === "super_admin";

  // Load data
  const loadData = useCallback(async () => {
    if (!user || !teacherProfile) return;
    setLoading(true);

    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Load competencies and indicators in parallel
      const [compResponse, indResponse] = await Promise.all([
        fetch("/api/kompetenzen", { headers }),
        fetch(`/api/competency-indicators?schoolId=${teacherProfile.schuleId}`, { headers }),
      ]);

      if (compResponse.ok) {
        const data = await compResponse.json();
        setCompetencies(data.kompetenzen || []);
      }

      if (indResponse.ok) {
        const data = await indResponse.json();
        setIndicators(data.indicators || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, teacherProfile, getAuthToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset form
  const resetForm = () => {
    setSelectedCompetencyId("");
    setStar1("");
    setStar2("");
    setStar3("");
    setStar4("");
    setStar5("");
  };

  // Open create dialog
  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEdit = (indicator: CompetencyIndicator) => {
    setEditingIndicator(indicator);
    setStar1(indicator.indicators.star1);
    setStar2(indicator.indicators.star2);
    setStar3(indicator.indicators.star3);
    setStar4(indicator.indicators.star4);
    setStar5(indicator.indicators.star5);
    setEditDialogOpen(true);
  };

  // Create indicator
  const handleCreate = async () => {
    if (!selectedCompetencyId || !star1 || !star2 || !star3 || !star4 || !star5) {
      alert("Bitte fülle alle Felder aus");
      return;
    }

    const competency = competencies.find((c) => c.id === selectedCompetencyId);
    if (!competency) return;

    setSaving(true);

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/competency-indicators", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          competencyId: selectedCompetencyId,
          competencyName: competency.lpCode || competency.name || selectedCompetencyId,
          indicators: { star1, star2, star3, star4, star5 },
          schoolId: isAdmin ? undefined : teacherProfile?.schuleId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Erstellen");
      }

      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setSaving(false);
    }
  };

  // Update indicator
  const handleUpdate = async () => {
    if (!editingIndicator || !star1 || !star2 || !star3 || !star4 || !star5) {
      alert("Bitte fülle alle Felder aus");
      return;
    }

    setSaving(true);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/competency-indicators/${editingIndicator.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          indicators: { star1, star2, star3, star4, star5 },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Aktualisieren");
      }

      setEditDialogOpen(false);
      setEditingIndicator(null);
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setSaving(false);
    }
  };

  // Delete indicator
  const handleDelete = async () => {
    if (!deletingIndicator) return;

    setSaving(true);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/competency-indicators/${deletingIndicator.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      setDeleteDialogOpen(false);
      setDeletingIndicator(null);
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    } finally {
      setSaving(false);
    }
  };

  // Approve indicator as system-wide
  const handleApprove = async (indicator: CompetencyIndicator) => {
    if (!confirm("Möchtest du diesen Indikator für alle Schulen freigeben?")) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/competency-indicators/${indicator.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler bei der Freigabe");
      }

      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
    }
  };

  // Filter indicators
  const filteredIndicators = indicators.filter((ind) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ind.competencyName.toLowerCase().includes(query) ||
      ind.indicators.star1.toLowerCase().includes(query) ||
      ind.indicators.star5.toLowerCase().includes(query)
    );
  });

  // Get competencies that don't have indicators yet
  const existingCompetencyIds = new Set(indicators.map((i) => i.competencyId));
  const availableCompetencies = competencies.filter((c) => !existingCompetencyIds.has(c.id));

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Kompetenz-Indikatoren</h1>
              <p className="text-muted-foreground">
                Erstelle kindgerechte Beschreibungen für jede Kompetenzstufe
              </p>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Indikator erstellen
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Kompetenz oder Indikator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gesamt Indikatoren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{indicators.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Systemweit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {indicators.filter((i) => i.isSystemWide).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ohne Indikatoren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {competencies.length - existingCompetencyIds.size}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Indicators List */}
          {filteredIndicators.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Keine Indikatoren gefunden</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  {searchQuery
                    ? "Versuche einen anderen Suchbegriff"
                    : "Erstelle deinen ersten Indikator, um loszulegen"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredIndicators.map((indicator) => (
                <Card key={indicator.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {indicator.competencyName}
                          {indicator.isSystemWide ? (
                            <Badge variant="default" className="bg-blue-500">
                              <Globe className="h-3 w-3 mr-1" />
                              Systemweit
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Building className="h-3 w-3 mr-1" />
                              Schulspezifisch
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Erstellt von {indicator.createdByName}
                          {indicator.approvedByName && (
                            <> • Freigegeben von {indicator.approvedByName}</>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {isAdmin && !indicator.isSystemWide && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(indicator)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Freigeben
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(indicator)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeletingIndicator(indicator);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-16 flex items-center gap-1">
                            {Array.from({ length: star }).map((_, i) => (
                              <Star
                                key={i}
                                className="h-4 w-4 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                          <p className="text-sm">
                            {indicator.indicators[`star${star}` as keyof typeof indicator.indicators]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neuen Indikator erstellen</DialogTitle>
              <DialogDescription>
                Erstelle kindgerechte Beschreibungen für jede Stern-Stufe einer Kompetenz.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Kompetenz auswählen</Label>
                <Select value={selectedCompetencyId} onValueChange={setSelectedCompetencyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle eine Kompetenz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompetencies.map((comp) => (
                      <SelectItem key={comp.id} value={comp.id}>
                        <span className="font-medium">{comp.lpCode || comp.name}</span>
                        {comp.kompetenzstufe && (
                          <span className="text-muted-foreground ml-2 text-sm">
                            - {comp.kompetenzstufe.length > 60
                                ? comp.kompetenzstufe.substring(0, 60) + "..."
                                : comp.kompetenzstufe}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableCompetencies.length === 0 && (
                  <p className="text-sm text-amber-600">
                    Alle Kompetenzen haben bereits Indikatoren
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const value = star === 1 ? star1 : star === 2 ? star2 : star === 3 ? star3 : star === 4 ? star4 : star5;
                  const setValue = star === 1 ? setStar1 : star === 2 ? setStar2 : star === 3 ? setStar3 : star === 4 ? setStar4 : setStar5;
                  const placeholder = star === 1 ? "Ich habe davon gehört..." : star === 2 ? "Ich kann es mit Hilfe..." : star === 3 ? "Ich kann es selbständig..." : star === 4 ? "Ich kann es gut erklären..." : "Ich bin Experte...";

                  return (
                    <div key={star} className="space-y-1">
                      <Label className="flex items-center gap-2">
                        {Array.from({ length: star }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                        <span className="text-muted-foreground text-xs">
                          ({star} {star === 1 ? "Stern" : "Sterne"})
                        </span>
                      </Label>
                      <Textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        rows={2}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={saving || !selectedCompetencyId}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Indikator bearbeiten</DialogTitle>
              <DialogDescription>
                {editingIndicator?.competencyName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((star) => {
                const value = star === 1 ? star1 : star === 2 ? star2 : star === 3 ? star3 : star === 4 ? star4 : star5;
                const setValue = star === 1 ? setStar1 : star === 2 ? setStar2 : star === 3 ? setStar3 : star === 4 ? setStar4 : setStar5;

                return (
                  <div key={star} className="space-y-1">
                    <Label className="flex items-center gap-2">
                      {Array.from({ length: star }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </Label>
                    <Textarea
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      rows={2}
                    />
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Indikator löschen?</DialogTitle>
              <DialogDescription>
                Möchtest du den Indikator für &quot;{deletingIndicator?.competencyName}&quot; wirklich löschen?
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={saving}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
