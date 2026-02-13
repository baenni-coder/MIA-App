"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarRange,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Users,
  Edit2,
  Check,
  X,
  Clock,
  AlertCircle,
  Trash2,
  Settings2,
  PlusCircle,
  FolderOpen,
  FileArchive,
  Award,
  Lightbulb,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Teacher, Stufe, Schule, Kanton, KANTONE, SchoolChangeRequest } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// Verfügbare Dashboard-Kacheln
interface TileOption {
  path: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  buttonLabel: string;
  isExternal?: boolean;
}

const TILE_OPTIONS: TileOption[] = [
  {
    path: "/dashboard/jahresplan",
    label: "Jahresplan MIA",
    description: "Verwalten Sie Ihren MIA-Jahresplan im Kanban-Board",
    icon: <CalendarRange className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zum Jahresplan MIA",
  },
  {
    path: "/dashboard/jahresplanung",
    label: "Jahresplanung",
    description: "Planen Sie Ihren Unterricht über alle Fachbereiche",
    icon: <CalendarDays className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zur Jahresplanung",
  },
  {
    path: "/dashboard/lehrmittel",
    label: "Lehrmittel",
    description: "Übersicht über alle verfügbaren Lehrmittel und Materialien",
    icon: <BookOpen className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zu den Lehrmitteln",
  },
  {
    path: "/dashboard/lehrplan",
    label: "Lehrplan",
    description: "Lehrplan-Kompetenzen mit Unterrichtsideen",
    icon: <GraduationCap className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zum Lehrplan",
  },
  {
    path: "/dashboard/thema-erstellen",
    label: "Thema erstellen",
    description: "Eigene Unterrichtsthemen mit Lektionsplanung erstellen",
    icon: <PlusCircle className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Thema erstellen",
  },
  {
    path: "/dashboard/meine-themen",
    label: "Meine Themen",
    description: "Übersicht über Ihre eigenen Themen",
    icon: <FolderOpen className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zu meinen Themen",
  },
  {
    path: "/dashboard/dateien",
    label: "Schul-Dateien",
    description: "Dateien schulintern teilen und verwalten",
    icon: <FileArchive className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zu den Dateien",
  },
  {
    path: "/dashboard/klassen",
    label: "Meine Klassen",
    description: "Kompetenzenpass und Klassenverwaltung",
    icon: <Users className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zu meinen Klassen",
  },
  {
    path: "/dashboard/badges",
    label: "Badges",
    description: "Badges erstellen und an Schüler vergeben",
    icon: <Award className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zu den Badges",
  },
  {
    path: "/dashboard/statistiken",
    label: "Statistiken",
    description: "Statistiken zum Kompetenzenpass",
    icon: <BarChart3 className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zu den Statistiken",
  },
  {
    path: "/dashboard/faq",
    label: "FAQ",
    description: "Häufig gestellte Fragen und Antworten",
    icon: <HelpCircle className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "Zu den FAQ",
  },
  {
    path: "picts",
    label: "PICTS Buchungen",
    description: "Buchen Sie Unterstützung durch PICTS",
    icon: <Users className="h-8 w-8 text-primary mb-2" />,
    buttonLabel: "PICTS buchen",
    isExternal: true,
  },
];

const DEFAULT_TILES = [
  "/dashboard/jahresplan",
  "/dashboard/lehrmittel",
  "picts",
];

