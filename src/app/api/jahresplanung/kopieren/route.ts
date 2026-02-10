import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { kopiereJahresplan } from "@/lib/firestore/jahresplanung";

/**
 * POST /api/jahresplanung/kopieren
 * Kopiert alle Einheiten eines Schuljahrs in ein neues Schuljahr
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
    if (!body.vonSchuljahr || !body.nachSchuljahr) {
      return NextResponse.json(
        { error: "Quell- und Ziel-Schuljahr sind erforderlich" },
        { status: 400 }
      );
    }

    if (body.vonSchuljahr === body.nachSchuljahr) {
      return NextResponse.json(
        { error: "Quell- und Ziel-Schuljahr müssen unterschiedlich sein" },
        { status: 400 }
      );
    }

    const count = await kopiereJahresplan(
      userId,
      body.vonSchuljahr,
      body.nachSchuljahr
    );

    return NextResponse.json({
      success: true,
      count,
      message: `${count} Einheiten wurden kopiert`,
    });
  } catch (error) {
    console.error("Error copying jahresplan:", error);
    return NextResponse.json(
      { error: "Failed to copy jahresplan" },
      { status: 500 }
    );
  }
}
