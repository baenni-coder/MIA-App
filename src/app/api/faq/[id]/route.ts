import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getFAQItem,
  updateFAQItem,
  deleteFAQItem,
  toggleFAQItemActive,
} from "@/lib/firestore/faq";
import { FAQCategory } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/faq/[id]
 * Holt einen einzelnen FAQ-Eintrag
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const item = await getFAQItem(id);
    if (!item) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/faq/[id]:", error);
    return NextResponse.json(
      { error: "Failed to fetch FAQ item" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/faq/[id]
 * Aktualisiert einen FAQ-Eintrag (nur Admins)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Prüfe Admin-Status
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const teacher = teacherDoc.data()!;
    if (teacher.role !== "picts_admin" && teacher.role !== "super_admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Prüfe ob FAQ existiert
    const existingItem = await getFAQItem(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    // Parse Request Body
    const body = await request.json();
    const { question, answer, category, order, isActive, media } = body;

    // Validierung (wenn Kategorie angegeben)
    if (category) {
      const validCategories: FAQCategory[] = [
        "allgemein",
        "jahresplan",
        "themen",
        "dateien",
        "admin",
      ];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }

    // Baue Update-Objekt
    const updates: Record<string, unknown> = {};
    if (question !== undefined) updates.question = question;
    if (answer !== undefined) updates.answer = answer;
    if (category !== undefined) updates.category = category;
    if (order !== undefined) updates.order = order;
    if (isActive !== undefined) updates.isActive = isActive;
    if (media !== undefined) updates.media = media;

    // Update durchführen
    await updateFAQItem(id, updates);

    return NextResponse.json(
      { success: true, message: "FAQ-Eintrag erfolgreich aktualisiert" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/faq/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update FAQ item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/faq/[id]
 * Löscht einen FAQ-Eintrag (nur Admins)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Prüfe Admin-Status
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const teacher = teacherDoc.data()!;
    if (teacher.role !== "picts_admin" && teacher.role !== "super_admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Prüfe ob FAQ existiert
    const existingItem = await getFAQItem(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    // Löschen
    await deleteFAQItem(id);

    return NextResponse.json(
      { success: true, message: "FAQ-Eintrag erfolgreich gelöscht" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/faq/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete FAQ item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/faq/[id]
 * Toggle aktiv/inaktiv Status (nur Admins)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Prüfe Admin-Status
    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const teacher = teacherDoc.data()!;
    if (teacher.role !== "picts_admin" && teacher.role !== "super_admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Prüfe ob FAQ existiert
    const existingItem = await getFAQItem(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    // Parse Request Body
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    // Toggle Status
    await toggleFAQItemActive(id, isActive);

    return NextResponse.json(
      {
        success: true,
        message: isActive
          ? "FAQ-Eintrag aktiviert"
          : "FAQ-Eintrag deaktiviert",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PATCH /api/faq/[id]:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to toggle FAQ item status" },
      { status: 500 }
    );
  }
}
