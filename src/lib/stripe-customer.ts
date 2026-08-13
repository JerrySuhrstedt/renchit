import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * Returns the user's Stripe customer id, creating the customer on first use.
 *
 * Stored on User so that cancelling and resubscribing reuses the same customer
 * and keeps one continuous billing history in the Stripe dashboard.
 */
export async function getOrCreateCustomerId(userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, name: true, stripeCustomerId: true },
  });

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe().customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { userId },
  });

  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/** How many Founding Member seats have actually been paid for. */
export async function lifetimeSeatsSold(): Promise<number> {
  return db.subscription.count({
    where: { plan: "lifetime", status: { in: ["active", "trialing", "past_due"] } },
  });
}
