import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { reapStaleRuns } from "@/lib/stale-runs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  // A run killed mid-flight leaves its row saying "running" forever, and
  // the page polling for it is the only thing positioned to notice.
  await reapStaleRuns(userId);

  const { id } = await params;

  const grade = await db.contentGrade.findFirst({ where: { id, userId } });

  if (!grade) {
    return NextResponse.json({ error: "Grade not found" }, { status: 404 });
  }

  return NextResponse.json({ grade });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  await db.contentGrade.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
