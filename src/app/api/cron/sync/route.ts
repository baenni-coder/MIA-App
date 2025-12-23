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
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // IMMER prüfen - auch wenn CRON_SECRET nicht gesetzt ist
    if (!cronSecret) {
      console.error("CRON_SECRET not configured - rejecting cron request for security");
      return NextResponse.json(
        { error: "Server misconfigured - CRON_SECRET required" },
        { status: 500 }
      );
    }

    // Prüfe Authorization Header
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("Unauthorized cron attempt - invalid or missing token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: Zusätzliche Vercel-spezifische Header prüfen
    const userAgent = request.headers.get("user-agent");
    const isVercelCron = userAgent?.includes("vercel-cron");
    if (!isVercelCron) {
      console.warn(`Suspicious cron request from user-agent: ${userAgent}`);
      // Warnung loggen, aber nicht blockieren (für Flexibilität)
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
