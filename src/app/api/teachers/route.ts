import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSchuleById } from "@/lib/airtable/schulen";

export async function POST(request: Request) {
  try {
    const { userId, email, name, schuleId, stufe, role } = await request.json();

    if (!userId || !email || !name || !schuleId || !stufe) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    await adminDb.collection("teachers").doc(userId).set({
      email,
      name,
      schuleId,
      stufe,
      role: role || "teacher", // Standardmäßig "teacher", kann aber überschrieben werden
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating teacher profile:", error);
    return NextResponse.json(
      { error: "Failed to create teacher profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const teacherDoc = await adminDb.collection("teachers").doc(userId).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data();

    // Fetch school data from Airtable if schuleId exists
    let schuleData = null;
    if (teacherData?.schuleId) {
      schuleData = await getSchuleById(teacherData.schuleId);
    }

    return NextResponse.json({
      ...teacherData,
      schule: schuleData,
    });
  } catch (error) {
    console.error("Error fetching teacher profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, stufe, role } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const updateData: Record<string, any> = {};

    // Nur Felder aktualisieren, die übergeben wurden
    if (stufe) updateData.stufe = stufe;
    if (role) updateData.role = role;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field (stufe or role) is required" },
        { status: 400 }
      );
    }

    await adminDb.collection("teachers").doc(userId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating teacher profile:", error);
    return NextResponse.json(
      { error: "Failed to update teacher profile" },
      { status: 500 }
    );
  }
}
