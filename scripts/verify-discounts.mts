/**
 * Exercises discount creation against the real Paddle sandbox.
 *
 *   npx tsx scripts/verify-discounts.mts
 *
 * Archives everything it creates, so it can be run repeatedly without
 * littering the account with live codes.
 */
import { config } from "dotenv";
config();
import { randomBytes } from "node:crypto";

const BASE = process.env.ADMIN_TEST_URL ?? "http://localhost:3000";
const { db } = await import("../src/lib/db.ts");
const { generateBatch, validate, warnings } = await import("../src/lib/discount-codes.ts");

let fail = 0;
const t = (l: string, ok: boolean) => {
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}`);
};

console.log("\nCode generation");
const batch = generateBatch(500, "LAUNCH");
t("500 codes, all unique", new Set(batch).size === 500);
t("valid per Paddle's ^[a-zA-Z0-9]{1,32}$", batch.every((c) => /^[a-zA-Z0-9]{1,32}$/.test(c)));
t("no ambiguous characters", batch.every((c) => !/[01ILO]/.test(c.slice(6))));
t("prefix applied", batch.every((c) => c.startsWith("LAUNCH")));
console.log(`        sample: ${batch[0]}`);

console.log("\nValidation and warnings");
const base = {
  kind: "percentage" as const, value: 20, description: "Test", prefix: "",
  quantity: 1, usageLimit: null, expiresInDays: 30, recur: false,
  maximumRecurringIntervals: null, restrictTo: [],
};
t("rejects 0%", validate({ ...base, value: 0 }).length > 0);
t("rejects 101%", validate({ ...base, value: 101 }).length > 0);
t("rejects a blank name", validate({ ...base, description: "  " }).length > 0);
t("rejects an oversized batch", validate({ ...base, quantity: 500 }).length > 0);
t("accepts a sane one", validate(base).length === 0);
t("warns about no expiry", warnings({ ...base, expiresInDays: null }).some((w) => w.includes("never die")));
t("warns about 100% off", warnings({ ...base, value: 100 }).some((w) => w.includes("free")));

console.log("\nAgainst the real Paddle sandbox");
const owner = await db.user.findFirstOrThrow({ where: { role: "owner" }, select: { id: true } });
const token = randomBytes(32).toString("hex");
await db.session.create({
  data: { sessionToken: token, userId: owner.id, expires: new Date(Date.now() + 3_600_000) },
});
const cookie = `authjs.session-token=${token}`;
const created: string[] = [];

try {
  const anon = await fetch(`${BASE}/api/admin/discounts`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
  });
  t("unauthenticated create is hidden as 404", anon.status === 404);

  const res = await fetch(`${BASE}/api/admin/discounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      kind: "percentage", value: 25, description: "Automated test", prefix: "TEST",
      quantity: 3, usageLimit: 1, expiresInDays: 1, recur: false, restrictTo: [],
    }),
  });
  const data = await res.json();
  t("created 3 single-use codes", res.status === 201 && data.created?.length === 3);
  if (data.created) {
    created.push(...data.created.map((c: { id: string }) => c.id));
    console.log(`        ${data.created.map((c: { code: string }) => c.code).join(", ")}`);
  } else {
    console.log(`        error: ${data.error}`);
  }

  const listed = await (await fetch(`${BASE}/api/admin/discounts`, { headers: { cookie } })).json();
  const mine = listed.discounts.filter((d: { id: string }) => created.includes(d.id));
  t("all three appear in the list", mine.length === 3);
  t("usage limit is 1", mine.every((d: { usageLimit: number }) => d.usageLimit === 1));
  t("times used starts at 0", mine.every((d: { timesUsed: number }) => d.timesUsed === 0));
  t("expiry is set", mine.every((d: { expiresAt: string | null }) => Boolean(d.expiresAt)));

  const bad = await fetch(`${BASE}/api/admin/discounts`, {
    method: "POST", headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ kind: "percentage", value: 150, description: "Nope", quantity: 1 }),
  });
  t("server rejects 150% even if the UI is bypassed", bad.status === 400);
} finally {
  for (const id of created) {
    await fetch(`${BASE}/api/admin/discounts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "archived" }),
    }).catch(() => {});
  }
  console.log(`\n  archived ${created.length} test codes`);
  await db.session.delete({ where: { sessionToken: token } }).catch(() => {});
}

console.log(fail === 0 ? "\nAll discount checks passed.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