export default function DashboardPage() {
  const { user, getAuthToken } = useAuth();
  const router = useRouter();
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingStufe, setEditingStufe] = useState(false);
  const [newStufe, setNewStufe] = useState<Stufe | null>(null);
  const [saving, setSaving] = useState(false);

  // School editing
  const [editingSchule, setEditingSchule] = useState(false);
  const [newSchuleId, setNewSchuleId] = useState<string | null>(null);
  const [allSchulen, setAllSchulen] = useState<Schule[]>([]);
  const [loadingSchulen, setLoadingSchulen] = useState(false);

  // Kanton editing
  const [editingKanton, setEditingKanton] = useState(false);
  const [newKanton, setNewKanton] = useState<Kanton | null>(null);

  // Pending school change request
  const [pendingSchoolRequest, setPendingSchoolRequest] = useState<SchoolChangeRequest | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);

  // Dashboard tile configuration
  const [showTileSettings, setShowTileSettings] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<string[]>(DEFAULT_TILES);
  const [savingTiles, setSavingTiles] = useState(false);

  useEffect(() => {
    const loadTeacherData = async () => {
      if (!user) return;

      try {
        const token = await getAuthToken();
        if (!token) {
          console.error("No auth token available");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/teachers?userId=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setTeacherData(data);

        // Load dashboard tiles from profile
        if (data.dashboardTiles && Array.isArray(data.dashboardTiles)) {
          setSelectedTiles(data.dashboardTiles);
        }

        // Load pending school change request
        const reqRes = await fetch("/api/school-change-request", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setPendingSchoolRequest(reqData.request);
        }
      } catch (err) {
        console.error("Error loading teacher data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTeacherData();
  }, [user, getAuthToken]);

  // Load schools when editing starts
  const loadSchulen = async () => {
    if (allSchulen.length > 0) return; // Already loaded
    setLoadingSchulen(true);
    try {
      const res = await fetch("/api/schulen");
      if (res.ok) {
        const data = await res.json();
        setAllSchulen(data);
      }
    } catch (err) {
      console.error("Error loading schools:", err);
    } finally {
      setLoadingSchulen(false);
    }
  };

  const handleSaveStufe = async () => {
    if (!user || !newStufe) return;

    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }

      const response = await fetch("/api/teachers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          stufe: newStufe,
        }),
      });

      if (response.ok) {
        setTeacherData({ ...teacherData!, stufe: newStufe });
        setEditingStufe(false);
        setNewStufe(null);
      } else {
        console.error("Failed to update stufe");
      }
    } catch (error) {
      console.error("Error updating stufe:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchule = async () => {
    if (!user || !newSchuleId) return;

    // Find the selected school name for the request
    const selectedSchool = allSchulen.find((s) => s.id === newSchuleId);

    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }

      const response = await fetch("/api/teachers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          schuleId: newSchuleId,
          newSchuleName: selectedSchool?.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.schoolChangeRequestCreated) {
          // A school change request was created
          alert(data.message);
          // Load the pending request
          const reqRes = await fetch("/api/school-change-request", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (reqRes.ok) {
            const reqData = await reqRes.json();
            setPendingSchoolRequest(reqData.request);
          }
        } else {
          // Direct update (shouldn't happen with current logic, but handle it)
          const res = await fetch(`/api/teachers?userId=${user.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const teacherRes = await res.json();
            setTeacherData(teacherRes);
          }
        }
        setEditingSchule(false);
        setNewSchuleId(null);
      } else if (response.status === 409) {
        // Already has a pending request
        alert(data.error);
      } else {
        console.error("Failed to update school:", data.error);
        alert(data.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error updating school:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSchoolRequest = async () => {
    if (!user || !pendingSchoolRequest) return;

    setCancellingRequest(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `/api/school-change-request?requestId=${pendingSchoolRequest.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setPendingSchoolRequest(null);
        alert("Schulwechsel-Anfrage wurde storniert");
      } else {
        const data = await response.json();
        alert(data.error || "Fehler beim Stornieren");
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
    } finally {
      setCancellingRequest(false);
    }
  };

  const handleSaveKanton = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }

      const response = await fetch("/api/teachers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          kanton: newKanton,
        }),
      });

      if (response.ok) {
        setTeacherData({ ...teacherData!, kanton: newKanton || undefined });
        setEditingKanton(false);
        setNewKanton(null);
      } else {
        console.error("Failed to update kanton");
      }
    } catch (error) {
      console.error("Error updating kanton:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTiles = async (tiles: string[]) => {
    if (!user) return;

    setSavingTiles(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch("/api/teachers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          dashboardTiles: tiles,
        }),
      });

      if (response.ok) {
        setSelectedTiles(tiles);
        setTeacherData({ ...teacherData!, dashboardTiles: tiles });
        setShowTileSettings(false);
      }
    } catch (error) {
      console.error("Error saving tile settings:", error);
    } finally {
      setSavingTiles(false);
    }
  };

  // Active tiles based on user selection
  const activeTiles = selectedTiles
    .map((path) => TILE_OPTIONS.find((t) => t.path === path))
    .filter(Boolean) as TileOption[];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Willkommen zurück!
            </h2>
            <p className="text-muted-foreground mt-2">
              {teacherData ? `${teacherData.name} • ${teacherData.stufe}` : "Wird geladen..."}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeTiles.map((tile) => (
              <Card
                key={tile.path}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  if (tile.isExternal) {
                    if (teacherData?.schule?.pictsBuchen) {
                      window.open(teacherData.schule.pictsBuchen, "_blank");
                    }
                  } else {
                    router.push(tile.path);
                  }
                }}
              >
                <CardHeader>
                  {tile.icon}
                  <CardTitle>{tile.label}</CardTitle>
                  <CardDescription>{tile.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    {tile.buttonLabel}
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Kacheln konfigurieren */}
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer border-dashed"
              onClick={() => setShowTileSettings(true)}
            >
              <CardHeader>
                <Settings2 className="h-8 w-8 text-muted-foreground mb-2" />
                <CardTitle className="text-muted-foreground">Kacheln anpassen</CardTitle>
                <CardDescription>
                  Wählen Sie, welche Kacheln hier angezeigt werden
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Anpassen
                </Button>
              </CardContent>
            </Card>
          </div>

          {teacherData && (
            <Card>
              <CardHeader>
                <CardTitle>Mein Profil</CardTitle>
                <CardDescription>
                  Passen Sie Ihre Profil-Einstellungen an
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{teacherData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-Mail:</span>
                  <span className="font-medium">{teacherData.email}</span>
                </div>

                {/* Schule */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Schule:</span>
                    {editingSchule ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={newSchuleId || teacherData.schuleId}
                          onValueChange={(value) => setNewSchuleId(value)}
                          disabled={loadingSchulen}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder={loadingSchulen ? "Laden..." : "Schule wählen"} />
                          </SelectTrigger>
                          <SelectContent>
                            {allSchulen.map((schule) => (
                              <SelectItem key={schule.id} value={schule.id}>
                                {schule.name}{schule.ort ? ` (${schule.ort})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveSchule}
                          disabled={saving || !newSchuleId}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingSchule(false);
                            setNewSchuleId(null);
                          }}
                          disabled={saving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {teacherData.schule?.name || "Nicht zugewiesen"}
                          {teacherData.schule?.ort ? ` (${teacherData.schule.ort})` : ""}
                        </span>
                        {!pendingSchoolRequest && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingSchule(true);
                              loadSchulen();
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pending School Change Request */}
                  {pendingSchoolRequest && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-800">
                        Schulwechsel ausstehend
                      </AlertTitle>
                      <AlertDescription className="text-yellow-700">
                        <p className="mb-2">
                          Ihre Anfrage für einen Wechsel zu{" "}
                          <strong>{pendingSchoolRequest.newSchuleName}</strong>{" "}
                          wartet auf Genehmigung durch einen Super-Admin.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                          onClick={handleCancelSchoolRequest}
                          disabled={cancellingRequest}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Anfrage stornieren
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Kanton */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Kanton:</span>
                  {editingKanton ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={newKanton || teacherData.kanton || ""}
                        onValueChange={(value) => setNewKanton(value as Kanton)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Kanton wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {KANTONE.map((k) => (
                            <SelectItem key={k.value} value={k.value}>
                              {k.label} ({k.value})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveKanton}
                        disabled={saving}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingKanton(false);
                          setNewKanton(null);
                        }}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {teacherData.kanton
                          ? KANTONE.find((k) => k.value === teacherData.kanton)?.label || teacherData.kanton
                          : "Nicht gesetzt"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingKanton(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Stufe */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Stufe:</span>
                  {editingStufe ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={newStufe || teacherData.stufe}
                        onValueChange={(value) => setNewStufe(value as Stufe)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STUFEN.map((stufe) => (
                            <SelectItem key={stufe} value={stufe}>
                              {stufe}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveStufe}
                        disabled={saving || !newStufe}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingStufe(false);
                          setNewStufe(null);
                        }}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{teacherData.stufe}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingStufe(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kacheln-Einstellungen Dialog */}
        <TileSettingsDialog
          open={showTileSettings}
          onOpenChange={setShowTileSettings}
          selectedTiles={selectedTiles}
          onSave={handleSaveTiles}
          saving={savingTiles}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function TileSettingsDialog({
  open,
  onOpenChange,
  selectedTiles,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTiles: string[];
  onSave: (tiles: string[]) => void;
  saving: boolean;
}) {
  const [localTiles, setLocalTiles] = useState<string[]>(selectedTiles);

  // Sync with parent when dialog opens
  useEffect(() => {
    if (open) {
      setLocalTiles(selectedTiles);
    }
  }, [open, selectedTiles]);

  const toggleTile = (path: string) => {
    setLocalTiles((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dashboard-Kacheln anpassen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Wählen Sie die Kacheln, die auf Ihrem Dashboard angezeigt werden sollen.
          </p>
          <div className="space-y-2">
            {TILE_OPTIONS.map((tile) => {
              const isSelected = localTiles.includes(tile.path);
              return (
                <label
                  key={tile.path}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTile(tile.path)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tile.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tile.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocalTiles(DEFAULT_TILES)}
            >
              Standard wiederherstellen
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={() => onSave(localTiles)}
                disabled={saving || localTiles.length === 0}
              >
                {saving ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
