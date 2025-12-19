import { NextRequest, NextResponse } from "next/server";
import { getSyncMetadata, getRecentSyncLogs, updateSyncMetadata } from "@/lib/firestore/system-cache";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * GET /api/admin/sync/status
 * Hole aktuellen Sync-Status und Logs
 */
export async function GET(request: NextRequest) {
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

    // Nur Admins dürfen Sync-Status sehen
    if (userRole !== "super_admin" && userRole !== "picts_admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // 3. Lade Sync Metadata
    const metadata = await getSyncMetadata();

    // 4. Lade letzte Sync Logs
    const recentLogs = await getRecentSyncLogs(10);

    // 5. Berechne Cache Age (in Stunden)
    let cacheAgeHours: number | null = null;
    if (metadata.lastFullSync) {
      const ageMs = Date.now() - metadata.lastFullSync.getTime();
      cacheAgeHours = Math.floor(ageMs / (1000 * 60 * 60));
    }

    return NextResponse.json({
      metadata: {
        lastFullSync: metadata.lastFullSync?.toISOString(),
        lastIncrementalSync: metadata.lastIncrementalSync?.toISOString(),
        syncStatus: metadata.syncStatus,
        errorMessage: metadata.errorMessage,
        recordCounts: metadata.recordCounts,
        lastSyncDuration: metadata.lastSyncDuration,
        cacheAgeHours,
      },
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        type: log.type,
        status: log.status,
        duration: log.duration,
        recordsProcessed: log.recordsProcessed,
        errors: log.errors,
        triggeredBy: log.triggeredBy,
      })),
    });
  } catch (error) {
    console.error("Error in sync status API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/sync/status
 * Update Sync Metadata
 */
export async function PUT(request: NextRequest) {
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

    // Nur Super Admins dürfen Status updaten
    if (userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required" },
        { status: 403 }
      );
    }

    // 3. Parse Body
    const body = await request.json();

    // 4. Update Metadata
    await updateSyncMetadata(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating sync status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
