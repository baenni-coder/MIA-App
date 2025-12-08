import { NextResponse } from "next/server";
import { getAllThemen, getThemenByStufe, getThemenGroupedByZeitraum } from "@/lib/airtable/themen";
import { Stufe } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stufe = searchParams.get("stufe") as Stufe | null;
    const grouped = searchParams.get("grouped") === "true";

    if (stufe && grouped) {
      const themenGrouped = await getThemenGroupedByZeitraum(stufe);
      return NextResponse.json(themenGrouped);
    }

    if (stufe) {
      const themen = await getThemenByStufe(stufe);
      return NextResponse.json(themen);
    }

    const allThemen = await getAllThemen();
    return NextResponse.json(allThemen);
  } catch (error) {
    console.error("Error fetching Themen:", error);
    return NextResponse.json(
      { error: "Failed to fetch Themen" },
      { status: 500 }
    );
  }
}
