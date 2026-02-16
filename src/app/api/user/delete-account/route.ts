import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

/**
 * DELETE /api/user/delete-account
 * Löscht den Account einer Lehrperson und alle zugehörigen Daten.
 * Art. 32 DSG / Art. 17 DSGVO - Recht auf Löschung
 */
export async function DELETE(request: Request) {
  try {
    // Authentifizierung prüfen
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const adminDb = getAdminDb();

    // Lehrer-Profil laden
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    // Zugehörige Daten löschen (Cascade-Delete)
    const collectionsToClean = [
      { name: "custom_themes", field: "createdBy" },
      { name: "custom_lektionen", field: "createdBy" },
      { name: "notifications", field: "recipientId" },
      { name: "school_files", field: "uploadedBy" },
      { name: "jahresplanung", field: "teacherId" },
      { name: "schulferien_custom", field: "teacherId" },
      { name: "faq_items", field: "createdBy" },
    ];

    for (const collection of collectionsToClean) {
      try {
        const snapshot = await adminDb
          .collection(collection.name)
          .where(collection.field, "==", userId)
          .get();

        if (!snapshot.empty) {
          const batch = adminDb.batch();
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          console.log(
            `Deleted ${snapshot.size} documents from ${collection.name} for user ${userId}`
          );
        }
      } catch (error) {
        console.error(
          `Error deleting ${collection.name} for user ${userId}:`,
          error
        );
      }
    }

    // Storage-Dateien löschen (Theme-Images und School-Files)
    try {
      const { getStorage } = await import("firebase-admin/storage");
      const { getAdminApp } = await import("@/lib/firebase/admin");
      const bucket = getStorage(getAdminApp()).bucket();

      // Theme images
      const [themeFiles] = await bucket.getFiles({
        prefix: `themes/${userId}/`,
      });
      if (themeFiles.length > 0) {
        await Promise.all(themeFiles.map((file) => file.delete()));
      }

      // School files (check both shared and private paths)
      const teacherData = teacherDoc.data()!;
      if (teacherData.schuleId) {
        const [sharedFiles] = await bucket.getFiles({
          prefix: `school-files/${teacherData.schuleId}/shared/${userId}/`,
        });
        if (sharedFiles.length > 0) {
          await Promise.all(sharedFiles.map((file) => file.delete()));
        }

        const [privateFiles] = await bucket.getFiles({
          prefix: `school-files/${teacherData.schuleId}/users/${userId}/`,
        });
        if (privateFiles.length > 0) {
          await Promise.all(privateFiles.map((file) => file.delete()));
        }
      }
    } catch (error) {
      console.error(`Error deleting storage files for user ${userId}:`, error);
    }

    // Lehrer-Profil löschen
    await adminDb.collection("teachers").doc(userId).delete();

    // Firebase Auth Account löschen
    try {
      await adminAuth.deleteUser(userId);
    } catch (authError) {
      console.error("Error deleting auth user:", authError);
    }

    console.log(`Teacher account ${userId} and all related data deleted`);

    return NextResponse.json({
      success: true,
      message: "Konto und alle zugehörigen Daten wurden gelöscht",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
