import { NextRequest, NextResponse } from "next/server";
import { getLektionenByThemaName } from "@/lib/data-sources/lektionen-adapter";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const themaName = searchParams.get("thema");

    if (!themaName) {
      return NextResponse.json(
        { error: "Thema-Name ist erforderlich" },
        { status: 400 }
      );
    }

    // Lade Lektionsplanung für das Thema
    // Verwendet Firestore Cache wenn aktiviert, sonst Airtable
    const lektionen = await getLektionenByThemaName(themaName);

    return NextResponse.json({ lektionen }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/lektionsplanung:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Lektionsplanung" },
      { status: 500 }
    );
  }
}
