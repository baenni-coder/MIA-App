import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSchuleById } from "@/lib/airtable/schulen";

export async function POST(request: Request) {
  try {
    const { userId, email, name, schuleId, stufe } = await request.json();

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
      role: "teacher",
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
    const { userId, stufe } = await request.json();

    if (!userId || !stufe) {
      return NextResponse.json(
        { error: "userId and stufe are required" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    await adminDb.collection("teachers").doc(userId).update({
      stufe,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating teacher profile:", error);
    return NextResponse.json(
      { error: "Failed to update teacher profile" },
      { status: 500 }
    );
  }
}
