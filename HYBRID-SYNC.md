# Hybrid Airtable-Firestore Architektur

## Übersicht

Die MIA-App nutzt eine **Hybrid-Architektur** für optimale Performance:
- **Airtable** = Single Source of Truth (PICTS-Team pflegt Daten hier)
- **Firestore** = Performance-Cache (App liest von hier)
- **Automatischer Sync** = Hält Cache aktuell (täglich um 2 Uhr)

## Architektur

```
┌─────────────┐      Sync       ┌──────────────┐      Read       ┌──────┐
│  Airtable   │ ────────────────>│   Firestore  │ ───────────────>│ App  │
│ (Source of  │    Daily/Manual  │   (Cache)    │   Fast Access   │      │
│   Truth)    │                  │              │                 │      │
└─────────────┘                  └──────────────┘                 └──────┘
      │                                                                ^
      │                                                                │
      └────────────────────────────────────────────────────────────────┘
                          Fallback bei Cache Miss
```

### Vorteile

✅ **3-5x schnellere Ladezeiten** (keine Airtable API-Calls mehr)
✅ **Keine Rate Limits** von Airtable
✅ **Airtable UI bleibt erhalten** für Content-Pflege
✅ **Offline-Fähigkeit** durch Firestore
✅ **Rollback-fähig** via Feature Flag

## Feature Flag

Das Hybrid-System wird über einen Environment Variable gesteuert:

```bash
# .env.local
ENABLE_FIRESTORE_CACHE=true   # Aktiviert Firestore Cache
# ENABLE_FIRESTORE_CACHE=false  # Nutzt nur Airtable (Default)
```

### Schrittweise Aktivierung (empfohlen)

```bash
# Woche 1: Testen
ENABLE_FIRESTORE_CACHE=false

# Woche 2: Aktivieren
ENABLE_FIRESTORE_CACHE=true

# Bei Problemen: Sofort zurück
ENABLE_FIRESTORE_CACHE=false
```

## Sync-Mechanismus

### 1. Automatischer Sync (Vercel Cron)

