import { NextRequest, NextResponse } from "next/server";
import { getAllKompetenzen } from "@/lib/airtable/kompetenzen";

/**
 * GET /api/kompetenzen
 * Lädt alle Kompetenzen aus Airtable
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Unterrichtsideen auflösen
    const resolveUnterrichtsideen =
      request.nextUrl.searchParams.get("resolveUnterrichtsideen") !== "false";

    const kompetenzen = await getAllKompetenzen(resolveUnterrichtsideen);

    return NextResponse.json(
      { kompetenzen },
      {
        status: 200,
        headers: {
          // Cache für 1 Stunde
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/kompetenzen:", error);
    return NextResponse.json(
      { error: "Failed to fetch kompetenzen" },
      { status: 500 }
    );
  }
}
