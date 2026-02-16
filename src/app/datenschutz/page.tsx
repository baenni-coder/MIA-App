import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Users, Lock, Mail, Globe, Baby } from "lucide-react";

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
            Letzte Aktualisierung: 16. Februar 2026
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
              Verantwortlich für die Datenbearbeitung im Sinne des Schweizer Datenschutzgesetzes (DSG) ist:
            </p>
            <div className="bg-gray-50 p-4 rounded-md border">
              <p className="font-medium">PICTS BeLoSe</p>
              <p>Schulhausstrasse 14</p>
              <p>2545 Selzach</p>
              <p>Schweiz</p>
              <p className="mt-2">
                <Mail className="inline h-4 w-4 mr-1" />
                E-Mail: mia-app@schueu.ch
              </p>
            </div>
          </section>

          {/* 2. Geltungsbereich und Rechtsgrundlage */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Geltungsbereich und Rechtsgrundlage</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Diese Datenschutzerklärung gilt für die Nutzung der MIA-App (mia-app.ch). Sie richtet sich an Lehrpersonen, Schuladministratoren sowie Schülerinnen und Schüler, deren Daten über die App verarbeitet werden.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Die Datenbearbeitung erfolgt auf Grundlage des:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Schweizer Datenschutzgesetz (DSG / revDSG)</strong>, in Kraft seit 1. September 2023</li>
              <li><strong>Verordnung zum Datenschutzgesetz (DSV)</strong></li>
              <li>Ergänzend: <strong>EU-Datenschutz-Grundverordnung (DSGVO)</strong>, soweit anwendbar</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Die Bearbeitung stützt sich auf folgende Rechtsgrundlagen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-2">
              <li><strong>Art. 6 Abs. 6 DSG:</strong> Einwilligung der betroffenen Person (bei Registrierung)</li>
              <li><strong>Art. 31 Abs. 1 DSG:</strong> Vertragserfüllung (Bereitstellung der App-Funktionen)</li>
              <li><strong>Art. 31 Abs. 1 DSG:</strong> Überwiegendes Interesse (technische Administration, Sicherheit)</li>
            </ul>
          </section>

          {/* 3. Erhobene Daten */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">3. Welche Daten bearbeiten wir?</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Bei der Nutzung der MIA-App werden folgende Personendaten bearbeitet:
            </p>
            <h3 className="font-semibold text-lg mb-2">Lehrpersonen</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-4">
              <li><strong>Registrierung:</strong> Name, E-Mail-Adresse, Schul-Zuordnung, Klassenstufe, Kanton</li>
              <li><strong>Authentifizierung:</strong> Firebase Authentication Tokens, Session-Daten</li>
              <li><strong>Nutzungsdaten:</strong> Erstellte Themen, Lektionspläne, Kompetenzen-Auswahl, Jahresplanung</li>
              <li><strong>Hochgeladene Inhalte:</strong> Lehrmittel-Bilder, Schul-Dateien (PDFs, Dokumente)</li>
              <li><strong>Benachrichtigungen:</strong> Name, E-Mail-Adresse bei Theme-Reviews</li>
            </ul>
            <h3 className="font-semibold text-lg mb-2">Schülerinnen und Schüler</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-4">
              <li><strong>Kontodaten:</strong> Name, E-Mail-Adresse (durch Lehrperson erfasst)</li>
              <li><strong>Kompetenzbewertungen:</strong> Selbstbewertungen (1-3 Sterne) und Lehrer-Bestätigungen</li>
              <li><strong>Artefakte:</strong> Hochgeladene Belege (Bilder, PDFs, Links) für Kompetenzen</li>
              <li><strong>Avatar:</strong> Personalisierte Avatar-Konfiguration</li>
              <li><strong>Badges:</strong> Von Lehrpersonen vergebene Auszeichnungen</li>
            </ul>
            <h3 className="font-semibold text-lg mb-2">Technische Daten</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Server-Logs:</strong> IP-Adresse, Browser-Typ, Geräteinformationen</li>
              <li><strong>Rate-Limiting:</strong> IP-Adressen werden temporär (max. 15 Minuten) zur Missbrauchserkennung gespeichert</li>
            </ul>
          </section>

          {/* 4. Zweck der Datenbearbeitung */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Zweck der Datenbearbeitung</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Ihre Daten werden zu folgenden Zwecken bearbeitet:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Bereitstellung und Betrieb der MIA-App</li>
              <li>Verwaltung von Benutzerkonten (Lehrpersonen und Schüler)</li>
              <li>Ermöglichung der Jahresplan-Erstellung und -Verwaltung</li>
              <li>Kompetenzenpass: Bewertung und Dokumentation von Schülerkompetenzen</li>
              <li>Review-Workflow für eigene Themen (PICTS-Admin Benachrichtigungen)</li>
              <li>Schulinternes Teilen von Dateien und Unterrichtsmaterialien</li>
              <li>Technische Administration, Sicherheit und Fehlerdiagnose</li>
            </ul>
          </section>

          {/* 5. Schülerdaten (Minderjährige) */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Baby className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">5. Bearbeitung von Schülerdaten (Minderjährige)</h2>
            </div>
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
              <p className="text-gray-700 leading-relaxed">
                Die MIA-App verarbeitet auch Personendaten von <strong>Schülerinnen und Schülern</strong>, die in der Regel minderjährig sind. Für diese Daten gelten besondere Sorgfaltspflichten.
              </p>
            </div>
            <ul className="list-disc list-inside space-y-3 text-gray-700 ml-4">
              <li>
                <strong>Konto-Erstellung durch Lehrpersonen:</strong> Schüler-Accounts werden ausschliesslich durch Lehrpersonen erstellt. Schüler können sich nicht selbst registrieren.
              </li>
              <li>
                <strong>Einwilligung der Erziehungsberechtigten:</strong> Die Lehrperson ist dafür verantwortlich, vor der Erfassung von Schülerdaten die Einwilligung der Erziehungsberechtigten einzuholen. Die App stellt hierzu eine Vorlage bereit.
              </li>
              <li>
                <strong>Datenminimierung:</strong> Es werden nur die für den Bildungszweck notwendigen Daten erhoben (Name, E-Mail, Kompetenzbewertungen).
              </li>
              <li>
                <strong>Kein Profiling:</strong> Es findet kein Profiling mit hohem Risiko und keine automatisierte Entscheidungsfindung statt.
              </li>
              <li>
                <strong>Zugriffsbeschränkung:</strong> Auf Schülerdaten haben nur die zuständige Lehrperson und Schuladministratoren Zugriff.
              </li>
              <li>
                <strong>Löschung:</strong> Bei Löschung eines Schüler-Accounts werden alle zugehörigen Daten (Bewertungen, Artefakte, Badges) vollständig gelöscht.
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Hinweis für Erziehungsberechtigte:</strong> Sie können jederzeit Auskunft über die Daten Ihres Kindes verlangen, eine Korrektur oder Löschung beantragen. Wenden Sie sich dazu an die zuständige Lehrperson oder direkt an uns unter <strong>mia-app@schueu.ch</strong>.
            </p>
          </section>

          {/* 6. Drittanbieter */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">6. Weitergabe an Drittanbieter und Datenübermittlung ins Ausland</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Wir nutzen folgende Drittanbieter zur Bereitstellung der App. Diese befinden sich teilweise in den <strong>USA</strong>:
            </p>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="font-semibold mb-2">Firebase / Google Cloud (USA)</h3>
                <p className="text-sm text-gray-700">
                  <strong>Zweck:</strong> Authentifizierung, Datenbank (Firestore), File Storage
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Daten:</strong> Alle Benutzer- und Inhaltsdaten
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Datenschutz:</strong> <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firebase Privacy Policy</a>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>AVV:</strong> <a href="https://cloud.google.com/terms/data-processing-addendum" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud DPA</a>
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <h3 className="font-semibold mb-2">Airtable (USA)</h3>
                <p className="text-sm text-gray-700">
                  <strong>Zweck:</strong> Verwaltung von System-Themen, Schulen, Kompetenzen (nur Systemdaten, keine Benutzerdaten)
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Datenschutz:</strong> <a href="https://www.airtable.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Airtable Privacy Policy</a>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>AVV:</strong> <a href="https://www.airtable.com/company/data-processing-addendum" target="_blank" rel="noopener noreferrer" className="text-primary underline">Airtable DPA</a>
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                <h3 className="font-semibold mb-2">Vercel (USA)</h3>
                <p className="text-sm text-gray-700">
                  <strong>Zweck:</strong> Hosting der Web-Anwendung, Server-Logs
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Daten:</strong> IP-Adressen, HTTP-Anfragen (Server-Logs)
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Datenschutz:</strong> <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Vercel Privacy Policy</a>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>AVV:</strong> <a href="https://vercel.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-primary underline">Vercel DPA</a>
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
                <h3 className="font-semibold mb-2">DiceBear API</h3>
                <p className="text-sm text-gray-700">
                  <strong>Zweck:</strong> Generierung personalisierter Schüler-Avatare
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Daten:</strong> Pseudonymisierter Seed-Wert (kein Name oder andere Personendaten)
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Datenschutz:</strong> <a href="https://www.dicebear.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline">DiceBear Privacy Policy</a>
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mt-4">
              <h3 className="font-semibold mb-2">Datenübermittlung ins Ausland (Art. 16/17 DSG)</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Personendaten werden an Dienstleister in den <strong>USA</strong> übermittelt. Die USA verfügen gemäss der{" "}
                <a href="https://www.bj.admin.ch/bj/de/home/staat/datenschutz/international/anerkennung.html" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Staatenliste des Bundesrates
                </a>{" "}
                über ein angemessenes Datenschutzniveau, sofern die Empfänger dem Swiss-US Data Privacy Framework unterstehen. Zusätzlich basiert die Übermittlung auf EU-Standardvertragsklauseln (SCCs) und den Auftragsbearbeitungsverträgen (AVV/DPA) der jeweiligen Anbieter.
              </p>
            </div>
          </section>

          {/* 7. Speicherdauer */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Speicherdauer</h2>
            <p className="text-gray-700 leading-relaxed">
              Ihre Daten werden gespeichert, solange:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-2">
              <li>Ihr Benutzerkonto aktiv ist</li>
              <li>Sie die App nutzen</li>
              <li>Gesetzliche Aufbewahrungsfristen bestehen</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Bei Löschung Ihres Kontos werden alle personenbezogenen Daten innerhalb von <strong>30 Tagen</strong> gelöscht. Dies umfasst:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-2">
              <li>Profildaten (Name, E-Mail, Schul-Zuordnung)</li>
              <li>Erstellte Inhalte (Themen, Lektionen, Dateien)</li>
              <li>Bei Schülern: Bewertungen, Artefakte, Badges</li>
              <li>Authentifizierungsdaten (Firebase Auth Account)</li>
            </ul>
          </section>

          {/* 8. Ihre Rechte */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">8. Ihre Rechte</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Sie haben gemäss dem Schweizer Datenschutzgesetz (DSG) und ergänzend der DSGVO folgende Rechte:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">Auskunftsrecht (Art. 25 DSG)</h3>
                <p className="text-sm text-gray-700">
                  Sie können kostenlos Auskunft über Ihre gespeicherten Daten erhalten. Wir antworten innert 30 Tagen.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">Berichtigungsrecht (Art. 32 DSG)</h3>
                <p className="text-sm text-gray-700">
                  Sie können unrichtige Daten korrigieren lassen.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">Löschrecht (Art. 32 DSG)</h3>
                <p className="text-sm text-gray-700">
                  Sie können die Löschung Ihrer Daten verlangen. Über die App können Sie Ihr Konto selbst löschen.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">Widerspruchsrecht</h3>
                <p className="text-sm text-gray-700">
                  Sie können der Bearbeitung Ihrer Daten widersprechen.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">Datenherausgabe (Art. 28 DSG)</h3>
                <p className="text-sm text-gray-700">
                  Sie können Ihre Daten in einem gängigen elektronischen Format herausverlangen.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md border">
                <h3 className="font-semibold mb-2">Einschränkung der Bearbeitung</h3>
                <p className="text-sm text-gray-700">
                  Sie können die Einschränkung der Bearbeitung Ihrer Daten verlangen.
                </p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              Zur Ausübung Ihrer Rechte kontaktieren Sie uns bitte unter: <strong>mia-app@schueu.ch</strong>
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              Bei Schülerdaten können Erziehungsberechtigte diese Rechte im Namen ihrer Kinder ausüben.
            </p>
          </section>

          {/* 9. Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Cookies und lokale Speicherung</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Die MIA-App verwendet ausschliesslich <strong>technisch notwendige Cookies</strong> für:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Firebase Authentication (Session-Management, Login-Status)</li>
              <li>Lokale Einstellungen im Browser (Sidebar-Status, Dashboard-Konfiguration via localStorage)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Werbe-Cookies, Tracking-Cookies oder Analytics-Dienste</strong> werden <strong>nicht</strong> verwendet.
            </p>
          </section>

          {/* 10. Datensicherheit */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Datensicherheit</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Wir setzen angemessene technische und organisatorische Massnahmen ein, um Ihre Daten gemäss Art. 8 DSG zu schützen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>TLS/SSL-Verschlüsselung für alle Datenübertragungen (HTTPS)</li>
              <li>Firebase Authentication mit Token-basierter Authentifizierung</li>
              <li>Firestore Security Rules (rollenbasierte Zugriffskontrolle)</li>
              <li>Strikte Trennung von Schul- und Nutzerdaten</li>
              <li>Content Security Policy (CSP) zum Schutz vor Cross-Site-Scripting</li>
              <li>Rate-Limiting zum Schutz vor Brute-Force-Angriffen</li>
              <li>Kein Zugriff auf schulfremde Benutzerprofile oder Schülerdaten</li>
            </ul>
          </section>

          {/* 11. Beschwerderecht */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Beschwerderecht</h2>
            <p className="text-gray-700 leading-relaxed">
              Sie haben das Recht, sich bei der zuständigen Datenschutz-Aufsichtsbehörde zu beschweren:
            </p>
            <div className="bg-gray-50 p-4 rounded-md border mt-4">
              <p className="font-medium">Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)</p>
              <p>Feldeggweg 1</p>
              <p>3003 Bern</p>
              <p className="mt-2">
                Website: <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary underline">www.edoeb.admin.ch</a>
              </p>
            </div>
          </section>

          {/* 12. Änderungen */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Änderungen der Datenschutzerklärung</h2>
            <p className="text-gray-700 leading-relaxed">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen oder Funktionen der App anzupassen. Die aktuelle Version ist stets auf dieser Seite verfügbar. Wesentliche Änderungen werden den Nutzern über die App mitgeteilt.
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
