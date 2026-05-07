import { NextResponse } from "next/server";
import { getThemes, getThemesByStufe } from "@/lib/data-sources/themes-adapter";
import {
  getCustomThemesByStufe,
  getCustomThemes,
} from "@/lib/firestore/custom-themes";
import { getSystemKompetenzenByIds } from "@/lib/firestore/system-cache";
import { getAssignmentsBySchule } from "@/lib/firestore/school-jahresplan";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  Stufe,
  Thema,
  Zeitraum,
  CustomTheme,
  Kompetenz,
  SchoolJahresplanAssignment,
  JahresplanMode,
} from "@/types";

/**
 * Konvertiert CustomTheme zu Thema-Format
 * Nutzt Firestore-Cache für Kompetenzen statt direkte Airtable-Aufrufe
 */
async function convertCustomThemeToThema(
  customTheme: CustomTheme
): Promise<Thema> {
  let kompetenzen = customTheme.kompetenzen;
  if (!kompetenzen && customTheme.kompetenzenIds.length > 0) {
    try {
      const systemKompetenzenMap = await getSystemKompetenzenByIds(
        customTheme.kompetenzenIds
      );
      kompetenzen = customTheme.kompetenzenIds
        .map((id) => {
          const sk = systemKompetenzenMap.get(id);
          if (!sk) return undefined;
          return {
            id: sk.airtableId,
            name: sk.name,
            lpCode: sk.lpCode,
            kompetenzbereich: sk.kompetenzbereich,
            kompetenz: sk.kompetenz,
            kompetenzstufe: sk.kompetenzstufe,
            zyklus: sk.zyklus,
            klassenstufe: sk.klassenstufe,
            grundanspruch: sk.grundanspruch,
            querverweisLP: sk.querverweisLP,
            unterrichtsideen: [],
          } as Kompetenz;
        })
        .filter((k): k is Kompetenz => k !== undefined);
    } catch (error) {
      console.error("Error resolving competencies for custom theme:", error);
      kompetenzen = [];
    }
  }

  const kompetenzenString = kompetenzen
    ?.map((k) => k.lpCode || k.name)
    .join(", ");

  return {
    id: customTheme.id,
    thema: customTheme.thema,
    beschreibung: customTheme.beschreibung,
    lehrmittel: customTheme.lehrmittel,
    bildLehrmittel: customTheme.bildLehrmittel,
    anzahlLektionen: customTheme.anzahlLektionen,
    kompetenzenLehrplan: kompetenzenString,
    kompetenzen: kompetenzen,
    fileRouge: customTheme.fileRouge,
    unterlagen: customTheme.unterlagen,
    schuljahr: customTheme.schuljahr,
    zeitraum: customTheme.zeitraum,
    empfohleneIntegrationsfaecher: customTheme.empfohleneIntegrationsfaecher,
    isCustom: true,
    customThemeId: customTheme.id,
  };
}

/**
 * Kombiniert System Themen (Airtable/Firestore Cache) und Custom Themes
 */
async function getCombinedThemenByStufe(stufe: Stufe): Promise<Thema[]> {
  const [systemThemen, customThemes] = await Promise.all([
    getThemesByStufe(stufe),
    getCustomThemesByStufe(stufe),
  ]);

  const customThemenPromises = customThemes.map((ct) =>
    convertCustomThemeToThema(ct)
  );
  const customThemenConverted = await Promise.all(customThemenPromises);

  return [...systemThemen, ...customThemenConverted];
}

/**
 * Gruppiert Themen in die 6 Zeitraum-Spalten
 */
function groupByZeitraum(themen: Thema[]): Record<Zeitraum, Thema[]> {
  const grouped: Record<Zeitraum, Thema[]> = {
    "Sommerferien-Herbstferien": [],
    "Herbstferien-Weihnachtsferien": [],
    "Weihnachtsferien-Winterferien": [],
    "Winterferien-Frühlingsferien": [],
    "Frühlingsferien-Sommerferien": [],
    Zusatz: [],
  };
  themen.forEach((thema) => {
    if (thema.zeitraum && grouped[thema.zeitraum]) {
      grouped[thema.zeitraum].push(thema);
    }
  });
  return grouped;
}

