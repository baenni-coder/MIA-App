import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  getJahresplanEinheitById,
  updateEinheitSharing,
} from "@/lib/firestore/jahresplanung";

/**
 * PUT /api/jahresplanung/[id]/sharing
 * Aktualisiert die Sharing-Einstellungen einer Einheit
 * Nur der Owner darf Sharing-Einstellungen ändern
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Einheit laden
    const einheit = await getJahresplanEinheitById(id);

    if (!einheit) {
      return NextResponse.json(
        { error: "Einheit nicht gefunden" },
        { status: 404 }
      );
    }

    // Nur Owner darf Sharing ändern
    if (einheit.teacherId !== userId) {
      return NextResponse.json(
        { error: "Nur der Ersteller kann die Freigabe verwalten" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sharedWith, isShared } = body;

    if (!Array.isArray(sharedWith)) {
      return NextResponse.json(
        { error: "sharedWith muss ein Array sein" },
        { status: 400 }
      );
    }

    await updateEinheitSharing(
      id,
      sharedWith,
      typeof isShared === "boolean" ? isShared : einheit.isShared
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating sharing:", error);
    return NextResponse.json(
      { error: "Failed to update sharing" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jahresplanung/[id]/sharing
 * Lädt die aktuellen Sharing-Einstellungen
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth prüfen
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const einheit = await getJahresplanEinheitById(id);

    if (!einheit) {
      return NextResponse.json(
        { error: "Einheit nicht gefunden" },
        { status: 404 }
      );
    }

    // Nur Owner oder sharedWith darf Sharing sehen
    const isOwner = einheit.teacherId === userId;
    const isSharedWithUser = einheit.sharedWith?.includes(userId) || false;
    if (!isOwner && !isSharedWithUser && !einheit.isShared) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      isShared: einheit.isShared,
      sharedWith: einheit.sharedWith || [],
      isOwner,
    });
  } catch (error) {
    console.error("Error getting sharing:", error);
    return NextResponse.json(
      { error: "Failed to get sharing" },
      { status: 500 }
    );
  }
}
