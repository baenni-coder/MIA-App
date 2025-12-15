"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import ThemeStatusBadge from "@/components/ThemeStatusBadge";
import AdminThemeReview from "@/components/AdminThemeReview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomTheme, ThemeStatus } from "@/types";
import { Loader2, Eye } from "lucide-react";
import { getTeacherProfile } from "@/lib/firestore/permissions";

type Tab = "pending_review" | "approved" | "rejected" | "all";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("pending_review");
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reviewingTheme, setReviewingTheme] = useState<CustomTheme | null>(
    null
  );

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadThemes();
    }
  }, [isAdmin, activeTab]);

  const checkAdminAccess = async () => {
    if (!user) return;

    try {
      const profile = await getTeacherProfile(user.uid);
      if (!profile) {
        router.push("/dashboard");
        return;
      }

      const hasAccess =
        profile.role === "picts_admin" || profile.role === "super_admin";
      if (!hasAccess) {
        alert("Sie haben keinen Zugriff auf das Admin-Dashboard");
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/dashboard");
    }
  };

  const loadThemes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();

      // Baue Query basierend auf Tab
      let queryParams = "";
      if (activeTab !== "all") {
        queryParams = `?status=${activeTab}`;
      }

      const response = await fetch(`/api/custom-themes${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  const handleReviewComplete = () => {
    setReviewingTheme(null);
    loadThemes();
  };

  if (!isAdmin) {
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

  const tabs: { key: Tab; label: string; count?: number }[] = [
    {
      key: "pending_review",
      label: "Zu prüfen",
      count: themes.filter((t) => t.status === "pending_review").length,
    },
    {
      key: "approved",
      label: "Freigegeben",
      count: themes.filter((t) => t.status === "approved").length,
    },
    {
      key: "rejected",
      label: "Abgelehnt",
      count: themes.filter((t) => t.status === "rejected").length,
    },
    { key: "all", label: "Alle" },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Verwalten Sie eingereichte Custom Themen
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge className="ml-2 bg-blue-500">{tab.count}</Badge>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : themes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">
                  Keine Themen in dieser Kategorie.
                </p>
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
                        <span className="font-semibold">Ersteller:</span>{" "}
                        {theme.createdByName}
                      </div>
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
                    </div>

                    <div className="text-sm mb-4">
                      <span className="font-semibold">Stufen: </span>
                      {theme.schuljahr.join(", ")}
                    </div>

                    {/* Review Info */}
                    {theme.reviewedByName && (
                      <div className="bg-gray-50 border rounded-md p-3 mb-4 text-sm">
                        <p className="font-semibold">
                          Geprüft von: {theme.reviewedByName}
                        </p>
                        {theme.reviewNotes && (
                          <p className="text-gray-700 mt-1">
                            Feedback: {theme.reviewNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewingTheme(theme)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {theme.status === "pending_review"
                          ? "Prüfen"
                          : "Details"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Review Dialog */}
        {reviewingTheme && (
          <AdminThemeReview
            theme={reviewingTheme}
            open={!!reviewingTheme}
            onOpenChange={(open) => !open && setReviewingTheme(null)}
            onReviewComplete={handleReviewComplete}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
