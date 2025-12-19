import { Thema, Stufe, Zeitraum, Kompetenz } from "@/types";
import { getAllThemen, getThemenByStufe, getThemenGroupedByZeitraum, getThemenImageUrls } from "@/lib/airtable/themen";
import { getSystemThemes, getSystemKompetenzenByIds } from "@/lib/firestore/system-cache";

/**
 * Feature Flag: Firestore Cache aktivieren
 */
const USE_FIRESTORE_CACHE = process.env.ENABLE_FIRESTORE_CACHE === "true";

/**
 * Prüft ob eine URL eine Airtable Attachment URL ist (die ablaufen kann)
 */
function isAirtableUrl(url: string | undefined): boolean {
  if (!url) return false;
  // Airtable URLs enthalten "dl.airtable.com" oder haben bestimmte Muster
  return url.includes("dl.airtable.com") ||
         url.includes(".airtable.com/") ||
         url.includes("v1/attachments/");
}

/**
 * Konvertiert SystemTheme zu Thema (mit aufgelösten Kompetenzen)
 */
async function convertSystemThemeToThema(systemTheme: any, kompetenzenMap?: Map<string, any>): Promise<Thema> {
  // Wenn keine Kompetenzen-Map übergeben wurde, lade sie
  let resolvedKompetenzen: Kompetenz[] | undefined;

  if (systemTheme.kompetenzenIds && systemTheme.kompetenzenIds.length > 0) {
    if (kompetenzenMap) {
      resolvedKompetenzen = systemTheme.kompetenzenIds
        .map((id: string) => kompetenzenMap.get(id))
        .filter((k: any): k is Kompetenz => k !== undefined)
        .map((k: any) => ({
          id: k.airtableId,
          name: k.name,
          lpCode: k.lpCode,
          kompetenzbereich: k.kompetenzbereich,
          kompetenz: k.kompetenz,
          kompetenzstufe: k.kompetenzstufe,
          zyklus: k.zyklus,
          klassenstufe: k.klassenstufe,
          grundanspruch: k.grundanspruch,
          querverweisLP: k.querverweisLP,
          unterrichtsideen: [], // TODO: Resolve wenn benötigt
        }));
    } else {
      // Lade Kompetenzen on-demand
      const loadedKompetenzen = await getSystemKompetenzenByIds(systemTheme.kompetenzenIds);
      resolvedKompetenzen = Array.from(loadedKompetenzen.values()).map((k) => ({
        id: k.airtableId,
        name: k.name,
        lpCode: k.lpCode,
        kompetenzbereich: k.kompetenzbereich,
        kompetenz: k.kompetenz,
        kompetenzstufe: k.kompetenzstufe,
        zyklus: k.zyklus,
        klassenstufe: k.klassenstufe,
        grundanspruch: k.grundanspruch,
        querverweisLP: k.querverweisLP,
        unterrichtsideen: [], // TODO: Resolve wenn benötigt
      }));
    }
  }

  // String-Repräsentation für kompetenzenLehrplan
  const kompetenzenString = resolvedKompetenzen
    ?.map((k) => k.lpCode || k.name)
    .join(", ");

  return {
    id: systemTheme.airtableId,
    thema: systemTheme.thema,
    beschreibung: systemTheme.beschreibung,
    lehrmittel: systemTheme.lehrmittel,
    bildLehrmittel: systemTheme.bildLehrmittel,
    anzahlLektionen: systemTheme.anzahlLektionen,
    kompetenzenLehrplan: kompetenzenString,
    kompetenzen: resolvedKompetenzen,
    fileRouge: systemTheme.fileRouge,
    unterlagen: systemTheme.unterlagen,
    schuljahr: systemTheme.schuljahr,
    lektionsplanung: systemTheme.lektionsplanung,
    zeitraum: systemTheme.zeitraum,
    startdatum: systemTheme.startdatum,
    uebersichtPICTS: systemTheme.uebersichtPICTS,
    pictsBuchen: systemTheme.pictsBuchen,
  };
}

/**
 * Alle Themen laden (Firestore Cache oder Airtable Fallback)
 * WICHTIG: Bild-URLs werden immer frisch von Airtable geholt, da sie temporär sind
 */
