/**
 * End-to-end billing test against a deployed renchit.
 *
 *   npx tsx scripts/verify-paddle.mts                    # tests production
 *   WEBHOOK_TEST_URL=http://localhost:3000/api/paddle/webhook npx tsx scripts/verify-paddle.mts
 *
 * What this genuinely covers:
 *   - real Paddle objects (customer, transaction) created through their API
 *   - real signature verification, using the real signing secret and Paddle's
 *     actual ts/h1 HMAC scheme
 *   - the deployed webhook route, the database writes, and the entitlements
 *     that come out the other side
 *
 * What it does not cover: Paddle physically delivering the request. Completing
 * a payment needs a card entered in their overlay, which cannot be automated
 * from here. That last mile is the manual test with card 4242 4242 4242 4242.
 */
import { config } from "dotenv";
config();

import { createHmac } from "node:crypto";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

const ENDPOINT =
  process.env.WEBHOOK_TEST_URL ?? "https://www.renchit.com/api/paddle/webhook";
const apiKey = process.env.PADDLE_API_KEY;
const secret = process.env.PADDLE_WEBHOOK_SECRET;

if (!apiKey || !secret || apiKey === "PASTE_HERE" || secret === "PASTE_HERE") {
  console.error("PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET must both be set in .env");
  process.exit(1);
}

const paddle = new Paddle(apiKey, {
  environment:
    process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
});

const { db } = await import("../src/lib/db.ts");
const { getEntitlements } = await import("../src/lib/entitlements.ts");

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/**
 * Paddle signs `${ts}:${rawBody}` with HMAC-SHA256 and sends it as
 * `paddle-signature: ts=<unix>;h1=<hex>`.
 */
function sign(body: string, ts: number): string {
  const h1 = createHmac("sha256", secret!).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

async function deliver(eventType: string, data: unknown, ts = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify({
    event_id: `evt_${Math.abs(hash(eventType + ts)).toString(36)}`,
    event_type: eventType,
    occurred_at: new Date(ts * 1000).toISOString(),
    notification_id: `ntf_${Math.abs(hash(eventType + ts + "n")).toString(36)}`,
    data,
  });
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "paddle-signature": sign(body, ts) },
    body,
  });
  return res.status;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

const priceMonthlyPro = process.env.PADDLE_PRICE_PRO_MONTHLY!;
const priceLifetime = process.env.PADDLE_PRICE_LIFETIME!;

const user = await db.user.create({
  data: { email: `paddle-test-${Date.now()}@example.invalid`, name: "Paddle Test" },
});
let customerId: string | null = null;

