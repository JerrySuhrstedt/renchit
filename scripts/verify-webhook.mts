/**
 * End-to-end billing test against a running dev server.
 *
 *   npx tsx scripts/verify-webhook.mts
 *
 * Creates a real subscription in Stripe test mode, takes the event Stripe
 * actually recorded, signs it the way Stripe signs it, posts it at our webhook,
 * and checks the database ended up in the right state. Then cancels and does
 * it again. Cleans up the user and the Stripe customer either way.
 *
 * This is the real path, not a mock: real Stripe objects, real event payloads,
 * real signature verification.
 */
import { config } from "dotenv";
config();

import Stripe from "stripe";

const ENDPOINT = process.env.WEBHOOK_TEST_URL ?? "http://localhost:3000/api/stripe/webhook";
const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!secretKey || !webhookSecret) {
  console.error("STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must both be set.");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { typescript: true });
const { db } = await import("../src/lib/db.ts");
const { getEntitlements } = await import("../src/lib/entitlements.ts");

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/** Replays a real Stripe event at our endpoint with a valid signature. */
async function deliver(event: Stripe.Event): Promise<number> {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret!,
  });
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": signature },
    body: payload,
  });
  return res.status;
}

/** Finds the most recent event of a type for a given object. */
async function latestEvent(type: string, objectId: string): Promise<Stripe.Event> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const events = await stripe.events.list({ type, limit: 20 });
    const match = events.data.find(
      (e) => (e.data.object as { id?: string }).id === objectId,
    );
    if (match) return match;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Stripe never recorded a ${type} event for ${objectId}`);
}

const user = await db.user.create({
  data: { email: `webhook-test-${Date.now()}@example.invalid`, name: "Webhook Test" },
});
let customerId: string | null = null;

try {
  // A customer with a working test card attached.
  const customer = await stripe.customers.create({
    email: user.email!,
    metadata: { userId: user.id },
    payment_method: "pm_card_visa",
    invoice_settings: { default_payment_method: "pm_card_visa" },
  });
  customerId = customer.id;
  await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });

  const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY!;
  console.log("\nCreating a real Pro subscription in Stripe test mode");
  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    metadata: { userId: user.id, plan: "pro", interval: "month" },
  });
  console.log(`  subscription ${sub.id} is ${sub.status}`);

  // 1. Deliver the event Stripe actually recorded.
  const created = await latestEvent("customer.subscription.created", sub.id);
  console.log("\nDelivering the real customer.subscription.created event");
  check("webhook accepted it", await deliver(created), 200);

  let row = await db.subscription.findUnique({ where: { userId: user.id } });
  check("row created", row !== null, true);
  check("plan is pro", row?.plan, "pro");
  check("status is active", row?.status, "active");
  check("stripe id stored", row?.stripeSubscriptionId, sub.id);
  check("interval is month", row?.interval, "month");
  check("renewal date captured", row?.currentPeriodEnd instanceof Date, true);

  let ent = await getEntitlements(user.id);
  check("entitlements say pro", ent.plan, "pro");
  check("all tools unlocked", ent.allowedTools, "all");
  check("site limit is 5", ent.siteLimit, 5);

  // 2. A bad signature must be rejected.
  console.log("\nRejecting a forged event");
  const forged = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
    body: JSON.stringify(created),
  });
  check("forged signature rejected", forged.status, 400);
  check("plan unchanged after forgery", (await getEntitlements(user.id)).plan, "pro");

  // 3. Cancel, and confirm the downgrade lands.
  console.log("\nCancelling the subscription in Stripe");
  await stripe.subscriptions.cancel(sub.id);
  const deleted = await latestEvent("customer.subscription.deleted", sub.id);
  check("webhook accepted the cancellation", await deliver(deleted), 200);

  row = await db.subscription.findUnique({ where: { userId: user.id } });
  check("status is canceled", row?.status, "canceled");

  ent = await getEntitlements(user.id);
  check("access dropped to free", ent.plan, "free");
  check("tools locked again", ent.allowedTools, []);
} finally {
  await db.user.delete({ where: { id: user.id } }).catch(() => {});
  if (customerId) await stripe.customers.del(customerId).catch(() => {});
  console.log("\nCleaned up test user and Stripe customer.");
}

console.log(failures === 0 ? "\nAll webhook checks passed.\n" : `\n${failures} CHECK(S) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
