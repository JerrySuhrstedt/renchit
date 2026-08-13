import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

const STATUSES = new Set(["new", "triaged", "done"]);

/** Admin only: move a report through new, triaged, done. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    // 404 rather than 403: no reason to confirm this route exists to anyone
    // who is not an admin.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await db.feedback.update({ where: { id }, data: { status: body.status } });
  return NextResponse.json({ ok: true });
}
