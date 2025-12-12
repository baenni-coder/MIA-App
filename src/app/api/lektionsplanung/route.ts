import { NextRequest, NextResponse } from "next/server";
import { getLektionsplanungByThemaName } from "@/lib/airtable/lektionsplanung";

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
    const lektionen = await getLektionsplanungByThemaName(themaName);

    return NextResponse.json({ lektionen }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/lektionsplanung:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Lektionsplanung" },
      { status: 500 }
    );
  }
}
