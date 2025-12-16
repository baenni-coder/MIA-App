import { NextRequest, NextResponse } from "next/server";
import { syncAirtableToFirestore } from "@/lib/sync/airtable-firestore-sync";
import { getSyncMetadata } from "@/lib/firestore/system-cache";

/**
 * GET /api/cron/sync
 * Automatischer Sync-Endpunkt für Vercel Cron Jobs
 *
 * Wichtig: Dieser Endpoint sollte durch Vercel Cron Authorization geschützt werden
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron Job Authentifizierung
    // Vercel sendet einen speziellen Header bei Cron-Aufrufen
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Prüfe ob Request von Vercel Cron kommt
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("Unauthorized cron attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🕐 Scheduled sync triggered by Vercel Cron");

    // Prüfe ob bereits ein Sync läuft
    const metadata = await getSyncMetadata();
    if (metadata.syncStatus === "syncing") {
      console.log("⏭️  Skipping sync: already in progress");
      return NextResponse.json({
        skipped: true,
        message: "Sync already in progress",
      });
    }

    // Führe Sync durch (synchron, damit Vercel auf Completion warten kann)
    const result = await syncAirtableToFirestore();

    if (result.success) {
      console.log(`✅ Scheduled sync completed successfully in ${result.duration}ms`);
      return NextResponse.json({
        success: true,
        message: "Sync completed successfully",
        duration: result.duration,
        recordsProcessed: result.recordsProcessed,
      });
    } else {
      console.error(`❌ Scheduled sync failed:`, result.errors);
      return NextResponse.json({
        success: false,
        message: "Sync completed with errors",
        duration: result.duration,
        errors: result.errors,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in cron sync:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
