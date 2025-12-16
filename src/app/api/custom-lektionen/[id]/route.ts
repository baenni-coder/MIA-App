import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getCustomLektionById,
  updateCustomLektion,
  deleteCustomLektion,
} from "@/lib/firestore/custom-lektionen";

/**
 * PUT /api/custom-lektionen/[id]
 * Aktualisiert eine Custom Lektion
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const lektionId = id;

    // Lektion laden
    const lektion = await getCustomLektionById(lektionId);
    if (!lektion) {
      return NextResponse.json(
        { error: "Lektion not found" },
        { status: 404 }
      );
    }

    // Nur Ersteller kann bearbeiten
    if (lektion.createdBy !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Request Body
    const updates = await request.json();

    // Aktualisiere Lektion
    await updateCustomLektion(lektionId, updates);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/custom-lektionen/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update custom lektion" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/custom-lektionen/[id]
 * Löscht eine Custom Lektion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const lektionId = id;

    // Lektion laden
    const lektion = await getCustomLektionById(lektionId);
    if (!lektion) {
      return NextResponse.json(
        { error: "Lektion not found" },
        { status: 404 }
      );
    }

    // Nur Ersteller kann löschen
    if (lektion.createdBy !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Lösche Lektion
    await deleteCustomLektion(lektionId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/custom-lektionen/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete custom lektion" },
      { status: 500 }
    );
  }
}
