import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const idea = await db.keywordIdea.update({
    where: { id },
    data: { saved: body.saved },
  });

  return NextResponse.json({ idea });
}
