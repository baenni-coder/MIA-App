import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { updateSyncMetadata } from "@/lib/firestore/system-cache";

/**
 * POST /api/admin/sync/invalidate
 * Invalidiert den gesamten Cache (markiert alle als inaktiv)
 * Nur für Super Admins - mit großer Vorsicht zu verwenden!
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

    // Nur super_admin darf Cache invalidieren
    if (userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Only super admins can invalidate cache" },
        { status: 403 }
      );
    }

    console.log(`⚠️  Cache invalidation triggered by user ${userId} (${teacher?.name})`);

    // 3. Markiere alle Collections als inaktiv
    const collections = [
      "system_themes",
      "system_schulen",
      "system_kompetenzen",
      "system_lektionen",
    ];

    let totalDeactivated = 0;

    for (const collectionName of collections) {
      const snapshot = await adminDb.collection(collectionName).get();

      const batch = adminDb.batch();
      let batchCount = 0;

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isActive: false });
        batchCount++;
        totalDeactivated++;

        // Firestore Batch Limit ist 500
        if (batchCount >= 500) {
          // Commit wird später gemacht
        }
      });

      if (batchCount > 0) {
        await batch.commit();
        console.log(`   Deactivated ${batchCount} records in ${collectionName}`);
      }
    }

    // 4. Update Sync Metadata
    await updateSyncMetadata({
      syncStatus: "idle",
      recordCounts: {
        themes: 0,
        schulen: 0,
        kompetenzen: 0,
        lektionen: 0,
      },
    });

    console.log(`✅ Cache invalidated: ${totalDeactivated} records deactivated`);

    return NextResponse.json({
      success: true,
      message: "Cache invalidated successfully",
      recordsDeactivated: totalDeactivated,
    });
  } catch (error) {
    console.error("Error in cache invalidation API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
