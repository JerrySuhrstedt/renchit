/**
 * Creates (or reuses) the renchit webhook endpoint in Stripe and prints its
 * signing secret. Idempotent: matched by URL.
 *
 *   npx tsx scripts/stripe-webhook-setup.mts [url]
 */
import { config } from "dotenv";
config();
import Stripe from "stripe";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("STRIPE_SECRET_KEY is not set."); process.exit(1); }
const stripe = new Stripe(key, { typescript: true });

const url = process.argv[2] ?? "https://renchit.com/api/stripe/webhook";
const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const found = existing.data.find((e) => e.url === url);

if (found) {
  await stripe.webhookEndpoints.update(found.id, { enabled_events: EVENTS });
  console.log(`Reused existing endpoint ${found.id} for ${url}`);
  console.log("Stripe only reveals the signing secret at creation time.");
  console.log("If you do not have it saved, delete the endpoint and re-run this script.");
} else {
  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: EVENTS,
    description: "renchit billing events",
  });
  console.log(`Created endpoint ${created.id} for ${url}`);

  // Written straight into .env rather than printed, so the signing secret
  // never lands in a terminal log or a chat transcript.
  // fileURLToPath, not .pathname: the repo path contains a space and
  // .pathname would hand back a percent-encoded string.
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  let env = readFileSync(envPath, "utf8");
  const line = `STRIPE_WEBHOOK_SECRET=${created.secret}`;
  env = /^#?\s*STRIPE_WEBHOOK_SECRET=.*$/m.test(env)
    ? env.replace(/^#?\s*STRIPE_WEBHOOK_SECRET=.*$/m, line)
    : env.trimEnd() + "\n" + line + "\n";
  writeFileSync(envPath, env);
  console.log("Signing secret written to .env (not printed).");
}
