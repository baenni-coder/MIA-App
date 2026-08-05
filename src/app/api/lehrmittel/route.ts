import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getAllLehrmittel, createLehrmittel } from "@/lib/firestore/lehrmittel";
import { validateStringLength } from "@/lib/validation/input";

/**
 * GET /api/lehrmittel
 * Lädt alle sichtbaren Lehrmittel (systemweit + eigene Schule).
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);

    let userId: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    const schuleId = teacherDoc.exists
      ? teacherDoc.data()?.schuleId
      : undefined;

    const lehrmittel = await getAllLehrmittel(schuleId);
    return NextResponse.json({ lehrmittel });
  } catch (error) {
    console.error("Error in GET /api/lehrmittel:", error);
    return NextResponse.json(
      { error: "Failed to load lehrmittel" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lehrmittel
 * Erstellt ein neues (schulweites) Lehrmittel.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);

    let userId: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }
    const teacher = teacherDoc.data()!;
    if (!teacher.schuleId) {
      return NextResponse.json(
        { error: "No school assigned to teacher" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, bildUrl, beschreibung } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const nameCheck = validateStringLength(name, "name", 200);
    if (!nameCheck.valid) {
      return NextResponse.json({ error: nameCheck.error }, { status: 400 });
    }
    if (beschreibung !== undefined) {
      const descCheck = validateStringLength(beschreibung, "beschreibung", 2000);
      if (!descCheck.valid) {
        return NextResponse.json({ error: descCheck.error }, { status: 400 });
      }
    }

    const id = await createLehrmittel({
      name: name.trim(),
      bildUrl: typeof bildUrl === "string" && bildUrl ? bildUrl : undefined,
      beschreibung:
        typeof beschreibung === "string" && beschreibung
          ? beschreibung
          : undefined,
      schuleId: teacher.schuleId,
      createdBy: userId,
      createdByName: teacher.name || "Unbekannt",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/lehrmittel:", error);
    return NextResponse.json(
      { error: "Failed to create lehrmittel" },
      { status: 500 }
    );
  }
}
