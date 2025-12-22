# Sicherheits- und Datenschutz-Audit: MIA-App

**Datum:** 2025-12-22
**Durchgeführt von:** Claude Code
**Scope:** Vollständige Code-Review mit Fokus auf Sicherheit und Datenschutz (DSGVO)

---

## Executive Summary

Die MIA-App weist grundsätzlich eine **solide Sicherheitsarchitektur** auf, hat jedoch **kritische Sicherheitslücken** in der API-Authentifizierung und **erhebliche Datenschutz-Defizite** bezüglich DSGVO-Konformität.

**Risiko-Level:**
- 🔴 **KRITISCH:** 3 Findings
- 🟠 **HOCH:** 4 Findings
- 🟡 **MITTEL:** 5 Findings
- 🔵 **NIEDRIG/INFO:** 6 Findings
- 🟣 **DATENSCHUTZ:** 7 DSGVO-relevante Findings

**Empfohlene Maßnahmen:** Sofortige Behebung der kritischen Sicherheitslücken vor Produktiv-Deployment.

---

## 🔴 KRITISCHE Sicherheitslücken

### 1. Fehlende Authentifizierung in `/api/teachers` (POST/GET/PUT)

**Datei:** `src/app/api/teachers/route.ts`

**Problem:**
Die `/api/teachers` API-Endpunkte haben **KEINE Authentifizierung**. Jeder kann:
- Lehrerprofile erstellen (POST)
- Lehrerprofile abrufen (GET)
- Lehrerprofile ändern, inkl. **Rollen-Eskalation** (PUT)

**Betroffener Code:**
```typescript
// POST /api/teachers - KEINE Auth-Prüfung!
export async function POST(request: Request) {
  try {
    const { userId, email, name, schuleId, stufe, role } = await request.json();
    // Kein Token-Check!
    await adminDb.collection("teachers").doc(userId).set({
      email, name, schuleId, stufe,
      role: role || "teacher", // ⚠️ role kann überschrieben werden!
    });
  }
}

// PUT /api/teachers - KEINE Auth-Prüfung!
export async function PUT(request: Request) {
  const { userId, stufe, role } = await request.json();
  // ⚠️ Jeder kann role ändern!
  if (role) updateData.role = role;
  await adminDb.collection("teachers").doc(userId).update(updateData);
}
```

**Risiko:**
- ⚠️ **Privilege Escalation:** Jeder kann sich selbst zum `super_admin` machen
- ⚠️ **Data Breach:** Jeder kann beliebige Lehrerprofile lesen
- ⚠️ **Account Takeover:** Fremde User-IDs können überschrieben werden

**Lösung:**
```typescript
export async function POST(request: Request) {
  // 1. Token-Authentifizierung
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const adminAuth = getAdminAuth();
  const decodedToken = await adminAuth.verifyIdToken(token);
  const authenticatedUserId = decodedToken.uid;

  const { userId, email, name, schuleId, stufe } = await request.json();

  // 2. Sicherstellen dass User nur sein eigenes Profil erstellt
  if (userId !== authenticatedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Role IMMER auf "teacher" setzen (nicht vom Client übernehmen!)
  await adminDb.collection("teachers").doc(userId).set({
    email, name, schuleId, stufe,
    role: "teacher", // Hardcoded!
    createdAt: new Date().toISOString(),
  });
}

export async function PUT(request: Request) {
  // Token-Check wie oben
  const decodedToken = await adminAuth.verifyIdToken(token);
  const authenticatedUserId = decodedToken.uid;

  const { userId, stufe, role } = await request.json();

  // User darf nur sein eigenes Profil ändern
  if (userId !== authenticatedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, any> = {};
  if (stufe) updateData.stufe = stufe;

  // Role-Updates NUR durch Super-Admin
  if (role) {
    const isAdmin = await isSuperAdmin(authenticatedUserId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Only super admins can change roles" }, { status: 403 });
    }
    updateData.role = role;
  }

  await adminDb.collection("teachers").doc(userId).update(updateData);
}
```

