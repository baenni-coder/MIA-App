"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";

export default function StudentProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, profileLoading, isStudent, isTeacher } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Warte bis Auth und Profil geladen sind
    if (loading || profileLoading) return;

    // Nicht eingeloggt -> zum Schüler-Login
    if (!user) {
      router.push("/schueler/login");
      return;
    }

    // Eingeloggt aber kein Schüler -> zur richtigen Seite umleiten
    if (isTeacher) {
      // Lehrer zum Lehrer-Dashboard umleiten
      router.push("/dashboard");
      return;
    }

    // Eingeloggt aber weder Schüler noch Lehrer -> kein Profil
    if (!isStudent) {
      // Kein gültiges Profil gefunden
      router.push("/schueler/login");
      return;
    }
  }, [user, loading, profileLoading, isStudent, isTeacher, router]);

  // Ladeanimation mit Schüler-Farben
  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-background">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <Star className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-4 text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Nicht eingeloggt oder kein Schüler
  if (!user || !isStudent) {
    return null;
  }

  return <>{children}</>;
}
