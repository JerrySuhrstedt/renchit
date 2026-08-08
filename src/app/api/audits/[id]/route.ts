import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  const audit = await db.audit.findFirst({
    where: { id, site: { userId } },
    include: {
      site: true,
      issues: { orderBy: [{ severity: "asc" }, { createdAt: "asc" }] },
      pages: { orderBy: { crawledAt: "asc" } },
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  return NextResponse.json({ audit });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  await db.audit.deleteMany({ where: { id, site: { userId } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
