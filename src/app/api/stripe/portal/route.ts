import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { stripe, stripeConfigured, siteUrl } from "@/lib/stripe";

/**
 * Hands the user off to Stripe's own billing portal, where they can change
 * card, switch plan, download invoices, and cancel. Building any of that
 * ourselves would be a lot of surface area for no benefit.
 */
export async function POST() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Billing is not set up yet" }, { status: 503 });
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "You do not have a billing account yet. Choose a plan first." },
      { status: 400 },
    );
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${siteUrl()}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
