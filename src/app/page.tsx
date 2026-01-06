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
  GraduationCap,
  Star,
  Trophy,
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
              <Button variant="ghost">Lehrer-Login</Button>
            </Link>
            <Link href="/schueler/login">
              <Button variant="outline">Schüler-Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge variant="secondary" className="mb-4">
            Neu: Digitaler Kompetenzenpass für Schüler
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 pb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
            MIA-App
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed">
            Die Plattform für
            <br />
            <span className="font-semibold text-foreground">Medien, Informatik und Anwendungskompetenzen</span>
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Jahresplanung für Lehrpersonen & Kompetenzenpass für Schüler - alles unter einer Haube
          </p>

          {/* Rollen-Auswahl Karten */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {/* Lehrer-Karte */}
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/60" />
              <CardHeader className="pt-8">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">Lehrperson</CardTitle>
                <CardDescription className="text-base">
                  Jahresplanung, Themen erstellen und Schülerfortschritt verfolgen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    Kanban-Jahresplan nach Stufe
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    Eigene Themen mit Lektionsplanung
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    Klassen verwalten & Fortschritt einsehen
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    Themen als bearbeitet markieren
                  </li>
                </ul>
                <div className="flex gap-3 pt-4">
                  <Link href="/login" className="flex-1">
                    <Button className="w-full" size="lg">
                      Anmelden
                    </Button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <Button variant="outline" className="w-full" size="lg">
                      Registrieren
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Schüler-Karte */}
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow border-2 hover:border-blue-500/50">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
              <CardHeader className="pt-8">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-10 w-10 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">Schüler:in</CardTitle>
                <CardDescription className="text-base">
                  Kompetenzen bewerten, Badges sammeln und Fortschritt verfolgen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    Kompetenzen selbst einschätzen
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    Badges für Erfolge sammeln
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    Bearbeitete Themen der Klasse sehen
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    Fortschritt als PDF exportieren
                  </li>
                </ul>
                <div className="flex gap-3 pt-4">
                  <Link href="/schueler/login" className="flex-1">
                    <Button className="w-full bg-blue-500 hover:bg-blue-600" size="lg">
                      Anmelden
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Schüler-Accounts werden von Lehrpersonen erstellt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">80+</div>
              <div className="text-xs text-muted-foreground mt-1">Kompetenzen LP21</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">90+</div>
              <div className="text-xs text-muted-foreground mt-1">System-Themen</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">16</div>
              <div className="text-xs text-muted-foreground mt-1">Badges</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500">KiGa-9</div>
              <div className="text-xs text-muted-foreground mt-1">Klassenstufen</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Lehrer */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Für Lehrpersonen</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Jahresplanung & mehr</h2>
            <p className="text-lg text-muted-foreground">
              Alles was du für deine MIA-Jahresplanung brauchst
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
                  Visueller Jahresplan mit 6 Zeiträumen und Roboter-Illustrationen
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
                    Lektionsplanung mit Export
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Als bearbeitet markieren
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
                <CardDescription>Erstelle und teile eigene Unterrichtsthemen</CardDescription>
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
                    Systemweite Freigabe
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3: Klassen */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Klassenverwaltung</CardTitle>
                <CardDescription>Klassen und Schüler verwalten</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Schüler-Accounts erstellen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Fortschritt einsehen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Kommentare & Feedback
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section - Schüler */}
      <section className="py-16 px-4 bg-blue-500/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">Für Schüler:innen</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Digitaler Kompetenzenpass</h2>
            <p className="text-lg text-muted-foreground">
              Selbsteinschätzung, Badges und Fortschrittsverfolgung
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Bewertung */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle>Selbsteinschätzung</CardTitle>
                <CardDescription>Bewerte deine Kompetenzen mit Sternen</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    5-Sterne Bewertungssystem
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Nur relevante Kompetenzen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Lehrer-Feedback sichtbar
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 2: Badges */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>Badges sammeln</CardTitle>
                <CardDescription>Verdiene Auszeichnungen für deinen Fortschritt</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    16 verschiedene Badges
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    4 Seltenheitsstufen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Automatisch & manuell
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3: Themen */}
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Klassenthemen</CardTitle>
                <CardDescription>Sieh welche Themen deine Klasse bearbeitet hat</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Bearbeitete Themen sehen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    Verknüpfte Kompetenzen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    PDF-Export
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Weitere Features</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Blitzschnell</CardTitle>
                <CardDescription>5-7x schnellere Ladezeiten dank Firestore Cache</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Admin-Freigabe</CardTitle>
                <CardDescription>PICTS-Admins prüfen und geben Themen frei</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Schulübergreifend</CardTitle>
                <CardDescription>Genehmigte Themen für alle Schulen sichtbar</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/10 to-blue-500/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Bereit loszulegen?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Wähle deine Rolle und starte noch heute
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6">
                Als Lehrperson registrieren
              </Button>
            </Link>
            <Link href="/schueler/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-blue-500 text-blue-600 hover:bg-blue-500/10">
                Als Schüler:in anmelden
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} MIA-App. Alle Rechte vorbehalten.</p>
            <div className="flex gap-6">
              <Link href="/datenschutz" className="hover:text-primary transition-colors underline">
                Datenschutzerklärung
              </Link>
              <Link href="/impressum" className="hover:text-primary transition-colors underline">
                Impressum
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
