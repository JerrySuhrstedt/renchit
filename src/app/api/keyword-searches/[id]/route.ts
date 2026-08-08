import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const search = await db.keywordSearch.findUnique({
    where: { id },
    include: {
      ideas: { orderBy: { phrase: "asc" } },
    },
  });

  if (!search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }

  return NextResponse.json({ search });
}
