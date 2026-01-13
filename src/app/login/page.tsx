"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { resetPassword } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, userRole, profileLoading, isStudent, isTeacher } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForProfile, setWaitingForProfile] = useState(false);

  // Passwort vergessen Dialog State
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Rollenbasierte Weiterleitung nach Login
  useEffect(() => {
    if (waitingForProfile && user && !profileLoading && userRole) {
      setWaitingForProfile(false);
      if (isStudent) {
        // Schüler zur Schüler-Oberfläche weiterleiten
        router.push("/schueler/dashboard");
      } else if (isTeacher) {
        // Lehrer zum Lehrer-Dashboard weiterleiten
        router.push("/dashboard");
      } else {
        // Unbekannte Rolle - Fehlermeldung
        setError("Ihr Konto konnte keiner Benutzergruppe zugeordnet werden. Bitte kontaktieren Sie den Support.");
        setLoading(false);
      }
    }
  }, [waitingForProfile, user, userRole, profileLoading, isStudent, isTeacher, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { user: loggedInUser, error: loginError } = await login(email, password);

    if (loginError) {
      setError(loginError);
      setLoading(false);
    } else if (loggedInUser) {
      // Warte auf Profil-Laden um Rolle zu bestimmen
      setWaitingForProfile(true);
    }
  };

  const handleOpenResetDialog = () => {
    setResetEmail(email); // E-Mail vom Login-Feld übernehmen
    setResetError("");
    setResetSuccess(false);
    setResetDialogOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    const { success, error: resetErr } = await resetPassword(resetEmail);

    if (success) {
      setResetSuccess(true);
    } else {
      setResetError(resetErr || "Ein Fehler ist aufgetreten.");
    }

    setResetLoading(false);
  };

  const handleCloseResetDialog = () => {
    setResetDialogOpen(false);
    setResetEmail("");
    setResetError("");
    setResetSuccess(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="MIA-App Logo"
            width={200}
            height={100}
            className="object-contain"
            style={{ height: 'auto' }}
            priority
          />
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Anmelden</CardTitle>
            <CardDescription>
              Melden Sie sich mit Ihrem Account an
            </CardDescription>
          </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre@email.ch"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={handleOpenResetDialog}
                className="text-sm text-primary hover:underline"
              >
                Passwort vergessen?
              </button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Wird angemeldet..." : "Anmelden"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Noch kein Account?{" "}
              <a href="/register" className="text-primary hover:underline">
                Jetzt registrieren
              </a>
            </p>
          </CardFooter>
        </form>
        </Card>
      </div>

      {/* Passwort vergessen Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Passwort zurücksetzen</DialogTitle>
            <DialogDescription>
              Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded-md">
                <p className="font-medium">E-Mail gesendet!</p>
                <p className="text-sm mt-1">
                  Bitte prüfen Sie Ihren Posteingang und folgen Sie den Anweisungen in der E-Mail.
                  Überprüfen Sie auch Ihren Spam-Ordner.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseResetDialog} className="w-full">
                  Zurück zur Anmeldung
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4">
                {resetError && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {resetError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-Mail</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="ihre@email.ch"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseResetDialog}
                  className="w-full sm:w-auto"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={resetLoading || !resetEmail}
                  className="w-full sm:w-auto"
                >
                  {resetLoading ? "Wird gesendet..." : "Link senden"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
