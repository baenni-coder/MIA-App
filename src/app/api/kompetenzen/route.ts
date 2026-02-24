import { NextRequest, NextResponse } from "next/server";
import { getKompetenzen } from "@/lib/data-sources/kompetenzen-adapter";

/**
 * GET /api/kompetenzen
 * Lädt alle Kompetenzen (Firestore Cache oder Airtable Fallback)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Unterrichtsideen auflösen
    const resolveUnterrichtsideen =
      request.nextUrl.searchParams.get("resolveUnterrichtsideen") !== "false";

    const cacheEnabled = process.env.ENABLE_FIRESTORE_CACHE === "true";
    const dataSource = cacheEnabled ? "firestore-cache" : "airtable-direct";

    const kompetenzen = await getKompetenzen(resolveUnterrichtsideen);

    return NextResponse.json(
      { kompetenzen },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
          "X-Data-Source": dataSource,
          "X-Cache-Enabled": cacheEnabled.toString(),
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
