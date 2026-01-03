import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { Schule, UserRole } from "@/types";

interface SchoolWithUsers extends Schule {
  users: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    stufe: string;
  }[];
  pictsAdmins: {
    id: string;
    name: string;
    email: string;
  }[];
  userCount: number;
}

/**
 * GET /api/admin/schools
 * Holt alle Schulen mit Benutzerübersicht (nur Super-Admin)
 */
export async function GET(request: NextRequest) {
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
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Prüfe Super-Admin-Status
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const teacher = teacherDoc.data()!;
    if (teacher.role !== "super_admin") {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    // Hole alle Schulen aus dem Cache
    const schulenSnapshot = await adminDb.collection("system_schulen").get();
    const schulen: Schule[] = schulenSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      ort: doc.data().ort,
      pictsBuchen: doc.data().pictsBuchen,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));

    // Hole alle Lehrer
    const teachersSnapshot = await adminDb.collection("teachers").get();
    const allTeachers = teachersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Gruppiere Lehrer nach Schule
    const schoolsWithUsers: SchoolWithUsers[] = schulen.map((schule) => {
      const schoolUsers = allTeachers.filter(
        (t: any) => t.schuleId === schule.id
      );
      const pictsAdmins = schoolUsers.filter(
        (t: any) => t.role === "picts_admin" || t.role === "super_admin"
      );

      return {
        ...schule,
        users: schoolUsers.map((t: any) => ({
          id: t.id,
          name: t.name || "Unbenannt",
          email: t.email,
          role: t.role || "teacher",
          stufe: t.stufe || "-",
        })),
        pictsAdmins: pictsAdmins.map((t: any) => ({
          id: t.id,
          name: t.name || "Unbenannt",
          email: t.email,
        })),
        userCount: schoolUsers.length,
      };
    });

    // Sortiere nach Name
    schoolsWithUsers.sort((a, b) => a.name.localeCompare(b.name));

    // Füge Statistiken hinzu
    const stats = {
      totalSchools: schoolsWithUsers.length,
      totalUsers: allTeachers.length,
      totalPictsAdmins: allTeachers.filter(
        (t: any) => t.role === "picts_admin"
      ).length,
      totalSuperAdmins: allTeachers.filter(
        (t: any) => t.role === "super_admin"
      ).length,
    };

    return NextResponse.json(
      {
        schools: schoolsWithUsers,
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/admin/schools:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch schools" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/schools
 * Erstellt eine neue Schule (nur Super-Admin)
 */
export async function POST(request: NextRequest) {
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
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Prüfe Super-Admin-Status
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const teacher = teacherDoc.data()!;
    if (teacher.role !== "super_admin") {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    // Parse Request Body
    const body = await request.json();
    const { name, ort, pictsBuchen } = body;

    // Validierung
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Erstelle neue Schule
    const now = new Date();
    const docRef = await adminDb.collection("system_schulen").add({
      name,
      ort: ort || "",
      pictsBuchen: pictsBuchen || "",
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: now,
      isActive: true,
      // Kein airtableId, da manuell erstellt
    });

    return NextResponse.json(
      {
        id: docRef.id,
        message: "Schule erfolgreich erstellt",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/admin/schools:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 }
    );
  }
}