**Priorität:** 🔴 **SOFORT BEHEBEN**

---

### 2. Schwache Cron-Job Authentifizierung

**Datei:** `src/app/api/cron/sync/route.ts:16-22`

**Problem:**
Der Cron-Endpunkt prüft `CRON_SECRET`, aber **nur wenn diese gesetzt ist**. Wenn `CRON_SECRET` fehlt, ist der Endpoint **komplett offen**.

**Betroffener Code:**
```typescript
const cronSecret = process.env.CRON_SECRET;

// Prüfe ob Request von Vercel Cron kommt
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  // ⚠️ Wenn cronSecret NICHT gesetzt ist, wird nicht geprüft!
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Risiko:**
- ⚠️ **Denial of Service:** Jeder kann Sync triggern → Hohe Airtable API-Kosten
- ⚠️ **Resource Exhaustion:** Parallel-Syncs können Server überlasten

**Lösung:**
```typescript
const cronSecret = process.env.CRON_SECRET;

// IMMER prüfen - auch wenn nicht gesetzt
if (!cronSecret) {
  console.error("CRON_SECRET not configured - rejecting request");
  return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
}

if (authHeader !== `Bearer ${cronSecret}`) {
  console.warn("Unauthorized cron attempt");
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Zusätzlich:** Vercel Cron Header prüfen:
```typescript
// Vercel setzt diesen Header bei Cron-Jobs
const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Priorität:** 🔴 **HOCH**

---

### 3. PICTS-Link Injection Risiko

**Dateien:**
- `src/lib/airtable/schulen.ts`
- `src/app/api/teachers/route.ts:60-64`

**Problem:**
Der PICTS-Buchungslink wird direkt aus Airtable geladen und ohne Validierung an den Client gesendet. Ein manipulierter Airtable-Eintrag könnte **Phishing-Links** oder **Malware** einschleusen.

**Risiko:**
- ⚠️ **Phishing:** Link zu gefälschter Login-Seite
- ⚠️ **XSS (indirekt):** `javascript:alert()` URLs könnten im Browser ausgeführt werden

**Lösung:**
```typescript
// src/lib/airtable/schulen.ts
function validateURL(url: string | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    // Nur HTTPS erlauben (keine javascript:, data:, etc.)
    if (parsed.protocol !== 'https:') {
      console.warn(`Invalid PICTS URL protocol: ${parsed.protocol}`);
      return null;
    }
    // Optional: Whitelist erlaubter Domains
    const allowedDomains = ['picts-buchung.ch', 'schulevents.ch'];
    if (!allowedDomains.some(domain => parsed.hostname.includes(domain))) {
      console.warn(`PICTS URL not in whitelist: ${parsed.hostname}`);
      return null;
    }
    return url;
  } catch (error) {
    console.warn(`Invalid PICTS URL: ${url}`);
    return null;
  }
}

export async function getSchuleById(id: string): Promise<Schule | null> {
  // ...
  const pictsBuchen = validateURL(getString(record.fields["PICTS buchen"]));
  return {
    id: record.id,
    name: getString(record.fields.Name) || "Unbekannte Schule",
    ort: getString(record.fields.Ort) || "",
    pictsBuchen: pictsBuchen || undefined, // null → undefined
  };
}
```

**Client-seitig zusätzlich:**
```tsx
// Verwende rel="noopener noreferrer" bei externen Links
<a href={schule.pictsBuchen} target="_blank" rel="noopener noreferrer">
  PICTS buchen
