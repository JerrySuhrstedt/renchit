import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { planFromPriceId } from "@/lib/plans";

/**
 * Stripe webhook receiver.
 *
 * Two rules keep this honest:
 *
 * 1. Never trust the event body as the source of truth. Events can arrive out
 *    of order, so for subscriptions we take the id off the event and re-read
 *    the object from Stripe. Whatever Stripe says right now wins.
 * 2. Always 200 on anything we understood, even if we chose to ignore it.
 *    A non-2xx makes Stripe retry, and retrying will not fix a payload we do
 *    not care about.
 */

const RELEVANT = new Set<string>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // Raw body, before any JSON parsing, or the signature will not verify.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error("[stripe] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!RELEVANT.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object.id);
        break;
    }
  } catch (err) {
    // A 500 tells Stripe to retry, which is what we want for a transient
    // database blip. Anything permanent will show up in the Stripe dashboard
    // as a failing endpoint rather than being swallowed here.
    console.error(`[stripe] handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Recurring plans are handled entirely by the subscription events, which
  // carry more state and also fire on every later renewal and change.
  if (session.mode === "subscription") {
    if (typeof session.subscription === "string") {
      await syncSubscription(session.subscription);
    }
    return;
  }

  // One-time payment, which for us means the Founding Member lifetime deal.
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;

  const userId = await resolveUserId(session.client_reference_id, session.metadata, session.customer);
  if (!userId) {
    console.error("[stripe] paid session with no resolvable user", session.id);
    return;
  }

  const priceId = await firstPriceIdOfSession(session.id);
  const matched = priceId ? planFromPriceId(priceId) : null;

  // Guard against someone paying a one-time price that is not the LTD.
  if (matched && matched.plan !== "lifetime") {
    console.error("[stripe] unexpected one-time price", priceId);
    return;
  }

  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: "lifetime",
      status: "active",
      interval: "once",
      stripePriceId: priceId,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    update: {
      plan: "lifetime",
      status: "active",
      interval: "once",
      stripePriceId: priceId,
      // A lifetime purchase supersedes any recurring subscription that came
      // before it, so clear the renewal fields rather than leaving stale ones.
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`[stripe] lifetime activated for user ${userId}`);
}

/**
 * Re-reads a subscription from Stripe and mirrors it into our database. Called
 * for every create/update/delete so the row always reflects live Stripe state.
 */
async function syncSubscription(subscriptionId: string) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);

  const userId = await resolveUserId(null, sub.metadata, sub.customer);
  if (!userId) {
    console.error("[stripe] subscription with no resolvable user", sub.id);
    return;
  }

  // Someone who bought the lifetime deal keeps it even if an old recurring
  // subscription later cancels and fires an event.
  const existing = await db.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });
  if (existing?.plan === "lifetime") {
    console.log(`[stripe] ignoring ${sub.id}, user ${userId} is lifetime`);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const matched = priceId ? planFromPriceId(priceId) : null;

  if (!matched) {
    console.error("[stripe] no plan matches price", priceId, "on", sub.id);
    return;
  }

  // In this API version the period window lives on the subscription item, not
  // on the subscription itself.
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  const data = {
    plan: matched.plan,
    status: sub.status,
    interval: matched.interval,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };

  await db.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  console.log(`[stripe] ${userId} is now ${matched.plan}/${sub.status}`);
}

// ---------------------------------------------------------------------------

/**
 * Finds our user three ways, most trustworthy first: the id we stamped on the
 * session, the metadata we stamped on the object, then the Stripe customer we
 * already have on file.
 */
async function resolveUserId(
  clientReferenceId: string | null,
  metadata: Stripe.Metadata | null,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  const candidate = clientReferenceId ?? metadata?.userId ?? null;
  if (candidate) {
    const found = await db.user.findUnique({ where: { id: candidate }, select: { id: true } });
    if (found) return found.id;
  }

  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (customerId) {
    const found = await db.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    if (found) return found.id;
  }

  return null;
}

async function firstPriceIdOfSession(sessionId: string): Promise<string | null> {
  const items = await stripe().checkout.sessions.listLineItems(sessionId, { limit: 1 });
  return items.data[0]?.price?.id ?? null;
}
