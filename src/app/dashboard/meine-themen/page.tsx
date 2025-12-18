"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import ThemeStatusBadge from "@/components/ThemeStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomTheme } from "@/types";
import { Loader2, Plus, Edit, Trash2, Send, BookOpen } from "lucide-react";

export default function MeineThemenPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    loadThemes();
  }, [user]);

  const loadThemes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/custom-themes?userId=${user.uid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load themes");

      const data = await response.json();
      setThemes(data.themes || []);
    } catch (error) {
      console.error("Error loading themes:", error);
      alert("Fehler beim Laden der Themen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (themeId: string) => {
    if (!confirm("Möchten Sie dieses Thema wirklich löschen?")) return;

    setDeletingId(themeId);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/custom-themes/${themeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }

      // Entferne aus Liste
      setThemes((prev) => prev.filter((t) => t.id !== themeId));
      alert("Thema wurde gelöscht");
    } catch (error) {
      console.error("Error deleting theme:", error);
      alert("Fehler beim Löschen: " + (error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmitForReview = async (themeId: string) => {
    if (!confirm("Thema zur Prüfung einreichen?")) return;

    setSubmittingId(themeId);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/custom-themes/${themeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ submitForReview: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit");
      }

      alert("Thema wurde zur Prüfung eingereicht!");
      await loadThemes();
    } catch (error) {
      console.error("Error submitting theme:", error);
      alert("Fehler beim Einreichen: " + (error as Error).message);
    } finally {
      setSubmittingId(null);
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Meine Themen</h1>
              <p className="text-gray-600 mt-2">
                Verwalten Sie Ihre eigenen MIA-Themen
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard/thema-erstellen")}>
              <Plus className="mr-2 h-4 w-4" />
              Neues Thema
            </Button>
          </div>

          {/* Themen Liste */}
          {themes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500 mb-4">
                  Sie haben noch keine eigenen Themen erstellt.
                </p>
                <Button
                  onClick={() => router.push("/dashboard/thema-erstellen")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Erstes Thema erstellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {themes.map((theme) => (
                <Card key={theme.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{theme.thema}</CardTitle>
                          <ThemeStatusBadge status={theme.status} />
                          {theme.isSystemWide && (
                            <Badge variant="outline">Systemweit</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {theme.beschreibung}
                        </p>
                      </div>
                      {theme.bildLehrmittel && (
                        <img
                          src={theme.bildLehrmittel}
                          alt={theme.thema}
                          className="w-20 h-20 object-cover rounded-md ml-4"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="font-semibold">Lehrmittel:</span>{" "}
                        {theme.lehrmittel || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Lektionen:</span>{" "}
                        {theme.anzahlLektionen}
                      </div>
                      <div>
                        <span className="font-semibold">Zeitraum:</span>{" "}
                        {theme.zeitraum}
                      </div>
                      <div>
                        <span className="font-semibold">Stufen:</span>{" "}
                        {theme.schuljahr.join(", ")}
                      </div>
                    </div>

                    {/* Review Feedback */}
                    {theme.status === "rejected" && theme.reviewNotes && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                        <p className="text-sm font-semibold text-red-800 mb-1">
                          Feedback vom Admin:
                        </p>
                        <p className="text-sm text-red-700">
                          {theme.reviewNotes}
                        </p>
                      </div>
                    )}

                    {theme.status === "approved" && theme.reviewedByName && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-green-700">
                          Freigegeben von {theme.reviewedByName}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {/* Lektionen verwalten */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/thema/${theme.id}/lektionen`)
                        }
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Lektionen
                      </Button>

                      {/* Bearbeiten: Immer möglich */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/dashboard/thema-bearbeiten/${theme.id}`
                          )
                        }
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Bearbeiten
                      </Button>

                      {/* Zur Prüfung einreichen: nur bei draft/rejected */}
                      {(theme.status === "draft" ||
                        theme.status === "rejected") && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSubmitForReview(theme.id)}
                          disabled={submittingId === theme.id}
                        >
                          {submittingId === theme.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Zur Prüfung einreichen
                        </Button>
                      )}

                      {/* Löschen: nur bei draft */}
                      {theme.status === "draft" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(theme.id)}
                          disabled={deletingId === theme.id}
                        >
                          {deletingId === theme.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Löschen
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
