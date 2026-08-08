import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const audit = await db.audit.findUnique({
    where: { id },
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
  const { id } = await params;
  await db.audit.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
