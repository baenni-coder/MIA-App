"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import KanbanBoard from "@/components/KanbanBoard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thema, Zeitraum, Teacher, Stufe } from "@/types";

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

export default function JahresplanPage() {
  const { user } = useAuth();
  const [themenGrouped, setThemenGrouped] = useState<Record<Zeitraum, Thema[]> | null>(null);
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStufe, setSelectedStufe] = useState<Stufe | null>(null);

  useEffect(() => {
    if (user) {
      console.log("🔍 Loading data for user:", user.uid);

      // Erst Lehrer-Daten laden, um die Stufe zu bekommen
      fetch(`/api/teachers?userId=${user.uid}`)
        .then((res) => {
          console.log("📥 Teacher API response status:", res.status);
          return res.json();
        })
        .then((data: Teacher) => {
          console.log("👨‍🏫 Teacher data:", data);
          setTeacherData(data);

          // Verwende selectedStufe falls gesetzt, sonst die Stufe des Lehrers
          const currentStufe = selectedStufe || data.stufe;

          // Dann Themen für die Stufe laden
          const themenUrl = `/api/themen?stufe=${encodeURIComponent(currentStufe)}&grouped=true`;
          console.log("🔗 Fetching themen from:", themenUrl);
          return fetch(themenUrl);
        })
        .then((res) => {
          console.log("📥 Themen API response status:", res.status);
          return res.json();
        })
        .then((data) => {
          console.log("📚 Themen data:", data);
          console.log("📊 Number of themen groups:", Object.keys(data).length);

          // Zähle Themen pro Zeitraum
          Object.entries(data).forEach(([zeitraum, themen]) => {
            console.log(`  ${zeitraum}: ${(themen as any[]).length} Themen`);
          });

          setThemenGrouped(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("❌ Error loading data:", err);
          setLoading(false);
        });
    }
  }, [user, selectedStufe]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Jahresplan</h2>
            <p className="text-muted-foreground mt-2">
              {teacherData
                ? `Ihr MIA-Jahresplan für ${selectedStufe || teacherData.stufe}`
                : "Wird geladen..."}
            </p>
          </div>

          {teacherData && (
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Ansicht für Stufe:</label>
              <Select
                value={selectedStufe || teacherData.stufe}
                onValueChange={(value) => {
                  setSelectedStufe(value as Stufe);
                  setLoading(true);
                }}
              >
                <SelectTrigger className="w-48">
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
              {selectedStufe && selectedStufe !== teacherData.stufe && (
                <span className="text-sm text-muted-foreground">
                  (Temporäre Ansicht)
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Jahresplan wird geladen...</p>
              </div>
            </div>
          ) : themenGrouped ? (
            <KanbanBoard
              themenGrouped={themenGrouped}
              schulePictsBuchen={teacherData?.schule?.pictsBuchen}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Keine Themen für Ihre Stufe gefunden.
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
