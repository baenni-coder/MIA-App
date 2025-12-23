import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { getSchuleById } from "@/lib/airtable/schulen";
import { isSuperAdmin } from "@/lib/firestore/permissions";

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

    const { userId, email, name, schuleId, stufe } = await request.json();

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
    await adminDb.collection("teachers").doc(userId).set({
      email,
      name,
      schuleId,
      stufe,
      role: "teacher", // Hardcoded - keine Privilege Escalation!
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
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

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
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

    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
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

    const { userId, stufe, role } = await request.json();

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
    const updateData: Record<string, any> = {};

    // 3. Stufe kann jeder User für sich selbst ändern
    if (stufe) updateData.stufe = stufe;

    // 4. Role-Updates NUR durch Super-Admin
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
        { error: "At least one field (stufe or role) is required" },
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
