import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createJahresplanEinheit,
  getSchulferienCustom,
} from "@/lib/firestore/jahresplanung";
import { getSchulwochenFuerSchuljahr } from "@/lib/data/lp21-data";
import {
  getLehrmittelVorlageById,
  planeVorlage,
  vorlageZuEinheiten,
  type VorlageAuswahl,
} from "@/lib/data/lehrmittel-vorlagen";

const SCHULJAHR_REGEX = /^\d{4}\/\d{4}$/;

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
    const schuleId = teacherDoc.exists ? teacherDoc.data()?.schuleId : undefined;

    const ids: string[] = [];
    for (const p of payloads) {
      ids.push(
        await createJahresplanEinheit({
          teacherId: userId,
          schuljahr,
          ...p,
          schuleId,
        })
      );
    }

    return NextResponse.json(
      { success: true, count: ids.length, ids, nichtPlatziert },
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