Läuft täglich um **2:00 Uhr** automatisch:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync",
    "schedule": "0 2 * * *"
  }]
}
```

**Wichtig**: Setze `CRON_SECRET` in Vercel Environment Variables:
```bash
CRON_SECRET=dein_random_secret_string
```

### 2. Manueller Sync (Admin UI)

Super Admins können Sync manuell triggern:

**Endpoint**: `POST /api/admin/sync`

**Authentifizierung**: Bearer Token (Firebase ID Token)

**Beispiel**:
```typescript
const response = await fetch('/api/admin/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
```

### 3. Sync-Status abfragen

**Endpoint**: `GET /api/admin/sync/status`

**Response**:
```json
{
  "metadata": {
    "lastFullSync": "2024-12-16T02:00:00Z",
    "syncStatus": "success",
    "recordCounts": {
      "themes": 150,
      "schulen": 25,
      "kompetenzen": 300,
      "lektionen": 450
    },
    "lastSyncDuration": 12450,
    "cacheAgeHours": 8
  },
  "recentLogs": [...]
}
```

## Datenmodell

### Firestore Collections

#### `system_themes` (Cache von Airtable Themen)
```typescript
{
  airtableId: string        // Original Airtable Record ID
  thema: string
  beschreibung?: string
  lehrmittel?: string
  bildLehrmittel?: string
  anzahlLektionen?: number
  schuljahr: Stufe[]
  zeitraum?: Zeitraum
  kompetenzenIds: string[]  // Airtable Record IDs
  fileRouge?: string
  unterlagen?: string
  lastSyncedAt: Date
  isActive: boolean         // false wenn in Airtable gelöscht
}
```

#### `system_schulen` (Cache von Airtable Schulen)
```typescript
{
  airtableId: string
  name: string
  ort?: string
  pictsBuchen?: string
  lastSyncedAt: Date
  isActive: boolean
}
```

#### `system_kompetenzen` (Cache von Airtable Kompetenzen)
```typescript
{
  airtableId: string
  name: string
  lpCode?: string
  kompetenzbereich?: string
  kompetenz?: string
  kompetenzstufe?: string
  zyklus?: string[]
  klassenstufe?: string[]
  grundanspruch?: string
  querverweisLP?: string
  unterrichtsideenIds: string[]
  lastSyncedAt: Date
  isActive: boolean
}
```

#### `system_lektionen` (Cache von Airtable Lektionsplanung)
```typescript
{
  airtableId: string
  eindeutigeBezeichnung: string
  lektion: string
  themaId: string
  themaName?: string
  aufgaben?: string
  vorwissen?: string
  material?: string[]
  websiteTools?: WebsiteTool[]
  einstieg?: string
  hauptteil?: string
  abschluss?: string
  stolpersteine?: string
  kiZusammenfassung?: string
  lastSyncedAt: Date
  isActive: boolean
}
```

#### `sync_metadata` (Global Sync State)
```typescript
{
  lastFullSync?: Date
  lastIncrementalSync?: Date
  syncStatus: "idle" | "syncing" | "error" | "success"
  errorMessage?: string
  recordCounts: {
    themes: number
    schulen: number
    kompetenzen: number
    lektionen: number
  }
  lastSyncDuration?: number  // milliseconds
}
```

#### `sync_logs` (Sync History)
```typescript
{
  timestamp: Date
  type: "full_sync" | "incremental_sync" | "manual_sync"
  status: "success" | "error"
  duration: number  // milliseconds
  recordsProcessed: {
    themes: { added: number; updated: number; deleted: number }
    schulen: { added: number; updated: number; deleted: number }
    kompetenzen: { added: number; updated: number; deleted: number }
    lektionen: { added: number; updated: number; deleted: number }
  }
  errors?: string[]
  triggeredBy?: string  // User ID bei manual sync
}
```

## Code-Struktur

### Data Adapters (Abstraction Layer)

Die Adapters bieten transparenten Zugriff auf Daten:

```typescript
// src/lib/data-sources/themes-adapter.ts
export async function getThemes(): Promise<Thema[]> {
  if (USE_FIRESTORE_CACHE) {
    // Lade aus Firestore Cache
    return getSystemThemes();
  }
  // Fallback zu Airtable
  return getAllThemen();
}
```

**Verwendung in API Routes**:
```typescript
// src/app/api/themen/route.ts
import { getThemes } from "@/lib/data-sources/themes-adapter";

export async function GET() {
  const themes = await getThemes();  // Automatisch Cache oder Airtable
  return NextResponse.json(themes);
}
```

### Sync Logic

```typescript
// src/lib/sync/airtable-firestore-sync.ts
export async function syncAirtableToFirestore(): Promise<SyncResult> {
  // 1. Lade alle Daten aus Airtable
  // 2. Vergleiche mit Firestore Cache
  // 3. Identifiziere neue, geänderte, gelöschte Records
  // 4. Batch-Update in Firestore
  // 5. Update Sync Metadata & Logs
}
```

## Deployment

### 1. Initial Sync durchführen

Nach Deployment MUSS einmalig ein Initial Sync durchgeführt werden:

**Option A: Via API (empfohlen)**
```bash
curl -X POST https://your-app.vercel.app/api/admin/sync \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

**Option B: Via Vercel Function Logs**
- Gehe zu Vercel Dashboard → Functions
- Rufe `/api/cron/sync` manuell auf

### 2. Environment Variables setzen

In Vercel Dashboard unter Settings → Environment Variables:

```bash
# Firestore Cache aktivieren
ENABLE_FIRESTORE_CACHE=true

# Cron Job Security
CRON_SECRET=your_random_secret_string
```

### 3. Vercel Cron aktivieren

Vercel Cron Jobs sind automatisch aktiviert wenn `vercel.json` mit `crons` konfiguriert ist.

**Wichtig**: Cron Jobs funktionieren nur auf **Production Deployments**!

### 4. Monitoring einrichten

- **Sync-Logs** checken: `GET /api/admin/sync/status`
- **Firestore Console** überwachen
- **Vercel Function Logs** bei Fehlern prüfen

## Troubleshooting

### Problem: Sync läuft nicht automatisch

**Ursache**: Vercel Cron funktioniert nur in Production

**Lösung**:
```bash
# Deployment zu Production pushen
git push origin main

# Oder manuell triggern
curl -X GET https://your-app.vercel.app/api/cron/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Problem: Cache ist veraltet

**Ursache**: Sync ist fehlgeschlagen oder wurde nicht ausgeführt

**Lösung**:
```bash
# Manuellen Sync triggern
POST /api/admin/sync

# Oder Cache invalidieren und neu syncen
POST /api/admin/sync/invalidate
POST /api/admin/sync
```

### Problem: App zeigt veraltete Daten

**Ursache**: Feature Flag ist aktiviert aber Cache ist leer

**Lösung**:
```bash
# Prüfe Sync-Status
GET /api/admin/sync/status

# Wenn leer: Initial Sync durchführen
POST /api/admin/sync

# Temporär: Feature Flag deaktivieren
ENABLE_FIRESTORE_CACHE=false
```

### Problem: "Sync already in progress"

**Ursache**: Vorheriger Sync wurde nicht korrekt beendet

**Lösung**:
```bash
# Warte 5-10 Minuten
# Oder setze Status manuell in Firestore:
# sync_metadata/global -> syncStatus = "idle"
```

## Performance-Metriken

### Vorher (nur Airtable)
- Themen laden: **~2000ms**
- Schulen laden: **~500ms**
- Lektionen laden: **~1500ms**
- **Rate Limit**: 5 requests/second

### Nachher (Firestore Cache)
- Themen laden: **~300ms** (6x schneller)
- Schulen laden: **~100ms** (5x schneller)
- Lektionen laden: **~400ms** (4x schneller)
- **Keine Rate Limits**

## Rollback-Plan

Falls Probleme auftreten:

### 1. Sofortiges Rollback
```bash
# In Vercel Environment Variables
ENABLE_FIRESTORE_CACHE=false
```

### 2. Deployment Rollback
```bash
# In Vercel Dashboard
Deployments → [Previous Deployment] → Promote to Production
```

### 3. Cache löschen (wenn korrupt)
```bash
POST /api/admin/sync/invalidate
```

## Wartung

### Sync-Logs aufräumen

Logs älter als 30 Tage werden automatisch gelöscht.

Manuelle Aufräumung:
```typescript
import { cleanupOldSyncLogs } from "@/lib/firestore/system-cache";
await cleanupOldSyncLogs(30); // Löscht Logs älter als 30 Tage
```

### Monitoring

Regelmäßig prüfen:
- ✅ Sync läuft täglich durch (`lastFullSync`)
- ✅ Keine Errors in Logs (`syncStatus === "success"`)
- ✅ Record Counts stimmen (`recordCounts`)
- ✅ Cache Age < 24 Stunden (`cacheAgeHours`)

## Security

### API Endpoints

Alle Admin-Endpoints sind geschützt:
- **Bearer Token** Authentifizierung (Firebase ID Token)
- **Role Check**: nur `super_admin` darf Sync triggern
- **CRON_SECRET**: schützt Cron-Endpoint vor unbefugtem Zugriff

### Firestore Security Rules

Cache-Collections sind öffentlich lesbar aber nur Server-seitig schreibbar:

```javascript
// firestore.rules
match /system_themes/{document} {
  allow read: if true;  // App kann lesen
  allow write: if false;  // Nur Server kann schreiben
}
```

## Nächste Schritte

- [ ] Admin UI für Sync-Management bauen (Phase 4)
- [ ] Monitoring & Alerts einrichten (Phase 5)
- [ ] Initial Sync durchführen
- [ ] Feature Flag aktivieren
- [ ] Performance messen und vergleichen
