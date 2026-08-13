/**
 * Exercises the entitlement rules against a real database row, then deletes
 * the row. Uses a throwaway user so no real account is ever mutated.
 *
 *   npx tsx scripts/verify-entitlements.mts
 */
import { config } from "dotenv";
config();

const { db } = await import("../src/lib/db.ts");
const { getEntitlements, canUseTool, isWithinSiteLimit } = await import(
  "../src/lib/entitlements.ts"
);

const DAY = 86_400_000;
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const user = await db.user.create({
  data: { email: `entitlement-test-${Date.now()}@example.invalid`, name: "Test" },
});

try {
  // 1. Inside the trial: everything unlocked.
  await db.user.update({
    where: { id: user.id },
    data: { trialEndsAt: new Date(Date.now() + 5 * DAY) },
  });
  let ent = await getEntitlements(user.id);
  console.log("\nDuring trial");
  check("plan is trial", ent.plan, "trial");
  check("all tools allowed", ent.allowedTools, "all");
  check("audit usable", canUseTool(ent, "audit"), true);
  check("speed usable", canUseTool(ent, "speed"), true);
  check("days left is 5", ent.trialDaysLeft, 5);
  check("not counted as paid", ent.isPaid, false);

  // 2. Trial lapsed, no tool chosen: nothing usable, which forces the choice.
  await db.user.update({
    where: { id: user.id },
    data: { trialEndsAt: new Date(Date.now() - DAY) },
  });
  ent = await getEntitlements(user.id);
  console.log("\nTrial expired, no tool picked");
  check("plan is free", ent.plan, "free");
  check("no tools allowed", ent.allowedTools, []);
  check("audit blocked", canUseTool(ent, "audit"), false);

  // 3. Picked one tool: exactly that one works.
  await db.user.update({
    where: { id: user.id },
    data: { freeTool: "audit", freeToolChangedAt: new Date() },
  });
  ent = await getEntitlements(user.id);
  console.log("\nFree plan, picked Site Audit");
  check("only audit allowed", ent.allowedTools, ["audit"]);
  check("audit usable", canUseTool(ent, "audit"), true);
  check("speed blocked", canUseTool(ent, "speed"), false);
  check("switch is on cooldown", ent.freeToolSwitchableAt !== null, true);

  // 4. Site limit: free plan is 1 site.
  console.log("\nSite limits on the free plan");
  check("first site allowed", await isWithinSiteLimit(user.id, ent, "https://a.com"), true);
  await db.site.create({ data: { userId: user.id, rootUrl: "https://a.com" } });
  check("re-running the same site still allowed", await isWithinSiteLimit(user.id, ent, "https://a.com"), true);
  check("a second site blocked", await isWithinSiteLimit(user.id, ent, "https://b.com"), false);

  // 5. Paid subscription overrides the free limits.
  await db.subscription.create({
    data: {
      userId: user.id,
      plan: "pro",
      status: "active",
      interval: "month",
      currentPeriodEnd: new Date(Date.now() + 20 * DAY),
    },
  });
  ent = await getEntitlements(user.id);
  console.log("\nActive Pro subscription");
  check("plan is pro", ent.plan, "pro");
  check("all tools allowed", ent.allowedTools, "all");
  check("site limit is 5", ent.siteLimit, 5);
  check("second site now allowed", await isWithinSiteLimit(user.id, ent, "https://b.com"), true);
  check("counted as paid", ent.isPaid, true);

  // 6. A lapsed subscription falls back to free, it does not keep access.
  await db.subscription.update({
    where: { userId: user.id },
    data: { currentPeriodEnd: new Date(Date.now() - DAY) },
  });
  ent = await getEntitlements(user.id);
  console.log("\nSubscription period ended");
  check("dropped back to free", ent.plan, "free");
  check("back to the one picked tool", ent.allowedTools, ["audit"]);

  // 7. past_due keeps working, so a bounced card is not an instant lockout.
  await db.subscription.update({
    where: { userId: user.id },
    data: { status: "past_due", currentPeriodEnd: new Date(Date.now() + 5 * DAY) },
  });
  ent = await getEntitlements(user.id);
  console.log("\nPayment failed (past_due)");
  check("still on pro", ent.plan, "pro");
  check("still has all tools", ent.allowedTools, "all");
  check("status surfaces the problem", ent.status, "past_due");

  // 8. Lifetime ignores dates entirely.
  await db.subscription.update({
    where: { userId: user.id },
    data: { plan: "lifetime", status: "active", interval: "once", currentPeriodEnd: null },
  });
  ent = await getEntitlements(user.id);
  console.log("\nLifetime (Founding Member)");
  check("plan is lifetime", ent.plan, "lifetime");
  check("all tools allowed", ent.allowedTools, "all");
  check("site limit is 5", ent.siteLimit, 5);
  check("no renewal date", ent.currentPeriodEnd, null);
} finally {
  await db.user.delete({ where: { id: user.id } });
  console.log("\nTest user deleted.");
}

console.log(failures === 0 ? "\nAll entitlement checks passed.\n" : `\n${failures} CHECK(S) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
