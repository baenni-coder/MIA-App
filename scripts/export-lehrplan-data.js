#!/usr/bin/env node
/**
 * Export-Script: Kompletter Lehrplan-/API-Datensatz aus Firestore → JSON
 *
 * Exportiert die in Firestore gecachten LP21- und Airtable-Daten als JSON-Dateien.
 * Diese Collections werden über die Admin-Sync-Routen der App befüllt
 * (LP21-API-Crawler + Airtable). Ein aktueller Sync ist also Voraussetzung
 * dafür, dass der Export vollständig ist.
 *
 * Voraussetzungen:
 *   - .env.local mit den FIREBASE_ADMIN_* Variablen (wie in der App)
 *   - npm install (firebase-admin + dotenv sind bereits Dependencies)
 *
 * Verwendung:
 *   node scripts/export-lehrplan-data.js              # Lehrplan-Collections (Default)
 *   node scripts/export-lehrplan-data.js --all        # alle System-Collections
 *   node scripts/export-lehrplan-data.js --out ./mein-ordner
 *   node scripts/export-lehrplan-data.js system_kompetenzen lp21_struktur
 *
 * Ausgabe:
 *   <out>/<collection>.json   – Array aller Dokumente (inkl. "id"-Feld)
 *   <out>/_manifest.json      – Übersicht (Collection → Anzahl, Zeitstempel)
 */

const path = require("path");
const fs = require("fs");

// .env.local laden (Fallback auf .env). dotenv ist optional – wenn die
// Env-Vars bereits gesetzt sind, funktioniert das Script auch ohne dotenv.
try {
  require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
  require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });
} catch {
  // dotenv nicht installiert → Env-Vars müssen anders gesetzt sein
}

const admin = require("firebase-admin");

// ---- Collection-Auswahl --------------------------------------------------

// Lehrplan-relevante Collections (Default).
const LEHRPLAN_COLLECTIONS = [
  "system_kompetenzen", // einzelne Kompetenzstufen mit LP-Codes (Airtable + LP21)
  "lp21_struktur",      // LP21 Fachbereich-Strukturen (Kompetenzbereiche + Kompetenzen)
];

// Vollständiger System-Cache (mit --all).
const ALL_COLLECTIONS = [
  ...LEHRPLAN_COLLECTIONS,
  "system_themes",   // Themen (Airtable-Cache)
  "system_schulen",  // Schulen (Airtable-Cache)
  "system_lektionen", // Lektionsplanung (Airtable-Cache)
  "sync_metadata",   // Sync-Status
  "sync_logs",       // Sync-Verlauf
];

// ---- Argumente parsen ----------------------------------------------------

const args = process.argv.slice(2);
let outDir = path.resolve(process.cwd(), "lehrplan-export");
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") {
    outDir = path.resolve(process.cwd(), args[++i]);
  } else if (args[i] === "--all") {
    positional.push("__ALL__");
  } else if (args[i].startsWith("--")) {
    console.error(`Unbekannte Option: ${args[i]}`);
    process.exit(1);
  } else {
    positional.push(args[i]);
  }
}

let collections;
if (positional.includes("__ALL__")) {
  collections = ALL_COLLECTIONS;
} else if (positional.length > 0) {
  collections = positional; // explizit angegebene Collection-Namen
} else {
  collections = LEHRPLAN_COLLECTIONS;
}

// ---- Firebase Admin initialisieren (identisch zur App) -------------------

function initAdmin() {
  if (admin.apps.length) return;
  if (
    !process.env.FIREBASE_ADMIN_PROJECT_ID ||
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    console.error(
      "❌ Firebase Admin Konfiguration fehlt.\n" +
        "   Bitte FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL und\n" +
        "   FIREBASE_ADMIN_PRIVATE_KEY in .env.local setzen (siehe .env.example)."
    );
    process.exit(1);
  }

  // Private-Key-Newlines robust behandeln (wie in src/lib/firebase/admin.ts)
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
  if (privateKey.includes("-----BEGIN") && !privateKey.includes("\n-----")) {
    privateKey = privateKey
      .replace(/-----BEGIN (.*?)-----\s*/, "-----BEGIN $1-----\n")
      .replace(/\s*-----END (.*?)-----/, "\n-----END $1-----\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

// ---- Firestore-Werte JSON-tauglich machen --------------------------------

// Wandelt Firestore-Timestamps in ISO-Strings, behält den Rest unverändert.
function normalize(value) {
  if (value === null || value === undefined) return value;
  // Firestore Timestamp → ISO-String
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v);
    return out;
  }
  return value;
}

// ---- Hauptlogik ----------------------------------------------------------

async function main() {
  initAdmin();
  const db = admin.firestore();

  fs.mkdirSync(outDir, { recursive: true });

  const manifest = {
    exportedAt: new Date().toISOString(),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    collections: {},
  };

  console.log(`📦 Export nach: ${outDir}\n`);

  for (const name of collections) {
    process.stdout.write(`→ ${name} ... `);
    const snap = await db.collection(name).get();
    const docs = snap.docs.map((doc) => ({ id: doc.id, ...normalize(doc.data()) }));

    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(docs, null, 2));
    manifest.collections[name] = docs.length;
    console.log(`${docs.length} Dokumente → ${path.basename(file)}`);
  }

  fs.writeFileSync(
    path.join(outDir, "_manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  const total = Object.values(manifest.collections).reduce((a, b) => a + b, 0);
  console.log(`\n✅ Fertig. ${total} Dokumente in ${collections.length} Collection(s).`);
  console.log(`   Manifest: ${path.join(outDir, "_manifest.json")}`);
}

main().catch((err) => {
  console.error("\n❌ Export fehlgeschlagen:", err.message || err);
  process.exit(1);
});
