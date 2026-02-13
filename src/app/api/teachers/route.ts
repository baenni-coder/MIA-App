import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { getSchuleById } from "@/lib/airtable/schulen";
import { isSuperAdmin } from "@/lib/firestore/permissions";
import {
  createSchoolChangeRequest,
  getPendingRequestForTeacher,
} from "@/lib/firestore/school-change-requests";
import { notifySuperAdminsAboutSchoolRequest } from "@/lib/firestore/notifications";

export async function POST(request: Request) {
  try {
    // 1. Authentifizierung prüfen
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
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const authenticatedUserId = decodedToken.uid;

    const { userId, email, name, schuleId, kanton, stufe } = await request.json();

    if (!userId || !email || !name || !schuleId || !stufe) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // 2. Sicherstellen dass User nur sein eigenes Profil erstellt
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "Forbidden - You can only create your own profile" },
        { status: 403 }
      );
    }

    const adminDb = getAdminDb();

    // 3. Prüfen ob Profil bereits existiert
    const existingProfile = await adminDb.collection("teachers").doc(userId).get();
    if (existingProfile.exists) {
      return NextResponse.json(
        { error: "Profile already exists" },
        { status: 409 }
      );
    }

    // 4. Profil erstellen - role IMMER auf "teacher" setzen (nicht vom Client übernehmen!)
    // schoolApproved: false - erfordert Genehmigung durch Super-Admin
    const profileData: Record<string, unknown> = {
      email,
      name,
      schuleId,
      stufe,
      role: "teacher", // Hardcoded - keine Privilege Escalation!
      schoolApproved: false, // Schulzugehörigkeit muss erst genehmigt werden
      createdAt: new Date().toISOString(),
    };

    // Kanton ist optional
    if (kanton) {
      profileData.kanton = kanton;
    }

    await adminDb.collection("teachers").doc(userId).set(profileData);

    // 5. Schulbeitritts-Anfrage erstellen
    let schuleName = "Unbekannt";
    try {
      const schule = await getSchuleById(schuleId);
      if (schule) {
        schuleName = schule.name;
      }
    } catch {
      // Ignorieren - Name bleibt "Unbekannt"
    }

    const requestId = await createSchoolChangeRequest({
      teacherId: userId,
      teacherName: name,
      teacherEmail: email,
      currentSchuleId: "", // Leer bei Neuregistrierung
      currentSchuleName: "", // Leer bei Neuregistrierung
      newSchuleId: schuleId,
      newSchuleName: schuleName,
      requestType: "join", // Schulbeitritt
    });

    // 6. Super-Admins benachrichtigen
    await notifySuperAdminsAboutSchoolRequest({
      requestId,
      teacherId: userId,
      teacherName: name,
      teacherEmail: email,
      requestType: "join",
      currentSchuleName: "",
      newSchuleName: schuleName,
    });

    return NextResponse.json({
      success: true,
      schoolApprovalPending: true,
      message: "Registrierung erfolgreich. Ihre Schulzugehörigkeit muss noch von einem Administrator genehmigt werden.",
    });
  } catch (error) {
    console.error("Error creating teacher profile:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create teacher profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // 1. Authentifizierung prüfen
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
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const authenticatedUserId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const schuleId = searchParams.get("schuleId");

    const adminDb = getAdminDb();

    // CASE 1: Liste von Lehrern einer Schule (für Klassen-Transfer)
    if (schuleId) {
      // User muss zur gleichen Schule gehören oder Admin sein
      const currentUserDoc = await adminDb.collection("teachers").doc(authenticatedUserId).get();
      if (!currentUserDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const currentUserData = currentUserDoc.data()!;
      const userRole = currentUserData.role;

      // Berechtigung prüfen: Gleiche Schule oder Admin
      if (currentUserData.schuleId !== schuleId && userRole !== "picts_admin" && userRole !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden - Cannot access teachers from other schools" },
          { status: 403 }
        );
      }

      // Alle Lehrer der Schule laden (keine Studenten)
      const teachersSnapshot = await adminDb
        .collection("teachers")
        .where("schuleId", "==", schuleId)
        .get();

      const teachers = teachersSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.data().email,
        email: doc.data().email,
        stufe: doc.data().stufe,
        role: doc.data().role || "teacher",
      }));

      return NextResponse.json({ teachers });
    }

    // CASE 2: Einzelnes Profil (bestehende Logik)
    if (!userId) {
      return NextResponse.json(
        { error: "userId or schuleId is required" },
        { status: 400 }
      );
    }

    // 2. User darf nur sein eigenes Profil lesen (keine anderen Profile)
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "Forbidden - You can only access your own profile" },
        { status: 403 }
      );
    }

    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      // Kein Lehrer gefunden - return empty (für AuthContext, damit dann students geprüft wird)
      return NextResponse.json({});
    }

    const teacherData = teacherDoc.data();

    // Fetch school data from Airtable if schuleId exists
    let schuleData = null;
    if (teacherData?.schuleId) {
      schuleData = await getSchuleById(teacherData.schuleId);
    }

    return NextResponse.json({
      ...teacherData,
      schule: schuleData,
    });
  } catch (error) {
    console.error("Error fetching teacher profile:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // 1. Authentifizierung prüfen
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
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const authenticatedUserId = decodedToken.uid;

    const { userId, stufe, kanton, schuleId, newSchuleName, role, dashboardTiles } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // 2. User darf nur sein eigenes Profil ändern
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "Forbidden - You can only update your own profile" },
        { status: 403 }
      );
    }

    const adminDb = getAdminDb();
    const updateData: Record<string, unknown> = {};

    // Hole aktuelles Lehrerprofil
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }
    const teacherData = teacherDoc.data()!;

    // 3. Stufe, Kanton und Dashboard-Kacheln kann jeder User für sich selbst ändern
    if (stufe) updateData.stufe = stufe;
    if (kanton !== undefined) updateData.kanton = kanton || null; // null um zu löschen
    if (dashboardTiles !== undefined) updateData.dashboardTiles = dashboardTiles;

    // 4. Schulwechsel erfordert Genehmigung durch Super-Admin
    if (schuleId && schuleId !== teacherData.schuleId) {
      // Prüfe ob bereits eine offene Anfrage existiert
      const existingRequest = await getPendingRequestForTeacher(userId);
      if (existingRequest) {
        return NextResponse.json(
          {
            error: "Es existiert bereits eine offene Schulwechsel-Anfrage",
            pendingRequest: {
              id: existingRequest.id,
              newSchuleName: existingRequest.newSchuleName,
              createdAt: existingRequest.createdAt,
            },
          },
          { status: 409 }
        );
      }

      // Hole Schulnamen für die Anfrage
      let currentSchuleName = "Unbekannt";
      let targetSchuleName = newSchuleName || "Unbekannt";

      // Hole aktuelle Schule
      try {
        const currentSchule = await getSchuleById(teacherData.schuleId);
        if (currentSchule) {
          currentSchuleName = currentSchule.name;
        }
      } catch {
        // Ignorieren - Name bleibt "Unbekannt"
      }

      // Hole neue Schule (falls Name nicht mitgeliefert)
      if (!newSchuleName) {
        try {
          const newSchule = await getSchuleById(schuleId);
          if (newSchule) {
            targetSchuleName = newSchule.name;
          }
        } catch {
          // Ignorieren
        }
      }

      // Erstelle Schulwechsel-Anfrage
      const requestId = await createSchoolChangeRequest({
        teacherId: userId,
        teacherName: teacherData.name || teacherData.email,
        teacherEmail: teacherData.email,
        currentSchuleId: teacherData.schuleId,
        currentSchuleName,
        newSchuleId: schuleId,
        newSchuleName: targetSchuleName,
        requestType: "change", // Schulwechsel
      });

      // Super-Admins benachrichtigen
      await notifySuperAdminsAboutSchoolRequest({
        requestId,
        teacherId: userId,
        teacherName: teacherData.name || teacherData.email,
        teacherEmail: teacherData.email,
        requestType: "change",
        currentSchuleName,
        newSchuleName: targetSchuleName,
      });

      // Andere Änderungen (stufe, kanton) trotzdem durchführen
      if (Object.keys(updateData).length > 0) {
        await adminDb.collection("teachers").doc(userId).update(updateData);
      }

      return NextResponse.json({
        success: true,
        schoolChangeRequestCreated: true,
        requestId,
        message: "Schulwechsel-Anfrage wurde erstellt und wartet auf Genehmigung durch einen Super-Admin",
      });
    }

    // 5. Role-Updates NUR durch Super-Admin
    if (role !== undefined) {
      const isAdmin = await isSuperAdmin(authenticatedUserId);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - Only super admins can change roles" },
          { status: 403 }
        );
      }
      updateData.role = role;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field (stufe, kanton, schuleId, role or dashboardTiles) is required" },
        { status: 400 }
      );
    }

    await adminDb.collection("teachers").doc(userId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating teacher profile:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update teacher profile" },
      { status: 500 }
    );
  }
}
