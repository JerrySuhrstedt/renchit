import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

const MAX_RECIPIENTS = 10;

export async function GET() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const recipients = await db.alertRecipient.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ recipients });
}

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: { name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim() || null;

  if (!email) {
    return NextResponse.json(
      { error: "Add an email address for this contact." },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }

  // A cap, because every recipient is an outbound message we pay for and a
  // list this size is already past what a small business needs.
  const count = await db.alertRecipient.count({ where: { userId } });
  if (count >= MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `You can have up to ${MAX_RECIPIENTS} alert contacts.` },
      { status: 400 },
    );
  }

  const recipient = await db.alertRecipient.create({
    data: {
      userId,
      name: body.name?.trim() || null,
      email,
      emailEnabled: true,
    },
  });

  return NextResponse.json({ recipient }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const deleted = await db.alertRecipient.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