/**
 * Wendet die Schul-Overrides eines Assignments auf das Original-Thema an.
 * Gibt ein neues Thema-Objekt zurück (immutable).
 */
function applyAssignmentOverrides(
  original: Thema,
  assignment: SchoolJahresplanAssignment
): Thema {
  const merged: Thema = {
    ...original,
    thema: assignment.themaOverride ?? original.thema,
    beschreibung: assignment.beschreibungOverride ?? original.beschreibung,
    lehrmittel: assignment.lehrmittelOverride ?? original.lehrmittel,
    bildLehrmittel:
      assignment.bildLehrmittelOverride ?? original.bildLehrmittel,
    anzahlLektionen:
      assignment.anzahlLektionenOverride ?? original.anzahlLektionen,
    zeitraum: assignment.zeitraumOverride ?? original.zeitraum,
    schuljahr:
      assignment.stufeOverride && assignment.stufeOverride.length > 0
        ? assignment.stufeOverride
        : original.schuljahr,
    fileRouge: assignment.fileRougeOverride ?? original.fileRouge,
    unterlagen: assignment.unterlagenOverride ?? original.unterlagen,
    empfohleneIntegrationsfaecher:
      assignment.empfohleneIntegrationsfaecherOverride &&
      assignment.empfohleneIntegrationsfaecherOverride.length > 0
        ? assignment.empfohleneIntegrationsfaecherOverride
        : original.empfohleneIntegrationsfaecher,
    schulMaterialien: assignment.schulMaterialien,
    schulNotizen: assignment.schulNotizen,
    schulUnterlagen: assignment.schulUnterlagen,
    assignmentId: assignment.id,
    isSchoolOverridden: hasAnyOverride(assignment),
  };
  return merged;
}

function hasAnyOverride(a: SchoolJahresplanAssignment): boolean {
  return (
    a.themaOverride !== undefined ||
    a.beschreibungOverride !== undefined ||
    a.lehrmittelOverride !== undefined ||
    a.bildLehrmittelOverride !== undefined ||
    a.anzahlLektionenOverride !== undefined ||
    a.zeitraumOverride !== undefined ||
    (a.stufeOverride !== undefined && a.stufeOverride.length > 0) ||
    a.fileRougeOverride !== undefined ||
    a.unterlagenOverride !== undefined ||
    (a.empfohleneIntegrationsfaecherOverride !== undefined &&
      a.empfohleneIntegrationsfaecherOverride.length > 0) ||
    (a.schulMaterialien !== undefined && a.schulMaterialien.length > 0) ||
    (a.schulNotizen !== undefined && a.schulNotizen.length > 0) ||
    a.schulUnterlagen !== undefined
  );
}

/**
 * Liest den Jahresplan-Modus einer Schule. Fallback: "open".
 */
async function getSchuleJahresplanMode(
  schuleId: string
): Promise<JahresplanMode> {
  try {
    const adminDb = getAdminDb();
    const doc = await adminDb.collection("system_schulen").doc(schuleId).get();
    const data = doc.data() || {};
    return data.jahresplanMode === "curated" ? "curated" : "open";
  } catch (error) {
    console.error("Error reading jahresplanMode:", error);
    return "open";
  }
}

/**
 * Lädt den kuratierten Jahresplan einer Schule:
 * Alle aktiven Assignments werden mit ihrem Original-Thema gemerged.
 * Fehlt ein Original-Thema (z.B. wurde gelöscht), wird das Assignment übersprungen.
 * Stufen-Filter wird *nach* dem Merge angewandt, damit Stufen-Overrides wirken.
 */
