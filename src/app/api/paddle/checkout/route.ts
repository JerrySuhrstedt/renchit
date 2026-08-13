import { NextResponse } from "next/server";
import { requireUserIdForApi } from "@/lib/session";
import { paddle, paddleConfigured } from "@/lib/paddle";
import { getOrCreatePaddleCustomerId, lifetimeSeatsSold } from "@/lib/paddle-customer";
import {
  LIFETIME_SEATS,
  PLANS,
  isPlanKey,
  priceIdFor,
  type BillingInterval,
} from "@/lib/plans";

/**
 * Creates a Paddle transaction and hands its id back to the browser, which
 * opens the checkout overlay with it.
 *
 * The transaction is created server side purely so that customData carries a
 * userId we actually trust. If the browser passed its own, anyone could claim
 * a purchase belonged to someone else's account.
 */
export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  if (!paddleConfigured()) {
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

  // The Founding Member deal is capped. A soft check: two people checking out
  // simultaneously on the last seat could both get through, which at 100 seats
  // is a rounding error and better than holding a lock.
  if (plan === "lifetime") {
    const sold = await lifetimeSeatsSold();
    if (sold >= LIFETIME_SEATS) {
      return NextResponse.json(
        { error: "Every Founding Member seat has been claimed." },
        { status: 409 },
      );
    }
  }

  const customerId = await getOrCreatePaddleCustomerId(userId);

  const transaction = await paddle().transactions.create({
    items: [{ priceId, quantity: 1 }],
    customerId,
    customData: { userId, plan, interval },
  });

  return NextResponse.json({ transactionId: transaction.id });
}
