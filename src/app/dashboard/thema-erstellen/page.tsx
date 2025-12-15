"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import CustomThemeForm from "@/components/CustomThemeForm";

export default function ThemaErstellenPage() {
  const router = useRouter();

  const handleSuccess = (themeId: string) => {
    // Nach erfolgreichem Erstellen: zur Lektionsplanung oder zu "Meine Themen"
    router.push(`/dashboard/meine-themen?new=${themeId}`);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Eigenes Thema erstellen</h1>
            <p className="text-gray-600 mt-2">
              Erstellen Sie ein eigenes MIA-Thema mit Lektionsplanung für Ihre
              Klasse.
            </p>
          </div>

          <CustomThemeForm onSuccess={handleSuccess} mode="create" />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
