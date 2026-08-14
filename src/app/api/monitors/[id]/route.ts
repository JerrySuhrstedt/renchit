import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

/** Pause, resume, or remove a monitor. Scoped to the owner throughout. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  let body: { enabled?: boolean; intervalMinutes?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updated = await db.monitor.updateMany({
    where: { id, userId },
    data: {
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(body.intervalMinutes
        ? { intervalMinutes: Math.max(5, Math.min(Number(body.intervalMinutes), 60)) }
        : {}),
    },
  });

  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  const deleted = await db.monitor.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