async function getCuratedThemen(
  schuleId: string,
  stufe?: Stufe | null
): Promise<Thema[]> {
  const assignments = await getAssignmentsBySchule(schuleId);
  if (assignments.length === 0) return [];

  // IDs pro Quelle sammeln
  const systemIds = new Set<string>();
  const customIds = new Set<string>();
  assignments.forEach((a) => {
    if (a.sourceType === "system") systemIds.add(a.sourceThemeId);
    else customIds.add(a.sourceThemeId);
  });

  // Alle Original-Themen parallel laden
  const [allSystemThemen, allCustomThemesRaw] = await Promise.all([
    getThemes(),
    getCustomThemes({ isSystemWide: true }),
  ]);

  const systemById = new Map<string, Thema>();
  allSystemThemen.forEach((t) => {
    if (t.id) systemById.set(t.id, t);
  });

  const customById = new Map<string, CustomTheme>();
  allCustomThemesRaw.forEach((t) => {
    if (t.id) customById.set(t.id, t);
  });

  // Custom Themes in Thema-Format konvertieren (nur die, die tatsächlich zugeordnet sind)
  const customThemaEntries = await Promise.all(
    Array.from(customIds)
      .map((id) => customById.get(id))
      .filter((ct): ct is CustomTheme => ct !== undefined)
      .map(async (ct) => [ct.id, await convertCustomThemeToThema(ct)] as const)
  );
  const customThemaById = new Map<string, Thema>(customThemaEntries);

  // Assignments mit Originalen mergen
  const merged: Thema[] = [];
  for (const a of assignments) {
    const original =
      a.sourceType === "system"
        ? systemById.get(a.sourceThemeId)
        : customThemaById.get(a.sourceThemeId);
    if (!original) {
      // Orphan-Assignment: Original existiert nicht mehr → überspringen.
      // Cleanup passiert separat im Admin-UI (Hinweis).
      continue;
    }
    merged.push(applyAssignmentOverrides(original, a));
  }

  // Nach Stufe filtern (nach Merge, damit Stufen-Override greift)
  if (stufe) {
    return merged.filter(
      (t) => Array.isArray(t.schuljahr) && t.schuljahr.includes(stufe)
    );
  }
  return merged;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stufe = searchParams.get("stufe") as Stufe | null;
    const grouped = searchParams.get("grouped") === "true";
    const schuleId = searchParams.get("schuleId");
    const curated = searchParams.get("curated") === "true";

    const cacheEnabled = process.env.ENABLE_FIRESTORE_CACHE === "true";
    const dataSource = cacheEnabled ? "firestore-cache" : "airtable-direct";
    const baseHeaders: Record<string, string> = {
      "X-Data-Source": dataSource,
      "X-Cache-Enabled": cacheEnabled.toString(),
    };

    // ──────────────────────────────────────────────
    // Curated Modus: Schul-Jahresplan statt globaler Pool
    // ──────────────────────────────────────────────
    if (curated && schuleId) {
      const mode = await getSchuleJahresplanMode(schuleId);
      // Falls Modus nicht curated ist, zurückfallen auf bestehendes Verhalten
      if (mode === "curated") {
        const themen = await getCuratedThemen(schuleId, stufe);
        const payload = grouped ? groupByZeitraum(themen) : themen;
        return NextResponse.json(payload, {
          headers: {
            ...baseHeaders,
            "X-Jahresplan-Mode": "curated",
          },
        });
      }
      // mode === "open" → fallthrough zum Standard-Verhalten
    }

    // ──────────────────────────────────────────────
    // Standard (open) Modus: bisheriges Verhalten
    // ──────────────────────────────────────────────
    if (stufe && grouped) {
      const themen = await getCombinedThemenByStufe(stufe);
      return NextResponse.json(groupByZeitraum(themen), { headers: baseHeaders });
    }

    if (grouped) {
      const allThemen = await getThemes();
      return NextResponse.json(groupByZeitraum(allThemen), {
        headers: baseHeaders,
      });
    }

    if (stufe) {
      const themen = await getCombinedThemenByStufe(stufe);
      return NextResponse.json(themen, { headers: baseHeaders });
    }

    const allThemen = await getThemes();
    return NextResponse.json(allThemen, { headers: baseHeaders });
  } catch (error) {
    console.error("Error fetching Themen:", error);
    return NextResponse.json(
      { error: "Failed to fetch Themen" },
      { status: 500 }
    );
  }
}
