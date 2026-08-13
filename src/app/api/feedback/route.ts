import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";

const KINDS = new Set(["bug", "confusing", "idea", "praise"]);
const MAX_MESSAGE = 4000;

export async function POST(request: Request) {
  // Deliberately not gated behind requireUserIdForApi. Someone whose session
  // broke is exactly the person with something worth telling us, so anonymous
  // reports are accepted rather than bounced.
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let body: {
    kind?: string;
    message?: string;
    pageUrl?: string;
    viewport?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Tell us what happened" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "That is longer than we can store" }, { status: 400 });
  }

  const kind = body.kind && KINDS.has(body.kind) ? body.kind : "bug";

  // Recording the plan at submission time matters: entitlement bugs are the
  // ones most likely to be reported, and by the time anyone reads this the
  // user's plan may well have changed.
  let plan: string | null = null;
  if (userId) {
    plan = await getEntitlements(userId)
      .then((e) => `${e.plan}/${e.status}`)
      .catch(() => null);
  }

  await db.feedback.create({
    data: {
      userId,
      kind,
      message,
      pageUrl: body.pageUrl?.slice(0, 500) ?? null,
      plan,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      viewport: body.viewport?.slice(0, 40) ?? null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
