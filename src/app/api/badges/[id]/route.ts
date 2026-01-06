import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { deleteCustomBadge } from "@/lib/firestore/student-progress";

/**
 * DELETE /api/badges/[id]
 * Löscht ein Custom-Badge
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: badgeId } = await params;

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

    // Badge-Daten holen zur Überprüfung
    const badgeDoc = await adminDb.collection("badges").doc(badgeId).get();

    if (!badgeDoc.exists) {
      return NextResponse.json(
        { error: "Badge nicht gefunden" },
        { status: 404 }
      );
    }

    const badgeData = badgeDoc.data()!;

    // Nur der Ersteller oder ein Admin kann löschen
    if (
      badgeData.createdBy !== userId &&
      !["picts_admin", "super_admin"].includes(teacherData.role)
    ) {
      return NextResponse.json(
        { error: "Keine Berechtigung zum Löschen" },
        { status: 403 }
      );
    }

    // Badge muss zur gleichen Schule gehören (außer für Super-Admins)
    if (
      badgeData.schoolId !== teacherData.schuleId &&
      teacherData.role !== "super_admin"
    ) {
      return NextResponse.json(
        { error: "Badge gehört zu einer anderen Schule" },
        { status: 403 }
      );
    }

    await deleteCustomBadge(badgeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("Error deleting badge:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
