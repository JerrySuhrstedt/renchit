import { db } from "@/lib/db";
import { paddle } from "@/lib/paddle";

/**
 * Returns the user's Paddle customer id, creating the customer on first use.
 *
 * Stored on User so cancelling and resubscribing reuses the same customer and
 * keeps one continuous billing history in the Paddle dashboard.
 */
export async function getOrCreatePaddleCustomerId(userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, name: true, paddleCustomerId: true },
  });

  if (user.paddleCustomerId) return user.paddleCustomerId;
  if (!user.email) throw new Error("Cannot create a Paddle customer without an email");

  let customerId: string;
  try {
    const created = await paddle().customers.create({
      email: user.email,
      name: user.name ?? undefined,
      customData: { userId },
    });
    customerId = created.id;
  } catch (err) {
    // Paddle rejects a duplicate email rather than returning the existing
    // customer, which happens whenever our row was wiped but theirs was not.
    // Look the existing one up instead of failing the checkout.
    const existing = await paddle().customers.list({ email: [user.email] }).next();
    const match = existing.find((c) => c.email === user.email);
    if (!match) throw err;
    customerId = match.id;
  }

  await db.user.update({ where: { id: userId }, data: { paddleCustomerId: customerId } });
  return customerId;
}

/** How many Founding Member seats have actually been paid for. */
export async function lifetimeSeatsSold(): Promise<number> {
  return db.subscription.count({
    where: {
      plan: "lifetime",
      interval: "once",
      status: { in: ["active", "trialing", "past_due"] },
    },
  });
}
