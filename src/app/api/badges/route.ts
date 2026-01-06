import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getAllBadges,
  createCustomBadge,
  initializeSystemBadges,
} from "@/lib/firestore/student-progress";
import { BadgeRarity } from "@/types";

/**
 * GET /api/badges
 * Holt alle Badges (System + Custom für die Schule des Users)
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Lehrer-Daten holen für schoolId
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Lehrer nicht gefunden" },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data()!;
    const schoolId = teacherData.schuleId;

    // URL-Parameter prüfen
    const { searchParams } = new URL(request.url);
    const initSystem = searchParams.get("initSystem");

    // System-Badges initialisieren falls angefordert (nur Admins)
    if (initSystem === "true") {
      if (!["picts_admin", "super_admin"].includes(teacherData.role)) {
        return NextResponse.json(
          { error: "Nur Admins können System-Badges initialisieren" },
          { status: 403 }
        );
      }
      await initializeSystemBadges();
    }

    // Alle Badges holen
    const badges = await getAllBadges(schoolId);

    return NextResponse.json({ badges });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Badges" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/badges
 * Erstellt ein neues Custom-Badge
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Lehrer-Daten holen
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Lehrer nicht gefunden" },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data()!;

    // Body parsen
    const body = await request.json();
    const { name, emoji, description, rarity } = body;

    // Validierung
    if (!name || !emoji || !description || !rarity) {
      return NextResponse.json(
        { error: "Name, Emoji, Beschreibung und Seltenheit sind erforderlich" },
        { status: 400 }
      );
    }

    const validRarities: BadgeRarity[] = ["common", "rare", "epic", "legendary"];
    if (!validRarities.includes(rarity)) {
      return NextResponse.json(
        { error: "Ungültige Seltenheit" },
        { status: 400 }
      );
    }

    // Badge erstellen
    const badgeId = await createCustomBadge({
      name,
      emoji,
      description,
      rarity,
      createdBy: userId,
      createdByName: teacherData.name || "Unbekannt",
      schoolId: teacherData.schuleId,
    });

    return NextResponse.json({ id: badgeId });
  } catch (error) {
    console.error("Error creating badge:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Badges" },
      { status: 500 }
    );
  }
}