export async function getThemes(): Promise<Thema[]> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log("📦 Loading themes from Firestore cache...");

      // Parallel: Lade Themen aus Cache UND frische Bild-URLs von Airtable
      const [systemThemes, freshImageUrls] = await Promise.all([
        getSystemThemes(),
        getThemenImageUrls().catch((err) => {
          console.warn("⚠️ Could not load fresh image URLs:", err);
          return new Map<string, string>();
        }),
      ]);

      // Sammle alle Kompetenzen-IDs
      const allKompetenzIds = new Set<string>();
      systemThemes.forEach((theme) => {
        theme.kompetenzenIds.forEach((id) => allKompetenzIds.add(id));
      });

      // Lade alle Kompetenzen auf einmal
      const kompetenzenMap = await getSystemKompetenzenByIds(Array.from(allKompetenzIds));

      // Konvertiere zu Thema-Format und ersetze Bild-URLs mit frischen
      const themes = await Promise.all(
        systemThemes.map(async (st) => {
          const theme = await convertSystemThemeToThema(st, kompetenzenMap);
          // Ersetze die gecachte Bild-URL mit der frischen Airtable-URL
          const freshImageUrl = freshImageUrls.get(st.airtableId);
          if (freshImageUrl) {
            theme.bildLehrmittel = freshImageUrl;
          }
          return theme;
        })
      );

      console.log(`✅ Loaded ${themes.length} themes from Firestore (with fresh images)`);
      return themes;
    } catch (error) {
      console.error("❌ Error loading from Firestore, falling back to Airtable:", error);
      // Fallback zu Airtable
      return getAllThemen();
    }
  }

  // Standard: Airtable
  console.log("📋 Loading themes from Airtable...");
  return getAllThemen();
}

/**
 * Themen nach Stufe filtern
 * WICHTIG: Bild-URLs werden immer frisch von Airtable geholt, da sie temporär sind
 */
export async function getThemesByStufe(stufe: Stufe): Promise<Thema[]> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log(`📦 Loading themes for ${stufe} from Firestore cache...`);

      // Parallel: Lade Themen aus Cache UND frische Bild-URLs von Airtable
      const [systemThemes, freshImageUrls] = await Promise.all([
        getSystemThemes(stufe),
        getThemenImageUrls().catch((err) => {
          console.warn("⚠️ Could not load fresh image URLs:", err);
          return new Map<string, string>();
        }),
      ]);

      // Sammle alle Kompetenzen-IDs
      const allKompetenzIds = new Set<string>();
      systemThemes.forEach((theme) => {
        theme.kompetenzenIds.forEach((id) => allKompetenzIds.add(id));
      });

      // Lade alle Kompetenzen auf einmal
      const kompetenzenMap = await getSystemKompetenzenByIds(Array.from(allKompetenzIds));

      // Konvertiere zu Thema-Format und ersetze Bild-URLs mit frischen
      const themes = await Promise.all(
        systemThemes.map(async (st) => {
          const theme = await convertSystemThemeToThema(st, kompetenzenMap);
          // Ersetze die gecachte Bild-URL mit der frischen Airtable-URL
          const freshImageUrl = freshImageUrls.get(st.airtableId);
          if (freshImageUrl) {
            theme.bildLehrmittel = freshImageUrl;
          }
          return theme;
        })
      );

      console.log(`✅ Loaded ${themes.length} themes for ${stufe} from Firestore (with fresh images)`);
      return themes;
    } catch (error) {
      console.error("❌ Error loading from Firestore, falling back to Airtable:", error);
      // Fallback zu Airtable
      return getThemenByStufe(stufe);
    }
  }

  // Standard: Airtable
  console.log(`📋 Loading themes for ${stufe} from Airtable...`);
  return getThemenByStufe(stufe);
}

/**
 * Themen nach Zeitraum gruppieren (für Kanban)
 */
export async function getThemesGroupedByZeitraum(stufe: Stufe): Promise<Record<Zeitraum, Thema[]>> {
  if (USE_FIRESTORE_CACHE) {
    try {
      console.log(`📦 Loading grouped themes for ${stufe} from Firestore cache...`);
      const themes = await getThemesByStufe(stufe);

      // Gruppiere nach Zeitraum
      const grouped: Record<Zeitraum, Thema[]> = {
        "Sommerferien-Herbstferien": [],
        "Herbstferien-Weihnachtsferien": [],
        "Weihnachtsferien-Winterferien": [],
        "Winterferien-Frühlingsferien": [],
        "Frühlingsferien-Sommerferien": [],
        "Zusatz": [],
      };

      themes.forEach((thema) => {
        if (thema.zeitraum && grouped[thema.zeitraum]) {
          grouped[thema.zeitraum].push(thema);
        }
      });

      console.log(`✅ Grouped themes loaded from Firestore`);
      return grouped;
    } catch (error) {
      console.error("❌ Error loading from Firestore, falling back to Airtable:", error);
      // Fallback zu Airtable
      return getThemenGroupedByZeitraum(stufe);
    }
  }

  // Standard: Airtable
  console.log(`📋 Loading grouped themes for ${stufe} from Airtable...`);
  return getThemenGroupedByZeitraum(stufe);
}
