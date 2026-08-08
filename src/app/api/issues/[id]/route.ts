import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

const VALID_STATUSES = new Set(["open", "resolved", "ignored"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const owned = await db.issue.findFirst({
    where: { id, audit: { site: { userId } } },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const issue = await db.issue.update({
    where: { id },
    data: {
      status: body.status,
      resolvedAt: body.status === "resolved" ? new Date() : null,
    },
  });

  return NextResponse.json({ issue });
}
