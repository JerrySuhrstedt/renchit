import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { reapStaleRuns } from "@/lib/stale-runs";
import type { PageSpeedCheckDTO } from "@/lib/page-speed-types";

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
  const check = await db.pageSpeedCheck.findFirst({ where: { id, userId } });

  if (!check) {
    return NextResponse.json({ error: "Check not found" }, { status: 404 });
  }

  const dto: PageSpeedCheckDTO = {
    id: check.id,
    url: check.url,
    status: check.status as PageSpeedCheckDTO["status"],
    errorMessage: check.errorMessage,
    mobile: check.mobileJson ? JSON.parse(check.mobileJson) : null,
    desktop: check.desktopJson ? JSON.parse(check.desktopJson) : null,
    createdAt: check.createdAt.toISOString(),
  };

  return NextResponse.json({ check: dto });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  await db.pageSpeedCheck.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
