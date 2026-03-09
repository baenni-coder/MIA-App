import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getTeacherProfile } from "@/lib/firestore/permissions";
import {
  upsertSystemKompetenzen,
  getSystemKompetenzen,
} from "@/lib/firestore/system-cache";
import { SystemKompetenz } from "@/types";
import { crawlFachbereich, mapCrawlResultToKompetenzen, mapToSystemKompetenzen, kantonToLP21 } from "@/lib/lp21";
import type { LP21Kanton } from "@/lib/lp21";

/**
 * POST /api/admin/sync/lp21
 * Synchronisiert Kompetenzen von LP21 API → Firestore
 *
 * Body: { kanton?: string, fachbereich?: string }
 * - kanton: LP21 Kanton-Code (default: v-fe)
 * - fachbereich: Fachbereich-Code (default: MI = Medien und Informatik)
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Auth Check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Permission Check (nur Super Admins)
    const teacher = await getTeacherProfile(userId);
    if (!teacher || teacher.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden - Super Admin required" }, { status: 403 });
    }

    // 3. Parameter lesen
    const body = await req.json().catch(() => ({}));
    const kantonParam = body.kanton as string | undefined;
    const fachbereich = body.fachbereich || "MI";

    // Kanton-Code konvertieren (App-Format → LP21-Format)
    const kanton: LP21Kanton = kantonParam
      ? kantonToLP21(kantonParam)
      : (process.env.LP21_DEFAULT_KANTON as LP21Kanton) || "v-fe";

    console.log(`🎯 LP21 Sync: Fachbereich=${fachbereich}, Kanton=${kanton}`);

    // 4. LP21 API crawlen
    const crawlResult = await crawlFachbereich(fachbereich, kanton, "de");

    console.log(
      `📊 LP21 Crawl: ${crawlResult.totalKompetenzstufen} Kompetenzstufen in ${crawlResult.duration}ms`
    );

    // 5. Mapping: LP21 → Kompetenz → SystemKompetenz
    const kompetenzen = mapCrawlResultToKompetenzen(crawlResult);

    // 6. Bestehende Kompetenzen laden für ID-Mapping
    const existingKompetenzen = await getSystemKompetenzen();
    const lpCodeToAirtableId = new Map<string, string>();
    existingKompetenzen.forEach((k) => {
      if (k.lpCode) {
        lpCodeToAirtableId.set(k.lpCode, k.airtableId);
      }
    });

    // Bestehende Unterrichtsideen-Verknüpfungen beibehalten
    const existingUnterrichtsideen = new Map<string, string[]>();
    existingKompetenzen.forEach((k) => {
      if (k.lpCode && k.unterrichtsideenIds?.length > 0) {
        existingUnterrichtsideen.set(k.lpCode, k.unterrichtsideenIds);
      }
    });

    // 7. SystemKompetenzen erstellen
    const systemKompetenzen = mapToSystemKompetenzen(kompetenzen, lpCodeToAirtableId);

    // Unterrichtsideen-Verknüpfungen übernehmen
    systemKompetenzen.forEach((sk) => {
      const existingIds = existingUnterrichtsideen.get(sk.lpCode || "");
      if (existingIds) {
        sk.unterrichtsideenIds = existingIds;
      }
    });

    // 8. Statistiken berechnen
    const existingIds = new Set(existingKompetenzen.map((k) => k.airtableId));
    let added = 0;
    let updated = 0;

    systemKompetenzen.forEach((sk) => {
      if (existingIds.has(sk.airtableId)) {
        updated++;
      } else {
        added++;
      }
    });

    // 9. Upsert in Firestore (in Batches von 500)
    if (systemKompetenzen.length > 0) {
      for (let i = 0; i < systemKompetenzen.length; i += 500) {
        const batch = systemKompetenzen.slice(i, i + 500);
        await upsertSystemKompetenzen(batch);
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `✅ LP21 Sync abgeschlossen: +${added} ~${updated} in ${duration}ms ` +
        `(${crawlResult.totalKompetenzstufen} Kompetenzstufen, ` +
        `${crawlResult.kompetenzbereiche.length} Kompetenzbereiche)`
    );

    return NextResponse.json({
      success: true,
      source: "lp21",
      fachbereich: crawlResult.fachbereich,
      kanton,
      added,
      updated,
      totalKompetenzstufen: crawlResult.totalKompetenzstufen,
      kompetenzbereiche: crawlResult.kompetenzbereiche.length,
      crawlDuration: crawlResult.duration,
      totalDuration: duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in LP21 Sync:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        source: "lp21",
        error: errorMessage,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
