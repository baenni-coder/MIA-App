"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarRange, BookOpen, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Teacher } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`/api/teachers?userId=${user.uid}`)
        .then((res) => res.json())
        .then((data) => {
          setTeacherData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading teacher data:", err);
          setLoading(false);
        });
    }
  }, [user]);

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

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BookOpen className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Lehrmittel</CardTitle>
                <CardDescription>
                  Übersicht über alle verfügbaren Lehrmittel und Materialien
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  Bald verfügbar
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>PICTS Buchungen</CardTitle>
                <CardDescription>
                  Buchen Sie Unterstützung durch PICTS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  Bald verfügbar
                </Button>
              </CardContent>
            </Card>
          </div>

          {teacherData && (
            <Card>
              <CardHeader>
                <CardTitle>Mein Profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{teacherData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-Mail:</span>
                  <span className="font-medium">{teacherData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stufe:</span>
                  <span className="font-medium">{teacherData.stufe}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
