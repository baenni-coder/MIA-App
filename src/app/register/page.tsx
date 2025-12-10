"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Stufe } from "@/types";

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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [schuleId, setSchuleId] = useState("");
  const [stufe, setStufe] = useState<Stufe>("1. Klasse");
  const [schulen, setSchulen] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Schulen von API laden
    fetch("/api/schulen")
      .then((res) => res.json())
      .then((data) => setSchulen(data))
      .catch((err) => console.error("Error loading Schulen:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    if (!schuleId) {
      setError("Bitte wählen Sie eine Schule aus");
      return;
    }

    setLoading(true);

    const { user, error: registerError } = await register(email, password);

    if (registerError) {
      setError(registerError);
      setLoading(false);
    } else if (user) {
      // Lehrer-Profil in Firestore speichern
      const response = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          name,
          schuleId,
          stufe,
        }),
      });

      if (response.ok) {
        router.push("/dashboard");
      } else {
        setError("Fehler beim Erstellen des Profils");
        setLoading(false);
      }
    }
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
            <CardTitle>Registrieren</CardTitle>
            <CardDescription>
              Erstellen Sie Ihren Lehrer-Account
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
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ihr Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
              <Label htmlFor="schule">Schule</Label>
              <Select
                value={schuleId}
                onValueChange={(value) => setSchuleId(value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Schule auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {schulen.map((schule) => (
                    <SelectItem key={schule.id} value={schule.id}>
                      {schule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stufe">Stufe</Label>
              <Select
                value={stufe}
                onValueChange={(value) => setStufe(value as Stufe)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stufe auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {STUFEN.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Wird registriert..." : "Registrieren"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Bereits ein Account?{" "}
              <a href="/login" className="text-primary hover:underline">
                Jetzt anmelden
              </a>
            </p>
          </CardFooter>
        </form>
        </Card>
      </div>
    </div>
  );
}
