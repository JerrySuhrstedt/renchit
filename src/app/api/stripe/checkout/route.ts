import { NextResponse } from "next/server";
import { requireUserIdForApi } from "@/lib/session";
import { stripe, stripeConfigured, siteUrl } from "@/lib/stripe";
import { getOrCreateCustomerId, lifetimeSeatsSold } from "@/lib/stripe-customer";
import {
  LIFETIME_SEATS,
  PLANS,
  isPlanKey,
  priceIdFor,
  type BillingInterval,
} from "@/lib/plans";

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Billing is not set up yet" }, { status: 503 });
  }

  let body: { plan?: string; interval?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const plan = body.plan;
  const interval = body.interval as BillingInterval | undefined;

  if (!isPlanKey(plan) || !PLANS[plan].purchasable || plan === "free") {
    return NextResponse.json({ error: "That is not a plan you can buy" }, { status: 400 });
  }
  if (interval !== "month" && interval !== "year" && interval !== "once") {
    return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
  }

  const priceId = priceIdFor(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "That plan is not configured for checkout yet" },
      { status: 503 },
    );
  }

  // The Founding Member deal is capped. This is a soft check: two people
  // checking out simultaneously on the last seat could both get through, which
  // at 100 seats is a rounding error and better than holding a lock.
  if (plan === "lifetime") {
    const sold = await lifetimeSeatsSold();
    if (sold >= LIFETIME_SEATS) {
      return NextResponse.json(
        { error: "Every Founding Member seat has been claimed." },
        { status: 409 },
      );
    }
  }

  const customerId = await getOrCreateCustomerId(userId);
  const base = siteUrl();
  const isOneTime = interval === "once";

  const session = await stripe().checkout.sessions.create({
    mode: isOneTime ? "payment" : "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/billing?checkout=success`,
    cancel_url: `${base}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
    // Repeated on the session and on the subscription so that whichever event
    // arrives first can resolve the user without a database lookup by customer.
    metadata: { userId, plan, interval },
    ...(isOneTime
      ? { payment_intent_data: { metadata: { userId, plan, interval } } }
      : { subscription_data: { metadata: { userId, plan, interval } } }),
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
