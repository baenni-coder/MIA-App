"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Erlaubte Rollen für diese Route.
   * Wenn nicht angegeben, sind nur Lehrer/Admins erlaubt (Standard für /dashboard).
   * Für Schüler-Seiten: allowedRoles={["student"]}
   */
  allowedRoles?: UserRole[];
  /**
   * Wohin bei fehlender Berechtigung weitergeleitet werden soll.
   * Standard: /login für nicht-authentifizierte, rollenbasiert für falsche Rolle
   */
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, loading, profileLoading, userRole, isStudent, isTeacher } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Warte auf Auth und Profil-Laden
    if (loading || profileLoading) return;

    // Nicht eingeloggt -> Login
    if (!user) {
      router.push("/login");
      return;
    }

    // Rolle noch nicht geladen
    if (!userRole) return;

    // Prüfe erlaubte Rollen
    if (allowedRoles && allowedRoles.length > 0) {
      // Spezifische Rollen definiert
      if (!allowedRoles.includes(userRole)) {
        // Falsche Rolle - wohin umleiten?
        if (redirectTo) {
          router.push(redirectTo);
        } else if (isStudent) {
          // Schüler versucht auf Lehrer-Bereich zuzugreifen
          router.push("/schueler/dashboard");
        } else if (isTeacher) {
          // Lehrer versucht auf Schüler-Bereich zuzugreifen
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      }
    } else {
      // Keine spezifischen Rollen definiert -> Standard: nur Lehrer/Admins
      // (Abwärtskompatibilität für bestehende Dashboard-Seiten)
      if (isStudent) {
        router.push("/schueler/dashboard");
      }
    }
  }, [user, loading, profileLoading, userRole, allowedRoles, redirectTo, isStudent, isTeacher, router]);

  // Lade-Anzeige während Auth oder Profil geladen wird
  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Nicht eingeloggt
  if (!user) {
    return null;
  }

  // Rolle noch nicht geladen
  if (!userRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Profil wird geladen...</p>
        </div>
      </div>
    );
  }

  // Rollenprüfung
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      return null; // Wird umgeleitet via useEffect
    }
  } else {
    // Standard: nur Lehrer/Admins erlaubt
    if (isStudent) {
      return null; // Wird umgeleitet via useEffect
    }
  }

  return <>{children}</>;
}
