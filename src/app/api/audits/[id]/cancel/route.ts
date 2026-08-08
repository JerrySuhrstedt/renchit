import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  // Only flips audits that are still "running" and owned by this user — the
  // background crawl job checks this same status before writing its final
  // results, so a job that finishes after cancellation won't resurrect it.
  const result = await db.audit.updateMany({
    where: { id, status: "running", site: { userId } },
    data: {
      status: "failed",
      errorMessage: "Cancelled by you.",
      completedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Audit not found or already finished" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