try {
  console.log(`\nTarget: ${ENDPOINT}\n`);

  // Real Paddle customer, so customerId resolution is exercised for real.
  const customer = await paddle.customers.create({
    email: user.email!,
    name: "Paddle Test",
    customData: { userId: user.id },
  });
  customerId = customer.id;
  await db.user.update({ where: { id: user.id }, data: { paddleCustomerId: customer.id } });
  console.log(`Created Paddle customer ${customer.id}`);

  // Real transaction, which is exactly what our checkout route produces.
  // Paddle refuses this until a default payment link is set on the account,
  // so treat it as a checked precondition rather than letting it abort the
  // rest of the run.
  let txnId = `txn_synthetic_${Date.now()}`;
  try {
    const txn = await paddle.transactions.create({
      items: [{ priceId: priceMonthlyPro, quantity: 1 }],
      customerId: customer.id,
      customData: { userId: user.id, plan: "pro", interval: "month" },
    });
    txnId = txn.id;
    console.log(`Created Paddle transaction ${txn.id} (${txn.status})`);
    check("checkout can create transactions", true, true);
  } catch (err) {
    const code = (err as { code?: string }).code;
    failures++;
    console.log(`  FAIL  checkout can create transactions`);
    console.log(`        Paddle refused: ${code}`);
    if (code === "transaction_default_checkout_url_not_set") {
      console.log("        Fix: Paddle dashboard > Checkout > Checkout settings >");
      console.log("        set a Default payment link. Live checkout cannot work until then.");
    }
    console.log("        Continuing with a synthetic id to test the webhook path.");
  }
  console.log();

  const periodEnd = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const subId = `sub_${txnId.slice(4)}`;
  const subBase = {
    id: subId,
    status: "active",
    customer_id: customer.id,
    custom_data: { userId: user.id, plan: "pro", interval: "month" },
    items: [{ price: { id: priceMonthlyPro } }],
    current_billing_period: { starts_at: new Date().toISOString(), ends_at: periodEnd },
    scheduled_change: null,
  };

  console.log("subscription.activated");
  check("accepted", await deliver("subscription.activated", subBase), 200);

  let row = await db.subscription.findUnique({ where: { userId: user.id } });
  check("row created", row !== null, true);
  check("plan is pro", row?.plan, "pro");
  check("status is active", row?.status, "active");
  check("paddle id stored", row?.paddleSubscriptionId, subId);
  check("interval is month", row?.interval, "month");
  check("renewal date captured", row?.currentPeriodEnd?.toISOString(), periodEnd);

  let ent = await getEntitlements(user.id);
  check("entitlements say pro", ent.plan, "pro");
  check("all tools unlocked", ent.allowedTools, "all");
  check("site limit is 5", ent.siteLimit, 5);

  console.log("\nForged signature");
  const forged = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "paddle-signature": "ts=1;h1=deadbeef" },
    body: JSON.stringify({ event_type: "subscription.canceled", data: subBase }),
  });
  check("rejected with 400", forged.status, 400);
  check("plan untouched", (await getEntitlements(user.id)).plan, "pro");

  console.log("\nScheduled cancellation (Paddle keeps it active)");
  check(
    "accepted",
    await deliver("subscription.updated", {
      ...subBase,
      scheduled_change: { action: "cancel", effective_at: periodEnd },
    }),
    200,
  );
  row = await db.subscription.findUnique({ where: { userId: user.id } });
  check("still active", row?.status, "active");
  check("cancelAtPeriodEnd set", row?.cancelAtPeriodEnd, true);
  check("access retained until period end", (await getEntitlements(user.id)).plan, "pro");

  console.log("\nsubscription.past_due");
  check("accepted", await deliver("subscription.past_due", { ...subBase, status: "past_due" }), 200);
  ent = await getEntitlements(user.id);
  check("access kept during dunning", ent.plan, "pro");
  check("status surfaces the problem", ent.status, "past_due");

  console.log("\nsubscription.paused");
  check("accepted", await deliver("subscription.paused", { ...subBase, status: "paused" }), 200);
  ent = await getEntitlements(user.id);
  check("paused revokes access", ent.plan, "free");

  console.log("\nsubscription.canceled");
  check("accepted", await deliver("subscription.canceled", { ...subBase, status: "canceled" }), 200);
  row = await db.subscription.findUnique({ where: { userId: user.id } });
  check("status is canceled", row?.status, "canceled");
  check("dropped to free", (await getEntitlements(user.id)).plan, "free");
  check("tools locked", (await getEntitlements(user.id)).allowedTools, []);

  console.log("\ntransaction.completed for the lifetime deal");
  check(
    "accepted",
    await deliver("transaction.completed", {
      id: txnId,
      status: "completed",
      customer_id: customer.id,
      custom_data: { userId: user.id, plan: "lifetime", interval: "once" },
      items: [{ price: { id: priceLifetime } }],
    }),
    200,
  );
  row = await db.subscription.findUnique({ where: { userId: user.id } });
  check("plan is lifetime", row?.plan, "lifetime");
  check("interval is once", row?.interval, "once");
  check("no renewal date", row?.currentPeriodEnd, null);
  check("stale subscription id cleared", row?.paddleSubscriptionId, null);

  ent = await getEntitlements(user.id);
  check("entitlements say lifetime", ent.plan, "lifetime");
  check("not flagged as comped", ent.isComp, false);

  console.log("\nLifetime outranks a later cancellation");
  check(
    "accepted",
    await deliver("subscription.canceled", { ...subBase, status: "canceled" }),
    200,
  );
  check("still lifetime", (await getEntitlements(user.id)).plan, "lifetime");
} finally {
  await db.user.delete({ where: { id: user.id } }).catch(() => {});
  // Paddle customers cannot be deleted, only archived.
  if (customerId) await paddle.customers.archive(customerId).catch(() => {});
  console.log("\nCleaned up test user and archived the Paddle customer.");
}

console.log(failures === 0 ? "\nAll Paddle checks passed.\n" : `\n${failures} CHECK(S) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
