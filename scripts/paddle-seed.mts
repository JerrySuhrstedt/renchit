/**
 * Creates (or reuses) the renchit products and prices in Paddle, then writes
 * the price ids into .env.
 *
 *   npx tsx scripts/paddle-seed.mts
 *
 * Idempotent. Products and prices are matched on custom_data tags, since
 * Paddle has no equivalent of Stripe's lookup_key. Talks to whichever
 * environment PADDLE_ENV names, so a sandbox key only ever touches sandbox.
 */
import { config } from "dotenv";
config();

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PLANS, LIFETIME_SEATS, type PlanKey } from "../src/lib/plans.ts";

const apiKey = process.env.PADDLE_API_KEY;
if (!apiKey || apiKey === "PASTE_HERE") {
  console.error("PADDLE_API_KEY is not set in .env");
  process.exit(1);
}

const env = process.env.PADDLE_ENV === "production" ? "production" : "sandbox";
const BASE =
  env === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

type PaddleList<T> = { data: T[]; meta?: { pagination?: { next?: string; has_more?: boolean } } };
type Product = { id: string; name: string; status: string; custom_data?: Record<string, string> | null };
type Price = {
  id: string;
  product_id: string;
  status: string;
  unit_price: { amount: string; currency_code: string };
  custom_data?: Record<string, string> | null;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    const e = body?.error;
    throw new Error(`${res.status} ${e?.code ?? "unknown"}: ${e?.detail ?? JSON.stringify(body)}`);
  }
  return body as T;
}

/** Paddle amounts are minor units, as strings. $9 becomes "900". */
const minor = (dollars: number) => String(Math.round(dollars * 100));

type PriceSpec = {
  envVar: string;
  label: string;
  dollars: number;
  interval: "month" | "year" | null;
};

const SEEDS: Array<{ plan: PlanKey; prices: PriceSpec[] }> = [
  {
    plan: "starter",
    prices: [
      { envVar: "PADDLE_PRICE_STARTER_MONTHLY", label: "Starter monthly", dollars: PLANS.starter.monthly!, interval: "month" },
      { envVar: "PADDLE_PRICE_STARTER_ANNUAL", label: "Starter annual", dollars: PLANS.starter.annual!, interval: "year" },
    ],
  },
  {
    plan: "pro",
    prices: [
      { envVar: "PADDLE_PRICE_PRO_MONTHLY", label: "Pro monthly", dollars: PLANS.pro.monthly!, interval: "month" },
      { envVar: "PADDLE_PRICE_PRO_ANNUAL", label: "Pro annual", dollars: PLANS.pro.annual!, interval: "year" },
    ],
  },
  {
    plan: "agency",
    prices: [
      { envVar: "PADDLE_PRICE_AGENCY_MONTHLY", label: "Agency monthly", dollars: PLANS.agency.monthly!, interval: "month" },
      { envVar: "PADDLE_PRICE_AGENCY_ANNUAL", label: "Agency annual", dollars: PLANS.agency.annual!, interval: "year" },
    ],
  },
  {
    plan: "lifetime",
    prices: [
      { envVar: "PADDLE_PRICE_LIFETIME", label: "Founding Member", dollars: PLANS.lifetime.once!, interval: null },
    ],
  },
];

console.log(`\nSeeding renchit catalog into Paddle (${env})\n`);

const existingProducts = (await api<PaddleList<Product>>("/products?per_page=200&status=active")).data;
const existingPrices = (await api<PaddleList<Price>>("/prices?per_page=200&status=active")).data;

const envLines: string[] = [];

for (const seed of SEEDS) {
  const meta = PLANS[seed.plan];
  console.log(meta.name);

  let product = existingProducts.find((p) => p.custom_data?.renchit_plan === seed.plan);
  if (product) {
    console.log(`  product  reuse   ${product.id}`);
  } else {
    const created = await api<{ data: Product }>("/products", {
      method: "POST",
      body: JSON.stringify({
        name: `renchit ${meta.name}`,
        description: meta.blurb,
        // "saas" gets the right VAT and sales tax treatment per jurisdiction.
        // Paddle is merchant of record, so this drives what they remit.
        tax_category: "saas",
        custom_data: {
          renchit_plan: seed.plan,
          site_limit: meta.siteLimit === null ? "unlimited" : String(meta.siteLimit),
          monitoring: meta.monitoring,
          ...(seed.plan === "lifetime" ? { seats: String(LIFETIME_SEATS) } : {}),
        },
      }),
    });
    product = created.data;
    console.log(`  product  create  ${product.id}`);
  }

  for (const spec of seed.prices) {
    const intervalTag = spec.interval ?? "once";
    const found = existingPrices.find(
      (p) =>
        p.custom_data?.renchit_plan === seed.plan &&
        p.custom_data?.renchit_interval === intervalTag,
    );

    if (found) {
      const same = found.unit_price.amount === minor(spec.dollars);
      console.log(
        `  price    reuse   ${found.id}  ${spec.label}` +
          (same
            ? ""
            : `  WARNING: Paddle has $${Number(found.unit_price.amount) / 100}, code says $${spec.dollars}`),
      );
      envLines.push(`${spec.envVar}=${found.id}`);
      continue;
    }

    const created = await api<{ data: Price }>("/prices", {
      method: "POST",
      body: JSON.stringify({
        product_id: product.id,
        description: spec.label,
        unit_price: { amount: minor(spec.dollars), currency_code: "USD" },
        ...(spec.interval ? { billing_cycle: { interval: spec.interval, frequency: 1 } } : {}),
        custom_data: { renchit_plan: seed.plan, renchit_interval: intervalTag },
      }),
    });
    console.log(`  price    create  ${created.data.id}  ${spec.label}  $${spec.dollars}`);
    envLines.push(`${spec.envVar}=${created.data.id}`);
  }
  console.log();
}

// Price ids are not secrets, but writing them beats asking anyone to
// hand-copy seven identifiers without a typo.
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
let envFile = readFileSync(envPath, "utf8");
for (const line of envLines) {
  const [key] = line.split("=");
  envFile = new RegExp(`^#?\\s*${key}=.*$`, "m").test(envFile)
    ? envFile.replace(new RegExp(`^#?\\s*${key}=.*$`, "m"), line)
    : envFile.trimEnd() + "\n" + line + "\n";
}
writeFileSync(envPath, envFile);

console.log("Wrote these into .env:\n");
console.log(envLines.join("\n"));
console.log();
