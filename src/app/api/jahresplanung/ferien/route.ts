import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  createSchulferienCustom,
  getSchulferienCustom,
  updateSchulferienCustom,
  deleteSchulferienCustom,
} from "@/lib/firestore/jahresplanung";

/**
 * GET /api/jahresplanung/ferien
 * Lädt benutzerdefinierte Ferien eines Lehrers
 *
 * Query Parameters:
 * - schuljahr: Optional, um nach Schuljahr zu filtern
 */
export async function GET(request: NextRequest) {
  try {
    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Query Parameter parsen
    const { searchParams } = new URL(request.url);
    const schuljahr = searchParams.get("schuljahr") || undefined;

    const ferien = await getSchulferienCustom(userId, schuljahr);

    return NextResponse.json({ ferien });
  } catch (error) {
    console.error("Error fetching custom ferien:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom ferien" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jahresplanung/ferien
 * Erstellt benutzerdefinierte Ferien
 */
export async function POST(request: NextRequest) {
  try {
    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();

    // Validierung
    if (!body.schuljahr || !body.ferienName || !body.start || !body.ende) {
      return NextResponse.json(
        { error: "Schuljahr, Ferienname, Start und Ende sind erforderlich" },
        { status: 400 }
      );
    }

    const id = await createSchulferienCustom({
      teacherId: userId,
      schuleId: body.schuleId,
      schuljahr: body.schuljahr,
      ferienName: body.ferienName,
      start: body.start,
      ende: body.ende,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error creating custom ferien:", error);
    return NextResponse.json(
      { error: "Failed to create custom ferien" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/jahresplanung/ferien
 * Aktualisiert benutzerdefinierte Ferien
 */
export async function PUT(request: NextRequest) {
  try {
    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    await adminAuth.verifyIdToken(token);

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID ist erforderlich" },
        { status: 400 }
      );
    }

    await updateSchulferienCustom(body.id, {
      ferienName: body.ferienName,
      start: body.start,
      ende: body.ende,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating custom ferien:", error);
    return NextResponse.json(
      { error: "Failed to update custom ferien" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jahresplanung/ferien
 * Löscht benutzerdefinierte Ferien
 */
export async function DELETE(request: NextRequest) {
  try {
    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    await adminAuth.verifyIdToken(token);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID ist erforderlich" },
        { status: 400 }
      );
    }

    await deleteSchulferienCustom(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom ferien:", error);
    return NextResponse.json(
      { error: "Failed to delete custom ferien" },
      { status: 500 }
    );
  }
}
