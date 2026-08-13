/**
 * Creates (or reuses) the renchit products and prices in Stripe, then prints
 * the env lines to paste.
 *
 *   npx tsx scripts/stripe-seed.mts
 *
 * Idempotent. Products are matched by a metadata tag and prices by lookup_key,
 * so running it twice does not create duplicates. It operates on whichever
 * mode your STRIPE_SECRET_KEY belongs to, so a test key seeds test mode.
 */
import { config } from "dotenv";
config();

import Stripe from "stripe";
import { PLANS, LIFETIME_SEATS, type PlanKey } from "../src/lib/plans.ts";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set. Add it to .env first.");
  process.exit(1);
}

const stripe = new Stripe(key, { typescript: true });
const mode = key.startsWith("sk_live") ? "LIVE" : "test";

/** metadata.renchit_plan is how we find our own products again. */
const TAG = "renchit_plan";

type Seed = {
  plan: PlanKey;
  prices: Array<{
    envVar: string;
    lookupKey: string;
    amount: number;
    interval: "month" | "year" | null;
  }>;
};

const SEEDS: Seed[] = [
  {
    plan: "starter",
    prices: [
      { envVar: "STRIPE_PRICE_STARTER_MONTHLY", lookupKey: "renchit_starter_monthly", amount: PLANS.starter.monthly!, interval: "month" },
      { envVar: "STRIPE_PRICE_STARTER_ANNUAL", lookupKey: "renchit_starter_annual", amount: PLANS.starter.annual!, interval: "year" },
    ],
  },
  {
    plan: "pro",
    prices: [
      { envVar: "STRIPE_PRICE_PRO_MONTHLY", lookupKey: "renchit_pro_monthly", amount: PLANS.pro.monthly!, interval: "month" },
      { envVar: "STRIPE_PRICE_PRO_ANNUAL", lookupKey: "renchit_pro_annual", amount: PLANS.pro.annual!, interval: "year" },
    ],
  },
  {
    plan: "agency",
    prices: [
      { envVar: "STRIPE_PRICE_AGENCY_MONTHLY", lookupKey: "renchit_agency_monthly", amount: PLANS.agency.monthly!, interval: "month" },
      { envVar: "STRIPE_PRICE_AGENCY_ANNUAL", lookupKey: "renchit_agency_annual", amount: PLANS.agency.annual!, interval: "year" },
    ],
  },
  {
    plan: "lifetime",
    prices: [
      { envVar: "STRIPE_PRICE_LIFETIME", lookupKey: "renchit_lifetime", amount: PLANS.lifetime.once!, interval: null },
    ],
  },
];

async function findOrCreateProduct(plan: PlanKey) {
  const meta = PLANS[plan];
  const found = await stripe.products.search({
    query: `metadata['${TAG}']:'${plan}'`,
    limit: 1,
  });

  if (found.data[0]) {
    console.log(`  product  reuse   ${found.data[0].id}  ${meta.name}`);
    return found.data[0];
  }

  const product = await stripe.products.create({
    name: `renchit ${meta.name}`,
    description: meta.blurb,
    metadata: {
      [TAG]: plan,
      site_limit: meta.siteLimit === null ? "unlimited" : String(meta.siteLimit),
      monitoring: meta.monitoring,
      ...(plan === "lifetime" ? { seats: String(LIFETIME_SEATS) } : {}),
    },
  });
  console.log(`  product  create  ${product.id}  ${meta.name}`);
  return product;
}

async function findOrCreatePrice(
  productId: string,
  spec: Seed["prices"][number],
) {
  const found = await stripe.prices.list({ lookup_keys: [spec.lookupKey], limit: 1 });
  if (found.data[0]) {
    const existing = found.data[0];
    const sameAmount = existing.unit_amount === spec.amount * 100;
    console.log(
      `  price    reuse   ${existing.id}  ${spec.lookupKey}` +
        (sameAmount ? "" : `  WARNING: Stripe has $${(existing.unit_amount ?? 0) / 100}, code says $${spec.amount}`),
    );
    return existing;
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: spec.amount * 100,
    lookup_key: spec.lookupKey,
    ...(spec.interval ? { recurring: { interval: spec.interval } } : {}),
  });
  console.log(`  price    create  ${price.id}  ${spec.lookupKey}  $${spec.amount}`);
  return price;
}

const envLines: string[] = [];

console.log(`\nSeeding renchit products into Stripe (${mode} mode)\n`);

for (const seed of SEEDS) {
  console.log(PLANS[seed.plan].name);
  const product = await findOrCreateProduct(seed.plan);
  for (const spec of seed.prices) {
    const price = await findOrCreatePrice(product.id, spec);
    envLines.push(`${spec.envVar}=${price.id}`);
  }
  console.log();
}

console.log("Paste these into .env (and into Vercel for production):\n");
console.log(envLines.join("\n"));
console.log();
