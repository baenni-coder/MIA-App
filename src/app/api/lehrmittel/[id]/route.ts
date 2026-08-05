import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getLehrmittelById,
  updateLehrmittel,
  deleteLehrmittel,
} from "@/lib/firestore/lehrmittel";
import { validateStringLength } from "@/lib/validation/input";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type Caller = { userId: string; role: string; schuleId: string; name: string };

async function authenticate(
  request: NextRequest
): Promise<Caller | NextResponse> {
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
  const t = teacherDoc.data()!;
  return {
    userId,
    role: t.role || "teacher",
    schuleId: t.schuleId || "",
    name: t.name || "Unbekannt",
  };
}

/**
 * PUT /api/lehrmittel/[id]
 * - Ersteller: name, bildUrl, beschreibung
 * - Admin (picts_admin/super_admin): zusätzlich isSystemWide-Freigabe
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticate(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const lehrmittel = await getLehrmittelById(id);
    if (!lehrmittel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAdmin = ["picts_admin", "super_admin"].includes(auth.role);
    const isOwner = lehrmittel.createdBy === auth.userId;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const check = validateStringLength(body.name, "name", 200, true);
      if (!check.valid) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      updates.name = String(body.name).trim();
    }
    if (body.beschreibung !== undefined) {
      const check = validateStringLength(body.beschreibung, "beschreibung", 2000);
      if (!check.valid) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      updates.beschreibung = body.beschreibung || null;
    }
    if (body.bildUrl !== undefined) {
      updates.bildUrl = body.bildUrl || null;
    }

    // isSystemWide-Freigabe nur durch Admins
    if (body.isSystemWide !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Nur Admins können Lehrmittel systemweit freigeben" },
          { status: 403 }
        );
      }
      updates.isSystemWide = Boolean(body.isSystemWide);
      if (body.isSystemWide) {
        updates.approvedBy = auth.userId;
        updates.approvedByName = auth.name;
        updates.approvedAt = new Date();
      } else {
        updates.approvedBy = null;
        updates.approvedByName = null;
        updates.approvedAt = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Felder zum Aktualisieren" },
        { status: 400 }
      );
    }

    await updateLehrmittel(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/lehrmittel/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update lehrmittel" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lehrmittel/[id]
 * Ersteller oder Admin.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticate(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const lehrmittel = await getLehrmittelById(id);
    if (!lehrmittel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAdmin = ["picts_admin", "super_admin"].includes(auth.role);
    const isOwner = lehrmittel.createdBy === auth.userId;
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteLehrmittel(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/lehrmittel/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete lehrmittel" },
      { status: 500 }
    );
  }
}
