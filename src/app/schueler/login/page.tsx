"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function StudentLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { user, error: loginError } = await login(email, password);

    if (loginError) {
      setError(loginError);
      setLoading(false);
    } else if (user) {
      // Prüfen ob es ein Schüler ist wird im AuthContext/Dashboard gemacht
      router.push("/schueler/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="MIA-App Logo"
            width={180}
            height={90}
            className="object-contain"
            style={{ height: 'auto' }}
            priority
          />
          <div className="flex items-center gap-2 text-blue-600">
            <Star className="h-5 w-5 fill-blue-500" />
            <span className="font-medium">Schüler-Login</span>
            <Star className="h-5 w-5 fill-blue-500" />
          </div>
        </div>

        <Card className="w-full border-blue-200">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
          <CardHeader>
            <CardTitle>Willkommen zurück!</CardTitle>
            <CardDescription>
              Melde dich an, um deinen Kompetenzenpass zu sehen
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
                <Label htmlFor="email">E-Mail oder Benutzername</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="deine@email.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? "Wird angemeldet..." : "Anmelden"}
              </Button>
              <div className="text-sm text-muted-foreground text-center space-y-2">
                <p>
                  Dein Account wurde von deiner Lehrperson erstellt.
                </p>
                <p>
                  <Link href="/login" className="text-primary hover:underline">
                    Bist du eine Lehrperson?
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
