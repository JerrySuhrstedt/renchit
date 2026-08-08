import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  let body: { saved?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.saved !== "boolean") {
    return NextResponse.json({ error: "saved must be a boolean" }, { status: 400 });
  }

  const owned = await db.keywordIdea.findFirst({
    where: { id, search: { userId } },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  const idea = await db.keywordIdea.update({
    where: { id },
    data: { saved: body.saved },
  });

  return NextResponse.json({ idea });
}
