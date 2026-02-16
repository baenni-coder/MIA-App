import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

/**
 * GET /api/user/data-export
 * Exportiert alle personenbezogenen Daten einer Lehrperson als JSON.
 * Art. 28 DSG - Recht auf Datenherausgabe / Art. 20 DSGVO - Datenportabilität
 */
export async function GET(request: Request) {
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

    const teacherData = teacherDoc.data()!;

    // Alle zugehörigen Daten sammeln
    const exportData: Record<string, unknown> = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        userId: userId,
        format: "JSON",
        description:
          "Datenexport gemäss Art. 28 DSG (Recht auf Datenherausgabe)",
      },
      profile: {
        name: teacherData.name,
        email: teacherData.email,
        schuleId: teacherData.schuleId,
        stufe: teacherData.stufe,
        kanton: teacherData.kanton || null,
        role: teacherData.role,
        dashboardTiles: teacherData.dashboardTiles || null,
        createdAt: teacherData.createdAt,
      },
    };

    // Custom Themes
    const themesSnapshot = await adminDb
      .collection("custom_themes")
      .where("createdBy", "==", userId)
      .get();
    exportData.customThemes = themesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Custom Lektionen
    const lektionenSnapshot = await adminDb
      .collection("custom_lektionen")
      .where("createdBy", "==", userId)
      .get();
    exportData.customLektionen = lektionenSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Notifications
    const notificationsSnapshot = await adminDb
      .collection("notifications")
      .where("recipientId", "==", userId)
      .get();
    exportData.notifications = notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // School Files (Metadaten)
    const filesSnapshot = await adminDb
      .collection("school_files")
      .where("uploadedBy", "==", userId)
      .get();
    exportData.schoolFiles = filesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Jahresplanung
    const jahresplanSnapshot = await adminDb
      .collection("jahresplanung")
      .where("teacherId", "==", userId)
      .get();
    exportData.jahresplanung = jahresplanSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Custom Ferien
    const ferienSnapshot = await adminDb
      .collection("schulferien_custom")
      .where("teacherId", "==", userId)
      .get();
    exportData.customFerien = ferienSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Return as JSON with download headers
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mia-app-datenexport-${new Date().toISOString().split("T")[0]}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
