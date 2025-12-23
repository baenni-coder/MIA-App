import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Mail, Phone, Globe, Scale } from "lucide-react";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Startseite
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Scale className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">Impressum</h1>
          </div>
          <p className="text-muted-foreground">
            Angaben gemäss Schweizer Recht (Art. 3 UWG)
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* 1. Betreiber */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Betreiber der Website</h2>
            </div>
            <div className="bg-gray-50 p-6 rounded-md border space-y-2">
              <p className="font-semibold text-lg">[Name der Organisation / Schulgemeinde]</p>
              <p>[Strasse und Hausnummer]</p>
              <p>[PLZ] [Ort]</p>
              <p>Schweiz</p>
            </div>
            <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200 mt-4">
              <strong>Hinweis:</strong> Bitte ersetzen Sie die Platzhalter mit Ihren tatsächlichen Angaben.
            </p>
          </section>

          {/* 2. Kontakt */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Kontakt</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md border flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">E-Mail</p>
                  <a href="mailto:kontakt@example.ch" className="text-primary hover:underline">
                    [kontakt@example.ch]
                  </a>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Telefon</p>
                  <p>[+41 XX XXX XX XX]</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border flex items-start gap-3 md:col-span-2">
                <Globe className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Website</p>
                  <a href="https://www.example.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    [www.example.ch]
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Vertretungsberechtigte Person */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Vertretungsberechtigte Person</h2>
            <div className="bg-gray-50 p-4 rounded-md border">
              <p className="font-semibold">[Vorname Nachname]</p>
              <p className="text-muted-foreground">[Funktion, z.B. Schulleitung / PICTS-Verantwortliche/r]</p>
            </div>
          </section>

          {/* 4. Zweck der Website */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Zweck der Website</h2>
            <p className="text-gray-700 leading-relaxed">
              Die MIA-App ist eine Webanwendung für Lehrpersonen zur Verwaltung ihres Jahresplans
              für <strong>&ldquo;Medien, Informatik und Anwendungskompetenzen (MIA)&rdquo;</strong>.
              Die App ermöglicht es Lehrkräften, sich anzumelden, ihre Schule und Klassenstufe
              auszuwählen und einen personalisierten Jahresplan zu erstellen und zu verwalten.
            </p>
          </section>

          {/* 5. Haftungsausschluss */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Haftungsausschluss</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Inhalt der Website</h3>
                <p className="text-gray-700 leading-relaxed">
                  Die Inhalte dieser Website werden mit grösster Sorgfalt erstellt.
                  Der Betreiber übernimmt jedoch keine Gewähr für die Richtigkeit, Vollständigkeit
                  und Aktualität der bereitgestellten Inhalte. Die Nutzung der Inhalte erfolgt
                  auf eigene Gefahr.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Verfügbarkeit</h3>
                <p className="text-gray-700 leading-relaxed">
                  Der Betreiber ist bemüht, die MIA-App möglichst unterbrechungsfrei anzubieten.
                  Es kann jedoch keine Garantie für eine jederzeitige Verfügbarkeit übernommen werden.
                  Wartungsarbeiten, technische Störungen oder andere Umstände können zu temporären
                  Einschränkungen führen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Links zu externen Websites</h3>
                <p className="text-gray-700 leading-relaxed">
                  Diese Website kann Links zu externen Websites Dritter enthalten.
                  Für die Inhalte dieser verlinkten Seiten ist stets der jeweilige Anbieter
                  verantwortlich. Der Betreiber hat keinen Einfluss auf die Gestaltung und
                  Inhalte fremder Internetseiten.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Urheberrecht */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Urheberrecht</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Die durch den Betreiber erstellten Inhalte und Werke auf dieser Website unterliegen
              dem Schweizer Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede
              Art der Verwertung ausserhalb der Grenzen des Urheberrechts bedürfen der schriftlichen
              Zustimmung des Betreibers.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Von Nutzern erstellte Inhalte (Custom Themes, Lektionsplanungen) verbleiben im
              Eigentum der jeweiligen Ersteller. Mit der Freigabe zur systemweiten Veröffentlichung
              räumt der Ersteller dem Betreiber ein nicht-exklusives Nutzungsrecht ein.
            </p>
          </section>

          {/* 7. Technische Umsetzung */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Technische Umsetzung</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="font-semibold mb-2">Hosting</h3>
                <p className="text-sm text-gray-700">
                  Vercel Inc.<br />
                  340 S Lemon Ave #4133<br />
                  Walnut, CA 91789, USA
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <h3 className="font-semibold mb-2">Datenbank</h3>
                <p className="text-sm text-gray-700">
                  Firebase / Google Cloud<br />
                  Google Ireland Limited<br />
                  Gordon House, Dublin 4, Ireland
                </p>
              </div>
            </div>
          </section>

          {/* 8. Anwendbares Recht */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Anwendbares Recht und Gerichtsstand</h2>
            <p className="text-gray-700 leading-relaxed">
              Für diese Website gilt ausschliesslich <strong>Schweizer Recht</strong>.
              Gerichtsstand ist der Sitz des Betreibers, sofern gesetzlich zulässig.
            </p>
          </section>

          {/* 9. Änderungen */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Änderungen</h2>
            <p className="text-gray-700 leading-relaxed">
              Der Betreiber behält sich vor, dieses Impressum jederzeit ohne Vorankündigung
              zu ändern. Die aktuelle Version ist stets auf dieser Seite verfügbar.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Stand: {new Date().toLocaleDateString("de-CH", { month: "long", year: "numeric" })}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-4">
            Weitere rechtliche Informationen finden Sie in unserer{" "}
            <Link href="/datenschutz" className="text-primary underline">
              Datenschutzerklärung
            </Link>
          </p>
          <Link href="/" className="inline-block">
            <Button variant="outline">Zurück zur Startseite</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
