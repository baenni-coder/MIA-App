import { NextRequest, NextResponse } from "next/server";
import { syncAirtableToFirestore } from "@/lib/sync/airtable-firestore-sync";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSyncMetadata } from "@/lib/firestore/system-cache";

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

    // 4. Trigger Sync (asynchron im Hintergrund)
    // Wir starten den Sync und geben sofort eine Response zurück
    console.log(`🔄 Manual sync triggered by user ${userId} (${teacher?.name})`);

    // Fire-and-forget: Sync läuft im Hintergrund
    syncAirtableToFirestore(userId).catch((error) => {
      console.error("Background sync failed:", error);
    });

    return NextResponse.json({
      success: true,
      message: "Sync started successfully",
      status: "syncing",
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
