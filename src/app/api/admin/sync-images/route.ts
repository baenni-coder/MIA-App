import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSystemThemes, upsertSystemThemes } from "@/lib/firestore/system-cache";
import { downloadAndUploadImage, generateSystemImagePath } from "@/lib/storage/upload";

// Lange Laufzeit für Bilder-Downloads
export const maxDuration = 300;

/**
 * POST /api/admin/sync-images
 * Synchronisiert Themen-Bilder von Airtable zu Firebase Storage.
 * Kann unabhängig vom Haupt-Sync aufgerufen werden.
 * Verarbeitet Bilder in Batches und gibt Fortschritt zurück.
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
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 2. User Role prüfen
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const teacher = teacherDoc.data();
    if (teacher?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Only super admins can sync images" },
        { status: 403 }
      );
    }

    console.log(`🖼️ Image sync triggered by user ${userId} (${teacher?.name})`);

    // 3. Lade alle Themen aus Firestore Cache
    const themes = await getSystemThemes();

    // 4. Filtere Themen die ein Bild haben, das noch nicht in Firebase Storage liegt
    const themesNeedingSync = themes.filter((theme) => {
      if (!theme.bildLehrmittel) return false;
      if (theme.bildLehrmittel.includes("storage.googleapis.com")) return false;
      return true;
    });

    const alreadySynced = themes.filter(
      (t) => t.bildLehrmittel?.includes("storage.googleapis.com")
    ).length;
    const noImage = themes.filter((t) => !t.bildLehrmittel).length;

    if (themesNeedingSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Alle Bilder sind bereits in Firebase Storage",
        stats: {
          total: themes.length,
          alreadySynced,
          noImage,
          needsSync: 0,
          synced: 0,
          failed: 0,
        },
      });
    }

    console.log(
      `   ${themesNeedingSync.length} Bilder zu synchronisieren, ${alreadySynced} bereits synchronisiert`
    );

    // 5. Verarbeite Bilder in kleinen Batches (2 parallel)
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 2;

    for (let i = 0; i < themesNeedingSync.length; i += BATCH_SIZE) {
      const batch = themesNeedingSync.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (theme) => {
          try {
            const storagePath = generateSystemImagePath(theme.airtableId, theme.bildLehrmittel);
            const storageUrl = await downloadAndUploadImage(theme.bildLehrmittel!, storagePath);

            if (storageUrl) {
              await upsertSystemThemes([
                {
                  ...theme,
                  bildLehrmittel: storageUrl,
                  lastSyncedAt: new Date(),
                },
              ]);
              console.log(`   ✅ ${theme.thema}: Bild synchronisiert`);
              return true;
            } else {
              console.warn(`   ⚠️ ${theme.thema}: Download fehlgeschlagen`);
              return false;
            }
          } catch (error) {
            console.error(`   ❌ ${theme.thema}: Fehler`, error);
            throw error;
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          synced++;
        } else {
          failed++;
          if (result.status === "rejected") {
            errors.push(String(result.reason));
          }
        }
      }

      // Pause zwischen Batches
      if (i + BATCH_SIZE < themesNeedingSync.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`🖼️ Image sync completed: ${synced} synced, ${failed} failed`);

    return NextResponse.json({
      success: failed === 0,
      message:
        failed === 0
          ? `${synced} Bilder erfolgreich synchronisiert`
          : `${synced} synchronisiert, ${failed} fehlgeschlagen`,
      stats: {
        total: themes.length,
        alreadySynced,
        noImage,
        needsSync: themesNeedingSync.length,
        synced,
        failed,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in sync-images API:", error);
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
 * GET /api/admin/sync-images
 * Zeigt den aktuellen Status der Bilder-Synchronisation
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminAuth = await import("@/lib/firebase/admin").then((m) => m.getAdminAuth());

    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const themes = await getSystemThemes();

    const inFirebaseStorage = themes.filter(
      (t) => t.bildLehrmittel?.includes("storage.googleapis.com")
    ).length;
    const inAirtable = themes.filter(
      (t) => t.bildLehrmittel && !t.bildLehrmittel.includes("storage.googleapis.com")
    ).length;
    const noImage = themes.filter((t) => !t.bildLehrmittel).length;

    return NextResponse.json({
      total: themes.length,
      inFirebaseStorage,
      inAirtable,
      noImage,
      allSynced: inAirtable === 0,
    });
  } catch (error) {
    console.error("Error in sync-images status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