</a>
```

**Priorität:** 🔴 **HOCH**

---

## 🟠 HOHE Sicherheitsrisiken

### 4. Fehlende Rate Limiting

**Problem:**
Keine Rate Limits auf API-Endpunkten ermöglicht:
- **Brute Force Attacks** auf Login
- **DoS** durch API-Flooding
- **Credential Stuffing**

**Lösung:** Vercel Edge Config + Rate Limiting Middleware:
```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }

  return NextResponse.next();
}
```

**Alternative (ohne Redis):** Next.js Middleware mit In-Memory Map (nicht für multi-instance!)

**Priorität:** 🟠 **HOCH**

---

### 5. Fehlende CORS-Konfiguration

**Problem:**
Keine explizite CORS-Policy. Next.js erlaubt standardmäßig alle Origins.

**Lösung:**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "https://mia-app.ch" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};
```

**Priorität:** 🟠 **HOCH**

---

### 6. Fehlende Content Security Policy (CSP)

**Problem:**
Keine CSP-Headers → Anfällig für XSS-Angriffe.

**Lösung:**
```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://storage.googleapis.com;
  font-src 'self';
  connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://api.airtable.com;
  frame-src 'self';
`;

module.exports = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader.replace(/\n/g, "") },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
```

**Priorität:** 🟠 **MITTEL**

---

### 7. Error Messages offenbaren zu viel Information

**Beispiel:**
```typescript
// src/app/api/custom-themes/route.ts:93-97
if ((error as any).code === "auth/argument-error") {
  return NextResponse.json({ error: "Invalid token" }, { status: 401 });
}
// ⚠️ Generische Error Message ist gut, aber Stack Traces könnten leaken
```

**Problem:**
In Produktionsumgebung könnten Stack Traces an den Client gesendet werden.

**Lösung:**
```typescript
// Niemals Stack Traces in Produktion senden
catch (error) {
  console.error("Error in POST /api/custom-themes:", error);

  // Nur generische Fehlermeldung
  return NextResponse.json(
    { error: "Failed to create custom theme" },
    { status: 500 }
  );
  // NICHT: { error: error.message, stack: error.stack }
}
```

**Zusätzlich:** `NODE_ENV=production` in Vercel setzen.

**Priorität:** 🟠 **MITTEL**

---

## 🟡 MITTLERE Sicherheitsrisiken

### 8. Fehlende URL-Validierung

**Dateien:**
- `src/components/CustomThemeForm.tsx:525` (unterlagen)
- `src/lib/firestore/notifications.ts:278` (actionUrl)

**Problem:**
URLs werden ohne Validierung gespeichert. Könnte zu **Open Redirect** oder **Phishing** führen.

**Lösung:**
```typescript
function validateURL(url: string, allowedProtocols = ['https:', 'http:']): boolean {
  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// In Form:
if (unterlagen && !validateURL(unterlagen, ['https:'])) {
  alert("Bitte geben Sie eine gültige HTTPS-URL ein.");
  return;
}
```

**Priorität:** 🟡 **MITTEL**

---

### 9. Fehlende Validierung von Airtable Record IDs

**Problem:**
`kompetenzenIds` wird ohne Validierung gespeichert. Ein Angreifer könnte:
- Ungültige IDs einschleusen → DoS durch API-Fehler
- Kompetenzen anderer Schulen referenzieren

**Lösung:**
```typescript
// Validiere Airtable Record ID Format
function isValidAirtableRecordId(id: string): boolean {
  return /^rec[a-zA-Z0-9]{14}$/.test(id);
}

// In API:
if (kompetenzenIds && !kompetenzenIds.every(isValidAirtableRecordId)) {
  return NextResponse.json(
    { error: "Invalid kompetenz ID format" },
    { status: 400 }
  );
}
```

**Priorität:** 🟡 **NIEDRIG**

---

### 10. Image Upload: Nur Client-seitige Typ-Validierung

**Datei:** `src/components/CustomThemeForm.tsx:343`

**Problem:**
```tsx
<Input accept="image/jpeg,image/png,image/webp" />
```
Kann leicht umgangen werden (z.B. Browser DevTools).

**Gut:** Server validiert auch (`src/lib/storage/upload.ts:98-106`), aber **nur MIME-Type**, nicht **Magic Bytes**.

**Verbesserung:**
```typescript
// src/lib/storage/upload.ts
import sharp from 'sharp';

export async function validateImageContent(buffer: Buffer): Promise<boolean> {
  try {
    // sharp wirft Fehler wenn kein gültiges Bild
    const metadata = await sharp(buffer).metadata();
    const allowedFormats = ['jpeg', 'png', 'webp'];
    return allowedFormats.includes(metadata.format || '');
  } catch {
    return false;
  }
}

// In upload API:
const contentValid = await validateImageContent(buffer);
if (!contentValid) {
  return NextResponse.json({ error: "Invalid image file" }, { status: 400 });
}
```

**Priorität:** 🟡 **NIEDRIG**

---

### 11. Firebase Storage: Öffentlich lesbare Bilder

**Datei:** `storage.rules:30`

**Problem:**
```
allow read: if true;
```
Alle hochgeladenen Bilder sind **öffentlich** zugänglich.

**Risiko:**
- Versehentlich hochgeladene sensible Dokumente sind weltweit abrufbar
- Keine Möglichkeit, Bilder privat zu halten

**Aktuell:** Gewolltes Verhalten (für Jahresplan-Anzeige)

**Empfehlung:**
- ⚠️ **User-Warnung** beim Upload: "Hochgeladene Bilder sind öffentlich sichtbar"
- Alternative: Signed URLs statt public URLs

**Priorität:** 🟡 **INFO** (gewolltes Verhalten, aber Datenschutzrisiko)

---

### 12. Fehlende Input Sanitization

**Problem:**
Benutzereingaben werden direkt in Firestore gespeichert ohne Sanitization.

**Aktuell:** Kein direktes XSS-Risiko, da React automatisch escaped.

**Aber:** Bei Export (PDF, Markdown) könnten Injection-Probleme entstehen.

**Beispiel:**
```typescript
// Wenn ein User "<script>alert('xss')</script>" als Thema eingibt:
// - In React: Sicher (automatisch escaped)
// - In PDF Export: Könnte problematisch sein
```

**Lösung:** DOMPurify oder ähnliche Library verwenden.

**Priorität:** 🟡 **NIEDRIG** (React schützt aktuell)

---

## 🔵 Positive Findings (Gut implementiert)

### ✅ 1. Firebase Security Rules sind robust

**Datei:** `firestore.rules`

Die Firestore Security Rules sind **sehr gut** implementiert:
- ✅ Role-based Access Control (RBAC)
- ✅ Owner-Checks bei Custom Themes
- ✅ Verhindert Role-Escalation (nur Super-Admin kann Rollen ändern)
- ✅ Leserechte korrekt implementiert (systemwide vs. private)

**Beispiel:**
```javascript
allow update: if isAuthenticated() && (
  // Normale Updates (stufe, etc.)
  (isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(["role"])) ||
  // Role-Updates nur durch Super-Admin
  (isSuperAdmin(request.auth.uid))
);
```

### ✅ 2. Kein `dangerouslySetInnerHTML`

Keine Verwendung von `dangerouslySetInnerHTML` in der gesamten Codebase → **XSS-sicher**.

### ✅ 3. Keine eval() oder Function() Konstrukte

Keine Code-Injection-Vektoren gefunden.

### ✅ 4. Keine Secrets in Logs

Keine `console.log(password)` oder ähnliche Leaks gefunden.

### ✅ 5. Umgebungsvariablen korrekt verwendet

`.env.example` zeigt Struktur, echte Werte sind nicht im Repo.

### ✅ 6. Lazy Initialization Pattern

Verhindert Server-seitige Initialisierungsfehler:
```typescript
// Firebase nur im Browser
if (typeof window !== "undefined") {
  app = initializeApp(firebaseConfig);
}
```

---

## 🟣 DATENSCHUTZ (DSGVO-Konformität)

### DSGVO-1: Fehlende Datenschutzerklärung

**Problem:**
Keine Privacy Policy / Datenschutzerklärung im Frontend.

**DSGVO-Anforderung:**
Art. 13 DSGVO verlangt Informationspflicht bei Datenerhebung.

**Lösung:**
- Privacy Policy Seite erstellen (`/datenschutz`)
- Informationen über:
  - Welche Daten gesammelt werden (Name, Email, Schule, etc.)
  - Rechtsgrundlage (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO)
  - Speicherdauer
  - Empfänger der Daten (Firebase/Google, Airtable)
  - Rechte der Betroffenen
  - Verantwortlicher & Datenschutzbeauftragter

**Priorität:** 🟣 **KRITISCH** (DSGVO-Pflicht)

---

### DSGVO-2: Fehlende Cookie-Einwilligung

**Problem:**
Firebase Auth setzt Cookies ohne vorherige Einwilligung.

**DSGVO-Anforderung:**
Art. 6 Abs. 1 lit. a DSGVO + ePrivacy-Richtlinie

**Lösung:**
Cookie-Banner implementieren (z.B. mit Cookiebot, OneTrust, oder Custom)

**Priorität:** 🟣 **HOCH**

---

### DSGVO-3: Fehlendes Recht auf Auskunft

**Problem:**
User können ihre gespeicherten Daten nicht einsehen.

**DSGVO-Anforderung:**
Art. 15 DSGVO - Auskunftsrecht

**Lösung:**
API-Endpunkt `/api/gdpr/export` erstellen:
```typescript
export async function GET(request: NextRequest) {
  const userId = await authenticateUser(request);

  // Hole alle Daten des Users
  const teacherProfile = await getTeacherProfile(userId);
  const customThemes = await getCustomThemes({ createdBy: userId });
  const customLektionen = await getCustomLektionen({ createdBy: userId });
  const notifications = await getNotifications(userId);

  const dataExport = {
    profile: teacherProfile,
    themes: customThemes,
    lektionen: customLektionen,
    notifications: notifications,
    exportDate: new Date().toISOString(),
  };

  return NextResponse.json(dataExport);
}
```

**Priorität:** 🟣 **HOCH**

---

### DSGVO-4: Fehlendes Recht auf Löschung

**Problem:**
User können ihr Konto nicht selbst löschen.

**DSGVO-Anforderung:**
Art. 17 DSGVO - Recht auf Vergessenwerden

**Lösung:**
```typescript
// src/app/api/gdpr/delete-account/route.ts
export async function DELETE(request: NextRequest) {
  const userId = await authenticateUser(request);

  // 1. Lösche alle Custom Themes
  await deleteAllCustomThemes(userId);

  // 2. Lösche alle Lektionen
  await deleteAllCustomLektionen(userId);

  // 3. Lösche Notifications
  await deleteAllNotifications(userId);

  // 4. Lösche Teacher Profile
  await deleteTeacherProfile(userId);

  // 5. Lösche Firebase Auth User
  const adminAuth = getAdminAuth();
  await adminAuth.deleteUser(userId);

  return NextResponse.json({ success: true });
}
```

**Wichtig:** User muss explizit bestätigen (Passwort-Re-Auth).

**Priorität:** 🟣 **HOCH**

---

### DSGVO-5: Email-Adressen in Notifications

**Datei:** `src/lib/firestore/notifications.ts`

**Problem:**
Email-Adressen werden in Notification-Dokumenten gespeichert:
```typescript
createdByEmail: string;
```

**Risiko:**
Wenn Empfänger (z.B. PICTS-Admin) gehackt wird, sind alle Teacher-Emails sichtbar.

**Lösung:**
Email nur bei Bedarf aus Teacher-Profil laden, nicht duplizieren:
```typescript
// Statt Email in Notification speichern:
{
  createdById: userId, // Nur ID
  // Bei Anzeige: Email aus teachers/{userId} laden
}
```

**Priorität:** 🟣 **MITTEL**

---

### DSGVO-6: Fehlende Auftragsverarbeitungsverträge (AVV)

**Problem:**
Nutzung von Drittdiensten ohne erkennbare AVVs:
- Firebase/Google Cloud (USA)
- Airtable (USA)
- Vercel (USA)

**DSGVO-Anforderung:**
Art. 28 DSGVO - Auftragsverarbeiter

**Lösung:**
- AVV mit Google (Firebase): https://cloud.google.com/terms/data-processing-addendum
- AVV mit Airtable: https://www.airtable.com/company/data-processing-addendum
- AVV mit Vercel: https://vercel.com/legal/dpa
- Standardvertragsklauseln (SCCs) für USA-Transfer

**Priorität:** 🟣 **KRITISCH** (rechtliche Pflicht)

---

### DSGVO-7: Fehlende Datenschutz-Folgenabschätzung (DSFA)

**Problem:**
Keine erkennbare DSFA durchgeführt.

**DSGVO-Anforderung:**
Art. 35 DSGVO - Bei hohem Risiko für Betroffene

**Einschätzung:**
- Verarbeitung von Lehrerdaten (sensibel)
- Profile mit Schul-Zuordnung
- Review-System mit Feedback
→ **DSFA empfohlen**

**Priorität:** 🟣 **MITTEL**

---

## Weitere Empfehlungen

### 1. Sicherheits-Headers komplett

```typescript
// next.config.js
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
];
```

### 2. Dependency Audit

```bash
npm audit
npm audit fix
```

**Aktuell:** Keine bekannten Vulnerabilities in `package.json`.

### 3. Logging & Monitoring

- Sentry für Error Tracking
- Firebase Analytics für Usage Monitoring
- Alert bei verdächtigen Aktivitäten (z.B. 100x Login-Fehler)

### 4. Backup-Strategie

- Firestore: Automatisches Daily Backup
- Airtable: Export-Script für Desaster Recovery

---

## Zusammenfassung & Priorisierung

### Sofort beheben (vor Produktiv-Deployment):

1. 🔴 `/api/teachers` Authentifizierung implementieren
2. 🔴 `CRON_SECRET` Validierung verschärfen
3. 🔴 PICTS-Link URL-Validierung
4. 🟣 Datenschutzerklärung erstellen
5. 🟣 AVVs mit Drittdiensten abschließen

### Kurzfristig (innerhalb 1 Monat):

6. 🟠 Rate Limiting implementieren
7. 🟠 CORS-Policy konfigurieren
8. 🟠 CSP-Headers setzen
9. 🟣 Cookie-Banner implementieren
10. 🟣 GDPR Export/Delete Endpunkte

### Mittelfristig (innerhalb 3 Monate):

11. 🟡 URL-Validierung überall
12. 🟡 Airtable Record ID Validierung
13. 🟡 Image Content Validation (Magic Bytes)
14. 🟣 Email aus Notifications entfernen
15. 🟣 DSFA durchführen

---

## Testing-Empfehlungen

### Penetration Testing:

```bash
# 1. OWASP ZAP Scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://mia-app.ch

# 2. SQL Injection Testing (N/A - NoSQL)

# 3. Auth Bypass Testing
curl -X POST https://mia-app.ch/api/teachers \
  -H "Content-Type: application/json" \
  -d '{"userId":"attacker","email":"evil@example.com","role":"super_admin"}'
# Sollte: 401 Unauthorized
# Ist aktuell: 200 OK ⚠️

# 4. XSS Testing
# In Thema-Beschreibung: <script>alert('XSS')</script>
# React escaped automatisch → Sicher ✅

# 5. CSRF Testing
# Next.js hat CSRF-Protection via SameSite Cookies ✅
```

---

## Kontakt bei Rückfragen

Bei Fragen zu diesem Audit:
- Sicherheitsrelevante Issues: **NICHT** öffentlich auf GitHub
- Private Disclosure per Email an Security-Team

**Nächste Schritte:**
1. Findings priorisieren
2. Tickets erstellen (Security-Label)
3. Fix-Deadline setzen
4. Re-Audit nach Fixes

---

**Ende des Berichts**
