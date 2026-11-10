import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createJahresplanEinheit,
  getSchulferienCustom,
} from "@/lib/firestore/jahresplanung";
import { getSchulwochenFuerSchuljahr } from "@/lib/data/lp21-data";
import { getSystemKompetenzen } from "@/lib/firestore/system-cache";
import type { SystemKompetenz } from "@/types";
import {
  getLehrmittelVorlageById,
  planeVorlage,
  vorlageZuEinheiten,
  type VorlageAuswahl,
} from "@/lib/data/lehrmittel-vorlagen";

const SCHULJAHR_REGEX = /^\d{4}\/\d{4}$/;

const normCode = (c: string) => c.replace(/[\s.]/g, "").toLowerCase();

/**
 * Löst LP21-Codes (z.B. "D.4.B.1.c", "MI.1.3.c") in system_kompetenzen-IDs
 * auf. MI ↔ IB wird je nach Kanton aufgelöst (SO bevorzugt IB). Nicht
 * auffindbare Codes bleiben unaufgelöst (stehen weiterhin im Lernziel-Text).
 */
function buildResolver(alle: SystemKompetenz[], kanton?: string) {
  const byCode = new Map<string, SystemKompetenz[]>();
  alle.forEach((k) => {
    if (!k.lpCode) return;
    const key = normCode(k.lpCode);
    const list = byCode.get(key) || [];
    list.push(k);
    byCode.set(key, list);
  });
  const pick = (code: string): SystemKompetenz | undefined => {
    const list = byCode.get(normCode(code));
    if (!list || list.length === 0) return undefined;
    // Airtable-Quelle bevorzugen (MIA-kuratiert), sonst erste
    return list.find((k) => k.source === "airtable") || list[0];
  };
  return (code: string): SystemKompetenz | undefined => {
    const isMia = code.startsWith("MI.") || code.startsWith("IB.");
    if (!isMia) return pick(code);
    const rest = code.slice(3);
    const order = kanton === "SO" ? ["IB.", "MI."] : ["MI.", "IB."];
    for (const prefix of order) {
      const k = pick(prefix + rest);
      if (k) return k;
    }
    return undefined;
  };
}

/**
 * POST /api/jahresplanung/vorlage-uebernehmen
 * Übernimmt ausgewählte Blöcke einer Lehrmittel-Jahresplanungsvorlage als
 * Einheiten in die eigene Jahresplanung. Die Verteilung auf Kalenderwochen
 * wird serverseitig neu berechnet (Ferien der Lehrperson werden berücksichtigt).
 *
 * Body: { vorlageId, schuljahr, startKW, bloecke: [{ blockId, wochen }] }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const vorlage = getLehrmittelVorlageById(String(body.vorlageId || ""));
    if (!vorlage) {
      return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
    }
    const schuljahr = String(body.schuljahr || "");
    if (!SCHULJAHR_REGEX.test(schuljahr)) {
      return NextResponse.json({ error: "Ungültiges Schuljahr" }, { status: 400 });
    }
    const startKW = Number(body.startKW);
    if (!Number.isInteger(startKW) || startKW < 1 || startKW > 53) {
      return NextResponse.json({ error: "Ungültige Start-KW" }, { status: 400 });
    }

    const blockIds = new Set(vorlage.bloecke.map((b) => b.id));
    const auswahl: VorlageAuswahl[] = Array.isArray(body.bloecke)
      ? body.bloecke
          .filter(
            (b: unknown): b is VorlageAuswahl =>
              !!b &&
              typeof (b as VorlageAuswahl).blockId === "string" &&
              blockIds.has((b as VorlageAuswahl).blockId)
          )
          .map((b: VorlageAuswahl) => ({
            blockId: b.blockId,
            wochen: Math.min(20, Math.max(1, Math.floor(Number(b.wochen) || 1))),
          }))
      : [];
    if (auswahl.length === 0) {
      return NextResponse.json({ error: "Keine Blöcke ausgewählt" }, { status: 400 });
    }

    const customFerien = await getSchulferienCustom(userId, schuljahr);
    const schulwochen = getSchulwochenFuerSchuljahr(
      "SO_BeLoSe",
      schuljahr,
      customFerien.length > 0 ? customFerien : undefined
    );

    const plan = planeVorlage(vorlage, auswahl, schulwochen, startKW);
    const payloads = vorlageZuEinheiten(vorlage, plan);
    const nichtPlatziert = plan.filter((p) => !p.passt).map((p) => p.block.titel);

    const teacherDoc = await getAdminDb().collection("teachers").doc(userId).get();
    const teacher = teacherDoc.exists ? teacherDoc.data() : undefined;
    const schuleId = teacher?.schuleId;

    // LP21-Codes → Kompetenz-IDs (nur laden, wenn die Vorlage Codes enthält)
    const brauchtKompetenzen = payloads.some((p) => p.lp21Codes.length > 0);
    const resolve = brauchtKompetenzen
      ? buildResolver(await getSystemKompetenzen(), teacher?.kanton)
      : null;
    const unaufgeloest = new Set<string>();
    let miaZugeordnet = 0;

    const ids: string[] = [];
    for (const { lp21Codes, ...p } of payloads) {
      const kompetenzenIds: string[] = [];
      const kompetenzenNamen: string[] = [];
      for (const code of lp21Codes) {
        const k = resolve?.(code);
        if (!k) {
          unaufgeloest.add(code);
          continue;
        }
        if (kompetenzenIds.includes(k.id)) continue;
        kompetenzenIds.push(k.id);
        kompetenzenNamen.push(
          k.kompetenzstufe ? `${k.lpCode}: ${k.kompetenzstufe}` : k.lpCode || code
        );
        if (code.startsWith("MI.") || code.startsWith("IB.")) miaZugeordnet++;
      }
      ids.push(
        await createJahresplanEinheit({
          teacherId: userId,
          schuljahr,
          ...p,
          kompetenzenIds,
          kompetenzenNamen,
          schuleId,
        })
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: ids.length,
        ids,
        nichtPlatziert,
        miaZugeordnet,
        unaufgeloesteCodes: Array.from(unaufgeloest),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error applying lehrmittel vorlage:", error);
    return NextResponse.json(
      { error: "Vorlage konnte nicht übernommen werden" },
      { status: 500 }
    );
  }
}
