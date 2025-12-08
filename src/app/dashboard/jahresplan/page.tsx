"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import KanbanBoard from "@/components/KanbanBoard";
import { Thema, Zeitraum, Teacher, Stufe } from "@/types";

export default function JahresplanPage() {
  const { user } = useAuth();
  const [themenGrouped, setThemenGrouped] = useState<Record<Zeitraum, Thema[]> | null>(null);
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Erst Lehrer-Daten laden, um die Stufe zu bekommen
      fetch(`/api/teachers?userId=${user.uid}`)
        .then((res) => res.json())
        .then((data: Teacher) => {
          setTeacherData(data);
          // Dann Themen für die Stufe laden
          return fetch(`/api/themen?stufe=${encodeURIComponent(data.stufe)}&grouped=true`);
        })
        .then((res) => res.json())
        .then((data) => {
          setThemenGrouped(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading data:", err);
          setLoading(false);
        });
    }
  }, [user]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Jahresplan</h2>
            <p className="text-muted-foreground mt-2">
              {teacherData
                ? `Ihr MIA-Jahresplan für ${teacherData.stufe}`
                : "Wird geladen..."}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Jahresplan wird geladen...</p>
              </div>
            </div>
          ) : themenGrouped ? (
            <KanbanBoard themenGrouped={themenGrouped} />
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
