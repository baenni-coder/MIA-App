import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Users, Lock, Mail } from "lucide-react";

export default function DatenschutzPage() {
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
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">Datenschutzerklärung</h1>
          </div>
          <p className="text-muted-foreground">
            Letzte Aktualisierung: {new Date().toLocaleDateString("de-CH")}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* 1. Verantwortlicher */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">1. Verantwortlicher</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            </p>
            <div className="bg-gray-50 p-4 rounded-md border">
              <p className="font-medium">Schulkreis BeLoSe</p>
              <p>Friedhofstrasse 2</p>
              <p>4512 Bellach</p>
              <p className="mt-2">
                <Mail className="inline h-4 w-4 mr-1" />
                E-Mail: [mia-app@schueu.ch]
              </p>
            </div>
            </section>

          {/* 2. Erhobene Daten */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">2. Welche Daten sammeln wir?</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Bei der Nutzung der MIA-App werden folgende personenbezogene Daten verarbeitet:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Registrierung:</strong> Name, E-Mail-Adresse, Schul-Zuordnung, Klassenstufe</li>
              <li><strong>Authentifizierung:</strong> Firebase Authentication Tokens, Session-Daten</li>
              <li><strong>Nutzungsdaten:</strong> Erstellte Themen, Lektionspläne, Kompetenzen-Auswahl</li>
              <li><strong>Hochgeladene Inhalte:</strong> Lehrmittel-Bilder (öffentlich zugänglich)</li>
              <li><strong>Benachrichtigungen:</strong> Name, E-Mail-Adresse bei Theme-Reviews</li>
              <li><strong>Technische Daten:</strong> IP-Adresse, Browser-Typ, Geräteinformationen (Logs)</li>
            </ul>
          </section>

          {/* 3. Zweck der Datenverarbeitung */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Zweck der Datenverarbeitung</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Ihre Daten werden zu folgenden Zwecken verarbeitet:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Bereitstellung und Betrieb der MIA-App</li>
              <li>Verwaltung Ihres Benutzerkontos</li>
              <li>Ermöglichung der Jahresplan-Erstellung und -Verwaltung</li>
              <li>Review-Workflow für Custom Themes (PICTS-Admin Benachrichtigungen)</li>
              <li>Technische Administration und Fehlerdiagnose</li>
            </ul>
          </section>

          {/* 4. Rechtsgrundlage */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Rechtsgrundlage (DSGVO)</h2>
            <p className="text-gray-700 leading-relaxed">
              Die Verarbeitung erfolgt auf Grundlage von:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-2">
              <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Vertragserfüllung (Bereitstellung der App-Funktionen)</li>
              <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Berechtigtes Interesse (technische Administration)</li>
            </ul>
          </section>

          {/* 5. Drittanbieter */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Weitergabe an Drittanbieter</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Wir nutzen folgende Drittanbieter zur Bereitstellung der App:
            </p>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="font-semibold mb-2">🔹 Firebase / Google Cloud (USA)</h3>
                <p className="text-sm text-gray-700">
                  <strong>Zweck:</strong> Authentifizierung, Datenbank (Firestore), File Storage
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Datenschutz:</strong> <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firebase Privacy Policy</a>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>AVV:</strong> <a href="https://cloud.google.com/terms/data-processing-addendum" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud DPA</a>
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <h3 className="font-semibold mb-2">🔹 Airtable (USA)</h3>
                <p className="text-sm text-gray-700">
                  <strong>Zweck:</strong> Verwaltung von System-Themen, Schulen, Kompetenzen
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Datenschutz:</strong> <a href="https://www.airtable.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Airtable Privacy Policy</a>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>AVV:</strong> <a href="https://www.airtable.com/company/data-processing-addendum" target="_blank" rel="noopener noreferrer" className="text-primary underline">Airtable DPA</a>
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                <h3 className="font-semibold mb-2">🔹 Vercel (USA)</h3>
                <p className="text-sm text-gray-700">
                  <strong>Zweck:</strong> Hosting der Web-Anwendung
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Datenschutz:</strong> <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Vercel Privacy Policy</a>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>AVV:</strong> <a href="https://vercel.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-primary underline">Vercel DPA</a>
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 bg-yellow-50 p-3 rounded border border-yellow-200">
              <strong>⚠️ Hinweis:</strong> Diese Dienste befinden sich teilweise in den USA. Die Datenübermittlung erfolgt auf Grundlage von EU-Standardvertragsklauseln (SCCs) gemäß Art. 46 DSGVO.
            </p>
          </section>

          {/* 6. Speicherdauer */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Speicherdauer</h2>
            <p className="text-gray-700 leading-relaxed">
              Ihre Daten werden gespeichert, solange:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-2">
              <li>Ihr Benutzerkonto aktiv ist</li>
              <li>Sie die App nutzen</li>
              <li>Gesetzliche Aufbewahrungsfristen bestehen</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Bei Löschung Ihres Kontos werden alle personenbezogenen Daten innerhalb von <strong>30 Tagen</strong> gelöscht.
            </p>
          </section>

          {/* 7. Ihre Rechte */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">7. Ihre Rechte</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Sie haben folgende Rechte gemäß DSGVO:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">📄 Auskunftsrecht (Art. 15)</h3>
                <p className="text-sm text-gray-700">
                  Sie können Auskunft über Ihre gespeicherten Daten erhalten.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">✏️ Berichtigungsrecht (Art. 16)</h3>
                <p className="text-sm text-gray-700">
                  Sie können falsche Daten korrigieren lassen.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">🗑️ Löschrecht (Art. 17)</h3>
                <p className="text-sm text-gray-700">
                  Sie können die Löschung Ihrer Daten verlangen (&ldquo;Recht auf Vergessenwerden&rdquo;).
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">🔒 Einschränkung (Art. 18)</h3>
                <p className="text-sm text-gray-700">
                  Sie können die Einschränkung der Verarbeitung verlangen.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">📤 Datenübertragbarkeit (Art. 20)</h3>
                <p className="text-sm text-gray-700">
                  Sie können Ihre Daten in einem strukturierten Format erhalten.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">⛔ Widerspruchsrecht (Art. 21)</h3>
                <p className="text-sm text-gray-700">
                  Sie können der Verarbeitung widersprechen.
                </p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              Zur Ausübung Ihrer Rechte kontaktieren Sie uns bitte unter: <strong>[kontakt@example.ch]</strong>
            </p>
          </section>

          {/* 8. Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Die MIA-App verwendet <strong>technisch notwendige Cookies</strong> für:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Firebase Authentication (Session-Management)</li>
              <li>Lokale Einstellungen (Sidebar-Status, Sprache)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Werbe-Cookies oder Tracking-Cookies</strong> werden <strong>nicht</strong> verwendet.
            </p>
          </section>

          {/* 9. Datensicherheit */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Datensicherheit</h2>
            <p className="text-gray-700 leading-relaxed">
              Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten zu schützen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-2">
              <li>🔐 TLS/SSL-Verschlüsselung (HTTPS)</li>
              <li>🔑 Firebase Authentication mit Token-basierter Authentifizierung</li>
              <li>🛡️ Firestore Security Rules (Role-based Access Control)</li>
              <li>🚫 Kein Zugriff auf fremde Benutzerprofile</li>
              <li>📝 Regelmäßige Sicherheitsupdates</li>
            </ul>
          </section>

          {/* 10. Kontakt Datenschutzbeauftragter */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Beschwerderecht</h2>
            <p className="text-gray-700 leading-relaxed">
              Sie haben das Recht, sich bei der zuständigen Datenschutz-Aufsichtsbehörde zu beschweren:
            </p>
            <div className="bg-gray-50 p-4 rounded-md border mt-4">
              <p className="font-medium">Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)</p>
              <p>Feldeggweg 1</p>
              <p>3003 Bern</p>
              <p className="mt-2">
                🌐 Website: <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary underline">www.edoeb.admin.ch</a>
              </p>
            </div>
          </section>

          {/* 11. Änderungen */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Änderungen der Datenschutzerklärung</h2>
            <p className="text-gray-700 leading-relaxed">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen oder Funktionen anzupassen. Die aktuelle Version ist stets auf dieser Seite verfügbar.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Bei Fragen zum Datenschutz wenden Sie sich bitte an:{" "}
            <a href="mailto:mia-app@schueu.ch" className="text-primary underline">
              mia-app@schueu.ch
            </a>
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Zurück zur Startseite</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
