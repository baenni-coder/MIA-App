"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import LektionEditor from "@/components/LektionEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomTheme, CustomLektion } from "@/types";
import { Loader2, Plus, Edit, Trash2, ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function LektionenVerwaltungPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [theme, setTheme] = useState<CustomTheme | null>(null);
  const [lektionen, setLektionen] = useState<CustomLektion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingLektion, setEditingLektion] = useState<CustomLektion | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const themeId = params.id as string;

  useEffect(() => {
    loadTheme();
    loadLektionen();
  }, [themeId, user]);

  const loadTheme = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/custom-themes/${themeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTheme(data.theme);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const loadLektionen = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/custom-lektionen?themeId=${themeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load lektionen");

      const data = await response.json();
      setLektionen(data.lektionen || []);
    } catch (error) {
      console.error("Error loading lektionen:", error);
      alert("Fehler beim Laden der Lektionen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (lektionId: string) => {
    if (!confirm("Möchten Sie diese Lektion wirklich löschen?")) return;

    setDeletingId(lektionId);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/custom-lektionen/${lektionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }

      alert("Lektion wurde gelöscht");
      await loadLektionen();
    } catch (error) {
      console.error("Error deleting lektion:", error);
      alert("Fehler beim Löschen: " + (error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditorSuccess = () => {
    setShowEditor(false);
    setEditingLektion(null);
    loadLektionen();
  };

  const handleEdit = (lektion: CustomLektion) => {
    setEditingLektion(lektion);
    setShowEditor(true);
  };

  const handleAddNew = () => {
    setEditingLektion(null);
    setShowEditor(true);
  };

  if (loading && lektionen.length === 0) {
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/meine-themen")}
              className="mb-4"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Zurück zu Meine Themen
            </Button>

            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Lektionsplanung</h1>
                {theme && (
                  <p className="text-gray-600 mt-2">
                    Thema: {theme.thema} ({theme.anzahlLektionen} Lektionen geplant)
                  </p>
                )}
              </div>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Neue Lektion
              </Button>
            </div>
          </div>

          {/* Lektionen Liste */}
          {lektionen.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500 mb-4">
                  Noch keine Lektionen hinzugefügt.
                </p>
                <Button onClick={handleAddNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Erste Lektion erstellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {lektionen.map((lektion) => (
                <Card key={lektion.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Badge variant="outline">{lektion.lektion}</Badge>
                          {lektion.eindeutigeBezeichnung}
                        </CardTitle>
                        {lektion.kiZusammenfassung && (
                          <p className="text-sm text-gray-600 mt-2">
                            {lektion.kiZusammenfassung}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {/* Aufgaben */}
                      {lektion.aufgaben && (
                        <div>
                          <span className="font-semibold">Aufgaben: </span>
                          <span className="text-gray-700">
                            {lektion.aufgaben.substring(0, 150)}
                            {lektion.aufgaben.length > 150 && "..."}
                          </span>
                        </div>
                      )}

                      {/* Material */}
                      {lektion.material && lektion.material.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="font-semibold">Material:</span>
                          <div className="flex flex-wrap gap-1">
                            {lektion.material.map((m) => (
                              <Badge key={m} variant="secondary" className="text-xs">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Website Tools */}
                      {lektion.websiteTools && lektion.websiteTools.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="font-semibold">Tools:</span>
                          <div className="flex flex-wrap gap-2">
                            {lektion.websiteTools.map((tool) => (
                              <span key={tool.id} className="text-blue-600 text-xs">
                                {tool.name}
                                {tool.link && " ↗"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(lektion)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Bearbeiten
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(lektion.id)}
                        disabled={deletingId === lektion.id}
                      >
                        {deletingId === lektion.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Löschen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Editor Dialog */}
          <Dialog open={showEditor} onOpenChange={setShowEditor}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLektion ? "Lektion bearbeiten" : "Neue Lektion erstellen"}
                </DialogTitle>
              </DialogHeader>
              <LektionEditor
                themeId={themeId}
                onSuccess={handleEditorSuccess}
                onCancel={() => setShowEditor(false)}
                initialData={editingLektion || undefined}
                mode={editingLektion ? "edit" : "create"}
                lektionId={editingLektion?.id}
                order={lektionen.length + 1}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
