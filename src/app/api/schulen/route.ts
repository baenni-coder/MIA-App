import { NextResponse } from "next/server";
import { getAllSchulen, createSchule, updateSchule, deleteSchule } from "@/lib/airtable/schulen";

export async function GET() {
  try {
    const schulen = await getAllSchulen();
    return NextResponse.json(schulen);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch Schulen" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, ort } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const schule = await createSchule(name, ort);

    if (!schule) {
      return NextResponse.json(
        { error: "Failed to create Schule" },
        { status: 500 }
      );
    }

    return NextResponse.json(schule);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create Schule" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, ort } = await request.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID and Name are required" },
        { status: 400 }
      );
    }

    const success = await updateSchule(id, name, ort);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update Schule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update Schule" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const success = await deleteSchule(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete Schule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete Schule" },
      { status: 500 }
    );
  }
}
