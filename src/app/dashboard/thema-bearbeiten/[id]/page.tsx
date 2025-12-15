"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import CustomThemeForm from "@/components/CustomThemeForm";
import { CustomTheme } from "@/types";
import { Loader2 } from "lucide-react";

export default function ThemaBearbeitenPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [theme, setTheme] = useState<CustomTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const themeId = params.id as string;

  useEffect(() => {
    loadTheme();
  }, [themeId, user]);

  const loadTheme = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/custom-themes/${themeId}?resolveKompetenzen=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError("Sie haben keine Berechtigung, dieses Thema zu bearbeiten.");
        } else if (response.status === 404) {
          setError("Thema nicht gefunden.");
        } else {
          throw new Error("Failed to load theme");
        }
        return;
      }

      const data = await response.json();
      setTheme(data.theme);
    } catch (error) {
      console.error("Error loading theme:", error);
      setError("Fehler beim Laden des Themas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    router.push("/dashboard/meine-themen");
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

  if (error || !theme) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
              <p className="text-red-800">{error || "Thema nicht gefunden"}</p>
              <button
                onClick={() => router.push("/dashboard/meine-themen")}
                className="mt-4 text-red-600 underline"
              >
                Zurück zu Meine Themen
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Thema bearbeiten</h1>
            <p className="text-gray-600 mt-2">
              Bearbeiten Sie Ihr MIA-Thema &quot;{theme.thema}&quot;
            </p>
          </div>

          <CustomThemeForm
            onSuccess={handleSuccess}
            initialData={theme}
            mode="edit"
            themeId={themeId}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
