import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  await db.localListing.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
