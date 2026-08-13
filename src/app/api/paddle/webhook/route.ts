import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paddle } from "@/lib/paddle";
import { planFromPriceId } from "@/lib/plans";

/**
 * Paddle webhook receiver.
 *
 * Same two rules as any billing webhook:
 *
 * 1. Verify the signature against the raw body before trusting a byte of it.
 *    The SDK's unmarshal does verification and parsing in one step.
 * 2. Return 2xx for anything understood, even when ignored. A non-2xx makes
 *    Paddle retry, and retrying will not fix an event we do not care about.
 *
 * Paddle's model differs from Stripe's in one way that matters here:
 * cancelling does not flip status immediately. The subscription stays active
 * with a scheduled_change of type "cancel" until the period actually ends,
 * which is what cancelAtPeriodEnd is derived from below.
 */

type PaddleSubscriptionEvent = {
  id: string;
  status: string;
  customerId?: string | null;
  currentBillingPeriod?: { startsAt?: string | null; endsAt?: string | null } | null;
  scheduledChange?: { action?: string | null; effectiveAt?: string | null } | null;
  customData?: unknown;
  items?: Array<{ price?: { id?: string | null } | null }>;
};

type PaddleTransactionEvent = {
  id: string;
  status: string;
  customerId?: string | null;
  customData?: unknown;
  items?: Array<{ price?: { id?: string | null } | null }>;
};

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || secret === "PASTE_HERE") {
    console.error("[paddle] PADDLE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("paddle-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing paddle-signature" }, { status: 400 });
  }

  // Raw body, before any JSON parsing, or the signature will not verify.
  const payload = await request.text();

  let event: { eventType: string; data: unknown };
  try {
    event = (await paddle().webhooks.unmarshal(payload, secret, signature)) as unknown as {
      eventType: string;
      data: unknown;
    };
  } catch (err) {
    console.error("[paddle] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.eventType) {
      case "subscription.created":
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.resumed":
      case "subscription.paused":
      case "subscription.canceled":
        await syncSubscription(event.data as PaddleSubscriptionEvent);
        break;

      case "transaction.completed":
        await onTransactionCompleted(event.data as PaddleTransactionEvent);
        break;

      default:
        return NextResponse.json({ received: true, ignored: event.eventType });
    }
  } catch (err) {
    // A 500 tells Paddle to retry, which is what we want for a transient
    // database blip. Anything permanent shows up in their dashboard as a
    // failing destination rather than being swallowed here.
    console.error(`[paddle] handler failed for ${event.eventType}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------

/**
 * Paddle statuses are active | trialing | past_due | paused | canceled.
 * Ours mirror them, so this is mostly a pass-through with paused folded into
 * canceled, since a paused subscription should not keep unlocking tools.
 */
function normalizeStatus(paddleStatus: string): string {
  if (paddleStatus === "paused") return "canceled";
  return paddleStatus;
}

async function syncSubscription(sub: PaddleSubscriptionEvent) {
  const userId = await resolveUserId(sub.customData, sub.customerId);
  if (!userId) {
    console.error("[paddle] subscription with no resolvable user", sub.id);
    return;
  }

  // A lifetime purchase outranks any recurring subscription that came before
  // it, so a later cancellation event must not take their access away.
  const existing = await db.subscription.findUnique({
    where: { userId },
    select: { plan: true, interval: true },
  });
  if (existing?.plan === "lifetime") {
    console.log(`[paddle] ignoring ${sub.id}, user ${userId} is lifetime`);
    return;
  }

  const priceId = sub.items?.[0]?.price?.id ?? null;
  const matched = priceId ? planFromPriceId(priceId) : null;
  if (!matched) {
    console.error("[paddle] no plan matches price", priceId, "on", sub.id);
    return;
  }

  const data = {
    plan: matched.plan,
    status: normalizeStatus(sub.status),
    interval: matched.interval,
    paddleSubscriptionId: sub.id,
    paddlePriceId: priceId,
    currentPeriodEnd: sub.currentBillingPeriod?.endsAt
      ? new Date(sub.currentBillingPeriod.endsAt)
      : null,
    // Paddle keeps the subscription active and records the pending cancel as a
    // scheduled change, rather than flipping status the way Stripe does.
    cancelAtPeriodEnd: sub.scheduledChange?.action === "cancel",
  };

  await db.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  console.log(`[paddle] ${userId} is now ${matched.plan}/${data.status}`);
}

/**
 * Handles the one-time Founding Member purchase. Recurring plans arrive as
 * subscription events instead, so anything with a recurring price is ignored
 * here to avoid double handling.
 */
async function onTransactionCompleted(txn: PaddleTransactionEvent) {
  const priceId = txn.items?.[0]?.price?.id ?? null;
  const matched = priceId ? planFromPriceId(priceId) : null;
  if (!matched || matched.plan !== "lifetime") return;

  const userId = await resolveUserId(txn.customData, txn.customerId);
  if (!userId) {
    console.error("[paddle] completed transaction with no resolvable user", txn.id);
    return;
  }

  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: "lifetime",
      status: "active",
      interval: "once",
      paddlePriceId: priceId,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    update: {
      plan: "lifetime",
      status: "active",
      interval: "once",
      paddlePriceId: priceId,
      // A lifetime purchase supersedes any recurring subscription that came
      // before it, so clear the renewal fields rather than leave stale ones.
      paddleSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`[paddle] lifetime activated for user ${userId}`);
}

/**
 * Finds our user two ways, most trustworthy first: the id we stamped on the
 * transaction when we created it server side, then the Paddle customer we
 * already have on file.
 */
async function resolveUserId(
  customData: unknown,
  customerId: string | null | undefined,
): Promise<string | null> {
  const candidate =
    customData && typeof customData === "object" && "userId" in customData
      ? String((customData as { userId: unknown }).userId)
      : null;

  if (candidate) {
    const found = await db.user.findUnique({ where: { id: candidate }, select: { id: true } });
    if (found) return found.id;
  }

  if (customerId) {
    const found = await db.user.findUnique({
      where: { paddleCustomerId: customerId },
      select: { id: true },
    });
    if (found) return found.id;
  }

  return null;
}
