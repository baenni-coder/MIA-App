import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarRange,
  PlusCircle,
  Shield,
  Zap,
  BookOpen,
  Users,
  CheckCircle,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header/Nav */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="MIA-App" width={120} height={60} className="object-contain" priority />
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost">Anmelden</Button>
            </Link>
            <Link href="/register">
              <Button>Registrieren</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge variant="secondary" className="mb-4">
            Neu: Eigene Themen mit Lektionsplanung erstellen
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 pb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
            Jahresplanung für MIA
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Die umfassende Plattform für
            <br />
            <span className="font-semibold text-foreground">Medien, Informatik und Anwendungskompetenzen</span>
            <br />
            <span className="text-lg">Mit Planungen für jedes Schuljahr, Lehrplanübersicht und eigenen Unterrichtseinheiten</span>
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6">
                Jetzt starten
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Anmelden
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">5-7x</div>
              <div className="text-sm text-muted-foreground mt-2">Schnellere Performance</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">90+</div>
              <div className="text-sm text-muted-foreground mt-2">System-Themen</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground mt-2">Eigene Themen</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Alle Features auf einen Blick</h2>
            <p className="text-lg text-muted-foreground">
              Alles was du für deine MIA-Jahresplanung brauchst – an einem Ort
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Jahresplan */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <CalendarRange className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Kanban-Jahresplan</CardTitle>
                <CardDescription>
                  Visueller Jahresplan mit 6 Zeiträumen und Roboter-Illustrationen für jeden Abschnitt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Stufenspezifische Themen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Kompetenzen mit Details
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Lektionsplanung mit Export
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 2: Custom Themes */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <PlusCircle className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Eigene Themen</CardTitle>
                <CardDescription>Erstelle und teile deine eigenen Unterrichtsthemen mit Lektionsplanung</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Vollständige Lektionsplanung
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Kompetenzen zuordnen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Lehrmittel-Bilder hochladen
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3: Admin Review */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Admin-Freigabe</CardTitle>
                <CardDescription>PICTS-Admins prüfen und geben Themen für alle Schulen frei</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Review-Workflow
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    In-App Notifications
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Systemweite Freigabe
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 4: Performance */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Blitzschnell</CardTitle>
                <CardDescription>Hybrid Airtable-Firestore Architektur für optimale Performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    5-7x schnellere Ladezeiten
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Firestore Cache
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Automatischer Sync
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 5: Lehrmittel */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Lehrmittel-Übersicht</CardTitle>
                <CardDescription>Alle Themen nach Lehrmitteln gruppiert mit Bildern und Details</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Alphabetische Sortierung
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Lehrmittel-Bilder
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Direkte Links
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 6: Zusammenarbeit */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <CardTitle>Schulübergreifend</CardTitle>
                <CardDescription>Genehmigte Themen werden für alle Schulen sichtbar</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Schul-spezifische PICTS
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Gemeinsame Themen-Bibliothek
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Best Practices teilen
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Bereit für die MIA-Jahresplanung?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Erstelle deinen Account und starte noch heute mit der Planung
          </p>
          <Link href="/register">
            <Button size="lg" className="text-lg px-12 py-6">
              Kostenlos registrieren
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MIA-App. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}
