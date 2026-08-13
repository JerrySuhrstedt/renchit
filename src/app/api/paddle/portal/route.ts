import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { paddle, paddleConfigured } from "@/lib/paddle";

/**
 * Hands the user off to Paddle's own customer portal, where they can change
 * card, switch plan, download invoices, and cancel.
 *
 * Unlike Stripe's single portal endpoint, Paddle mints a short-lived session
 * per customer, and the deep links it returns are scoped to the specific
 * subscription ids you pass in.
 */
export async function POST() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  if (!paddleConfigured()) {
    return NextResponse.json({ error: "Billing is not set up yet" }, { status: 503 });
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { paddleCustomerId: true, subscription: { select: { paddleSubscriptionId: true } } },
  });

  if (!user.paddleCustomerId) {
    return NextResponse.json(
      { error: "You do not have a billing account yet. Choose a plan first." },
      { status: 400 },
    );
  }

  const subscriptionIds = user.subscription?.paddleSubscriptionId
    ? [user.subscription.paddleSubscriptionId]
    : [];

  const session = await paddle().customerPortalSessions.create(
    user.paddleCustomerId,
    subscriptionIds,
  );

  // The per-subscription entries are only deep links to cancel or to change
  // payment method. The general overview is the actual portal home, where
  // they can do all of that plus download invoices, so that is where we send
  // them. Passing the subscription ids above is still what scopes the session.
  const url = session.urls?.general?.overview;

  if (!url) {
    return NextResponse.json({ error: "Paddle did not return a portal URL" }, { status: 502 });
  }

  return NextResponse.json({ url });
}
