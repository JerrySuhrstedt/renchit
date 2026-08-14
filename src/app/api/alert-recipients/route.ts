import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { EMAIL_PATTERN } from "@/lib/validation";

/** Per site, not per account. Ten people is already past what a shop needs. */
const MAX_PER_MONITOR = 10;

export async function GET(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const monitorId = new URL(request.url).searchParams.get("monitorId");

  const recipients = await db.alertRecipient.findMany({
    where: { userId, ...(monitorId ? { monitorId } : {}) },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ recipients });
}

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: { name?: string; email?: string; monitorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Add an email address for this contact." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }
  if (!body.monitorId) {
    return NextResponse.json({ error: "Pick which site this contact is for." }, { status: 400 });
  }

  // Scoped by userId as well as id, so a guessed monitor id from another
  // account finds nothing rather than quietly adding a recipient to it.
  const monitor = await db.monitor.findFirst({
    where: { id: body.monitorId, userId },
    select: { id: true },
  });
  if (!monitor) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const count = await db.alertRecipient.count({ where: { monitorId: monitor.id } });
  if (count >= MAX_PER_MONITOR) {
    return NextResponse.json(
      { error: `You can have up to ${MAX_PER_MONITOR} contacts per site.` },
      { status: 400 },
    );
  }

  const existing = await db.alertRecipient.findUnique({
    where: { monitorId_email: { monitorId: monitor.id, email } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "That address is already on the list for this site." },
      { status: 400 },
    );
  }

  const recipient = await db.alertRecipient.create({
    data: { userId, monitorId: monitor.id, email, name: body.name?.trim() || null },
  });

  return NextResponse.json({ recipient }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const recipient = await db.alertRecipient.findFirst({
    where: { id, userId },
    select: { id: true, monitorId: true },
  });
  if (!recipient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Removing the last contact would leave a site being checked with nobody to
  // tell, which looks like monitoring and is not. Stop watching the site
  // instead, which at least says plainly that nothing is being watched.
  const remaining = await db.alertRecipient.count({
    where: { monitorId: recipient.monitorId },
  });
  if (remaining <= 1) {
    return NextResponse.json(
      {
        error:
          "This is the only person being told about this site. Add someone else first, or stop watching the site.",
        reason: "last-recipient",
      },
      { status: 400 },
    );
  }

  await db.alertRecipient.delete({ where: { id: recipient.id } });
  return NextResponse.json({ ok: true });
}
