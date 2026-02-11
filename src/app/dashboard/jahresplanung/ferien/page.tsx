"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Trash2,
  Pencil,
  Download,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import {
  getAktuellesSchuljahr,
  getSchuljahrListe,
  getFerienPresets,
  getFerien,
} from "@/lib/data/lp21-data";
import type { SchulferienCustom } from "@/types";

// Ferien-Preset Typen
interface FerienEntry {
  id?: string;
  ferienName: string;
  start: string;
  ende: string;
  isPreset: boolean; // true = aus schulkalender.json, false = benutzerdefiniert
}

export default function FerienVerwaltungPage() {
  const { user } = useAuth();
  const [schuljahr, setSchuljahr] = useState(getAktuellesSchuljahr());
  const [selectedPreset, setSelectedPreset] = useState("SO_BeLoSe");
  const [customFerien, setCustomFerien] = useState<SchulferienCustom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog-State
  const [showDialog, setShowDialog] = useState(false);
  const [editingFerien, setEditingFerien] = useState<SchulferienCustom | null>(
    null
  );
  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnde, setFormEnde] = useState("");

  const schuljahrListe = useMemo(() => getSchuljahrListe(4), []);
  const presets = useMemo(() => getFerienPresets(), []);

  // Benutzerdefinierte Ferien laden
  useEffect(() => {
    async function fetchCustomFerien() {
      if (!user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/jahresplanung/ferien?schuljahr=${encodeURIComponent(schuljahr)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCustomFerien(data.ferien || []);
        }
      } catch (error) {
        console.error("Error fetching custom ferien:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomFerien();
  }, [user, schuljahr]);

  // Preset-Ferien für das Schuljahr
  const presetFerien: FerienEntry[] = useMemo(() => {
    const ferien = getFerien(selectedPreset, schuljahr);
    if (!ferien) return [];

    return Object.entries(ferien).map(([, data]) => ({
      ferienName: data.label,
      start: data.start,
      ende: data.ende,
      isPreset: true,
    }));
  }, [selectedPreset, schuljahr]);

  // Alle Ferien zusammenführen (Custom überschreibt Preset)
  const allFerien: FerienEntry[] = useMemo(() => {
    const result: FerienEntry[] = [];

    // Erst Preset-Ferien hinzufügen
    presetFerien.forEach((preset) => {
      // Prüfen ob es eine Custom-Variante gibt
      const customOverride = customFerien.find(
        (c) =>
          c.ferienName.toLowerCase() === preset.ferienName.toLowerCase()
      );

      if (customOverride) {
        result.push({
          id: customOverride.id,
          ferienName: customOverride.ferienName,
          start: customOverride.start,
          ende: customOverride.ende,
          isPreset: false,
        });
      } else {
        result.push(preset);
      }
    });

    // Dann zusätzliche Custom-Ferien hinzufügen (die nicht ein Preset überschreiben)
    customFerien
      .filter(
        (c) =>
          !presetFerien.some(
            (p) =>
              p.ferienName.toLowerCase() === c.ferienName.toLowerCase()
          )
      )
      .forEach((c) => {
        result.push({
          id: c.id,
          ferienName: c.ferienName,
          start: c.start,
          ende: c.ende,
          isPreset: false,
        });
      });

    // Nach Startdatum sortieren
    return result.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }, [presetFerien, customFerien]);

  // Ferientage berechnen
  function calculateDays(start: string, ende: string): number {
    const startDate = new Date(start);
    const endDate = new Date(ende);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Datum formatieren
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-CH", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Dialog öffnen (neu oder bearbeiten)
  const openDialog = (ferien?: FerienEntry) => {
    if (ferien && !ferien.isPreset) {
      // Bearbeiten
      setEditingFerien(
        customFerien.find((c) => c.id === ferien.id) || null
      );
      setFormName(ferien.ferienName);
      setFormStart(ferien.start);
      setFormEnde(ferien.ende);
    } else if (ferien && ferien.isPreset) {
      // Preset überschreiben
      setEditingFerien(null);
      setFormName(ferien.ferienName);
      setFormStart(ferien.start);
      setFormEnde(ferien.ende);
    } else {
      // Neu
      setEditingFerien(null);
      setFormName("");
      setFormStart("");
      setFormEnde("");
    }
    setShowDialog(true);
  };

  // Ferien speichern
  const handleSave = async () => {
    if (!user || !formName || !formStart || !formEnde) {
      alert("Bitte füllen Sie alle Felder aus");
      return;
    }

    if (new Date(formStart) > new Date(formEnde)) {
      alert("Das Startdatum muss vor dem Enddatum liegen");
      return;
    }

    try {
      setSaving(true);
      const token = await user.getIdToken();

      if (editingFerien) {
        // Bearbeiten
        const response = await fetch("/api/jahresplanung/ferien", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingFerien.id,
            ferienName: formName,
            start: formStart,
            ende: formEnde,
          }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Aktualisieren");
        }
      } else {
        // Neu erstellen
        const response = await fetch("/api/jahresplanung/ferien", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schuljahr,
            ferienName: formName,
            start: formStart,
            ende: formEnde,
          }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Erstellen");
        }
      }

      // Neu laden
      setShowDialog(false);
      const response = await fetch(
        `/api/jahresplanung/ferien?schuljahr=${encodeURIComponent(schuljahr)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCustomFerien(data.ferien || []);
      }
    } catch (error) {
      console.error("Error saving ferien:", error);
      alert("Fehler beim Speichern der Ferien");
    } finally {
      setSaving(false);
    }
  };

  // Ferien löschen
  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm("Möchten Sie diese Ferienanpassung wirklich löschen? Die Preset-Ferien werden wiederhergestellt.")) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/jahresplanung/ferien?id=${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setCustomFerien(customFerien.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Error deleting ferien:", error);
      alert("Fehler beim Löschen");
    }
  };

  // Preset-Ferien übernehmen
  const handleImportPreset = async () => {
    if (!user || presetFerien.length === 0) return;

    if (
      !confirm(
        `Möchten Sie die Ferien aus "${presets[selectedPreset]?.label || selectedPreset}" für ${schuljahr} übernehmen? Bestehende Anpassungen bleiben erhalten.`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const token = await user.getIdToken();

      // Nur Preset-Ferien importieren, die noch nicht als Custom existieren
      for (const preset of presetFerien) {
        const exists = customFerien.some(
          (c) =>
            c.ferienName.toLowerCase() === preset.ferienName.toLowerCase()
        );

        if (!exists) {
          await fetch("/api/jahresplanung/ferien", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              schuljahr,
              ferienName: preset.ferienName,
              start: preset.start,
              ende: preset.ende,
            }),
          });
        }
      }

      // Neu laden
      const response = await fetch(
        `/api/jahresplanung/ferien?schuljahr=${encodeURIComponent(schuljahr)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCustomFerien(data.ferien || []);
      }
    } catch (error) {
      console.error("Error importing preset:", error);
      alert("Fehler beim Importieren");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/jahresplanung?schuljahr=${schuljahr}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  Ferienverwaltung
                </h1>
                <p className="text-gray-600 mt-1">
                  Passen Sie die Schulferien für Ihre Jahresplanung an
                </p>
              </div>
            </div>
          </div>

          {/* Schuljahr & Preset Auswahl */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Schuljahr</label>
                  <Select value={schuljahr} onValueChange={setSchuljahr}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {schuljahrListe.map((sj) => (
                        <SelectItem key={sj} value={sj}>
                          {sj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Ferien-Vorlage
                  </label>
                  <Select
                    value={selectedPreset}
                    onValueChange={setSelectedPreset}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(presets)
                        .filter(([key]) => key !== "CUSTOM")
                        .map(([key, preset]) => (
                          <SelectItem key={key} value={key}>
                            {preset.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Import-Button */}
              {presetFerien.length > 0 && customFerien.length === 0 && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-700">
                      Sie haben noch keine eigenen Ferien definiert. Möchten Sie
                      die Vorlage übernehmen und anpassen?
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleImportPreset}
                      disabled={saving}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {saving ? "Importiere..." : "Vorlage übernehmen"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ferien-Liste */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Ferien {schuljahr}
              </CardTitle>
              <Button size="sm" onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Ferien hinzufügen
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : allFerien.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    Keine Ferien für {schuljahr} definiert
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Übernehmen Sie eine Vorlage oder fügen Sie Ferien manuell hinzu
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allFerien.map((ferien, index) => (
                    <div
                      key={ferien.id || `preset-${index}`}
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        ferien.isPreset
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white border-blue-200"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {ferien.ferienName}
                          </p>
                          {ferien.isPreset ? (
                            <Badge variant="secondary" className="text-xs">
                              Vorlage
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-blue-600 border-blue-300"
                            >
                              Angepasst
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(ferien.start)} – {formatDate(ferien.ende)}
                          <span className="ml-2 text-gray-400">
                            ({calculateDays(ferien.start, ferien.ende)} Tage)
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openDialog(ferien)}
                          title={
                            ferien.isPreset
                              ? "Anpassen"
                              : "Bearbeiten"
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!ferien.isPreset && ferien.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(ferien.id!)}
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hinweis */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Hinweis</p>
                  <p className="mt-1">
                    Ihre Ferienanpassungen werden in der Quartals- und
                    Wochenansicht berücksichtigt. Ferienwochen werden dort
                    grau hervorgehoben und können nicht bearbeitet werden.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bearbeiten/Erstellen Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFerien ? "Ferien bearbeiten" : "Ferien hinzufügen"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Ferienname *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="z.B. Herbstferien"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start *</label>
                  <Input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Ende *</label>
                  <Input
                    type="date"
                    value={formEnde}
                    onChange={(e) => setFormEnde(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {formStart && formEnde && new Date(formStart) <= new Date(formEnde) && (
                <p className="text-sm text-gray-500">
                  {calculateDays(formStart, formEnde)} Tage
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Speichere..." : "Speichern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
