import { NextRequest, NextResponse } from "next/server";
import { syncAirtableToFirestore } from "@/lib/sync/airtable-firestore-sync";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSyncMetadata } from "@/lib/firestore/system-cache";
import { logDataSync } from "@/lib/audit/logger";

// Vercel Function Timeout: 300 Sekunden (5 Minuten) für Pro Plan
// Notwendig für Phase 3 (Bilder-Download und Upload zu Firebase Storage)
export const maxDuration = 300;

/**
 * POST /api/admin/sync
 * Trigger manueller Sync (nur für Super Admins)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentifizierung prüfen
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminDb = getAdminDb();
    const adminAuth = await import("@/lib/firebase/admin").then((m) => m.getAdminAuth());

    let userId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 2. User Role prüfen
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const teacher = teacherDoc.data();
    const userRole = teacher?.role;

    // Nur super_admin darf Sync triggern
    if (userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Only super admins can trigger sync" },
        { status: 403 }
      );
    }

    // 3. Prüfe ob bereits ein Sync läuft
    const metadata = await getSyncMetadata();
    if (metadata.syncStatus === "syncing") {
      return NextResponse.json(
        {
          error: "Sync already in progress",
          message: "Please wait for the current sync to finish",
        },
        { status: 409 }
      );
    }

    // 4. Sync ausführen und auf Ergebnis warten
    // WICHTIG: Nicht fire-and-forget! Vercel beendet die Function nach Response.
    console.log(`🔄 Manual sync triggered by user ${userId} (${teacher?.name})`);

    await logDataSync("DATA_SYNC_STARTED", userId, teacher?.name || "Unknown");

    const result = await syncAirtableToFirestore(userId);

    if (result.success) {
      await logDataSync("DATA_SYNC_COMPLETED", userId, teacher?.name || "Unknown");
    } else {
      await logDataSync("DATA_SYNC_FAILED", userId, teacher?.name || "Unknown", {
        error: result.errors.join("; "),
      });
    }

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Sync completed successfully" : "Sync completed with errors",
      duration: result.duration,
      recordsProcessed: result.recordsProcessed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Error in sync API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
