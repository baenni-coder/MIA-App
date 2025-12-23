"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarRange, BookOpen, Users, Edit2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Teacher, Stufe } from "@/types";

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

export default function DashboardPage() {
  const { user, getAuthToken } = useAuth();
  const router = useRouter();
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingStufe, setEditingStufe] = useState(false);
  const [newStufe, setNewStufe] = useState<Stufe | null>(null);
  const [saving, setSaving] = useState(false);

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
      } catch (err) {
        console.error("Error loading teacher data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTeacherData();
  }, [user, getAuthToken]);

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
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/jahresplan")}>
              <CardHeader>
                <CalendarRange className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Jahresplan</CardTitle>
                <CardDescription>
                  Verwalten Sie Ihren MIA-Jahresplan im Kanban-Board
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Zum Jahresplan
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/lehrmittel")}>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Lehrmittel</CardTitle>
                <CardDescription>
                  Übersicht über alle verfügbaren Lehrmittel und Materialien
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Zu den Lehrmitteln
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => teacherData?.schule?.pictsBuchen && window.open(teacherData.schule.pictsBuchen, '_blank')}>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>PICTS Buchungen</CardTitle>
                <CardDescription>
                  Buchen Sie Unterstützung durch PICTS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  PICTS buchen
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}
