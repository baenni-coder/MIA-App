import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  getAllFAQItems,
  createFAQItem,
  initializeFAQItems,
} from "@/lib/firestore/faq";
import { validateFAQInput } from "@/lib/validation/input";
import { FAQCategory } from "@/types";

/**
 * GET /api/faq
 * Holt alle FAQ-Einträge
 * Query Params:
 * - includeInactive: boolean (nur für Admins)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Für includeInactive brauchen wir Admin-Rechte
    if (includeInactive) {
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
    }

    const items = await getAllFAQItems(includeInactive);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/faq:", error);
    return NextResponse.json(
      { error: "Failed to fetch FAQ items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faq
 * Erstellt einen neuen FAQ-Eintrag (nur Admins)
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

    // Parse Request Body
    const body = await request.json();
    const { question, answer, category, order, isActive } = body;

    // Validierung der Pflichtfelder
    if (!question || !answer || !category) {
      return NextResponse.json(
        { error: "Question, answer and category are required" },
        { status: 400 }
      );
    }

    // Input-Längenvalidierung
    const inputValidation = validateFAQInput(body);
    if (!inputValidation.valid) {
      return NextResponse.json(
        { error: inputValidation.error },
        { status: 400 }
      );
    }

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

    // FAQ erstellen
    const id = await createFAQItem(
      {
        question,
        answer,
        category,
        order: order ?? 0,
        isActive: isActive ?? true,
      },
      userId,
      teacher.name || teacher.email
    );

    return NextResponse.json(
      { id, message: "FAQ-Eintrag erfolgreich erstellt" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/faq:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to create FAQ item" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/faq (Batch-Operation)
 * Initialisiert FAQ mit Standard-Einträgen (nur Super-Admins)
 */
export async function PUT(request: NextRequest) {
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

    // FAQ initialisieren
    const count = await initializeFAQItems(userId, teacher.name || teacher.email);

    if (count === 0) {
      return NextResponse.json(
        { message: "FAQ bereits initialisiert", count: 0 },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: `${count} FAQ-Einträge erstellt`, count },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in PUT /api/faq:", error);

    if ((error as any).code === "auth/argument-error") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to initialize FAQ" },
      { status: 500 }
    );
  }
}
