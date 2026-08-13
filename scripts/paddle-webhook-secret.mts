/**
 * Reads the signing secret for the renchit webhook destination out of Paddle
 * and writes it into .env.
 *
 *   npx tsx scripts/paddle-webhook-secret.mts
 *
 * Unlike Stripe, Paddle keeps the secret retrievable rather than showing it
 * once at creation, so this is re-runnable any time.
 */
import { config } from "dotenv";
config();

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

const key = process.env.PADDLE_API_KEY;
if (!key || key === "PASTE_HERE") {
  console.error("PADDLE_API_KEY is not set in .env");
  process.exit(1);
}

const paddle = new Paddle(key, {
  environment:
    process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
});

const settings = await paddle.notificationSettings.list();
const ours = settings.filter((s) => s.destination?.includes("/api/paddle/webhook"));

if (ours.length === 0) {
  console.error("No destination found pointing at /api/paddle/webhook.");
  console.error("Found these instead:");
  for (const s of settings) console.error(`  ${s.description} -> ${s.destination}`);
  process.exit(1);
}
if (ours.length > 1) {
  console.error(`Found ${ours.length} destinations for that path. Delete the duplicates first:`);
  for (const s of ours) console.error(`  ${s.id}  ${s.description}  active=${s.active}`);
  process.exit(1);
}

const dest = ours[0];
console.log(`Destination : ${dest.description} (${dest.id})`);
console.log(`URL         : ${dest.destination}`);
console.log(`Active      : ${dest.active}`);
console.log(`Events      : ${dest.subscribedEvents?.length ?? 0} subscribed`);

// Written into .env rather than printed, so the secret never lands in a
// terminal log or a chat transcript.
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
let env = readFileSync(envPath, "utf8");
const line = `PADDLE_WEBHOOK_SECRET=${dest.endpointSecretKey}`;
env = /^#?\s*PADDLE_WEBHOOK_SECRET=.*$/m.test(env)
  ? env.replace(/^#?\s*PADDLE_WEBHOOK_SECRET=.*$/m, line)
  : env.trimEnd() + "\n" + line + "\n";
writeFileSync(envPath, env);

console.log("\nSigning secret written to .env (not printed).");
