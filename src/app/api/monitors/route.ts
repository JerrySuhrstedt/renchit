import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { getEntitlements } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";
import { normalizeAuditUrl, EMAIL_PATTERN } from "@/lib/validation";

export async function GET() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const monitors = await db.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      events: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return NextResponse.json({ monitors });
}

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  // Monitoring is a paid feature on every plan that has it, so the same
  // entitlement that governs the tools governs this.
  const ent = await getEntitlements(userId);
  if (PLANS[ent.plan].monitoring === "none") {
    return NextResponse.json(
      {
        error: "Monitoring is part of the paid plans. Upgrade to have us watch your site.",
        reason: "tool-locked",
        upgradeUrl: "/pricing",
      },
      { status: 402 },
    );
  }

  let body: { url?: string; intervalMinutes?: number; email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.url) return NextResponse.json({ error: "A URL is required" }, { status: 400 });

  let url: string;
  try {
    url = normalizeAuditUrl(body.url);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }

  // A watched site with nobody to tell is a checkbox, not a safety net, so the
  // first contact is part of adding the site rather than a step to remember.
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json(
      { error: "Add the email address that should hear if this site goes down." },
      { status: 400 },
    );
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }

  // One monitor per site the plan allows, so monitoring cannot be used to get
  // around the site limit.
  const existing = await db.monitor.count({ where: { userId } });
  if (ent.siteLimit !== null && existing >= ent.siteLimit) {
    const already = await db.monitor.findUnique({ where: { userId_url: { userId, url } } });
    if (!already) {
      return NextResponse.json(
        {
          error: `Your plan covers ${ent.siteLimit === 1 ? "1 website" : `${ent.siteLimit} websites`}. Upgrade to watch another.`,
          reason: "site-limit",
          upgradeUrl: "/pricing",
        },
        { status: 402 },
      );
    }
  }

  // Faster than every five minutes is not useful here and multiplies our
  // outbound requests for no benefit.
  const interval = Math.max(5, Math.min(Number(body.intervalMinutes ?? 5), 60));

  // One transaction, so a site can never exist with nobody watching it. If the
  // contact fails to save, the site does not get created either.
  const monitor = await db.$transaction(async (tx) => {
    const m = await tx.monitor.upsert({
      where: { userId_url: { userId, url } },
      create: { userId, url, intervalMinutes: interval },
      update: { enabled: true, intervalMinutes: interval },
    });

    await tx.alertRecipient.upsert({
      where: { monitorId_email: { monitorId: m.id, email } },
      create: { userId, monitorId: m.id, email, name: body.name?.trim() || null },
      update: {},
    });

    return m;
  });

  return NextResponse.json({ monitor }, { status: 201 });
}
