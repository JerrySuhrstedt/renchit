/**
 * Grants or revokes complimentary lifetime access, for early testers and
 * anyone else who should never hit a paywall.
 *
 *   npx tsx scripts/comp-access.mts list
 *   npx tsx scripts/comp-access.mts grant someone@example.com [...more]
 *   npx tsx scripts/comp-access.mts grant --all-existing
 *   npx tsx scripts/comp-access.mts revoke someone@example.com
 *
 * Comps are stored as plan "lifetime" with interval "comp", which reuses the
 * existing entitlement path (lifetime never expires and never renews) while
 * staying out of the 100 Founding Member seats that are actually for sale.
 */
import { config } from "dotenv";
config();

const { db } = await import("../src/lib/db.ts");

const [action, ...args] = process.argv.slice(2);

async function list() {
  const users = await db.user.findMany({
    select: { email: true, createdAt: true, trialEndsAt: true, subscription: true },
    orderBy: { createdAt: "asc" },
  });

  console.table(
    users.map((u) => ({
      email: u.email,
      joined: u.createdAt.toISOString().slice(0, 10),
      access:
        u.subscription?.interval === "comp"
          ? "COMPED"
          : u.subscription
            ? `${u.subscription.plan}/${u.subscription.status}`
            : u.trialEndsAt && u.trialEndsAt > new Date()
              ? `trial until ${u.trialEndsAt.toISOString().slice(0, 10)}`
              : "free",
    })),
  );
}

async function grant(emails: string[], plan = "lifetime") {
  for (const email of emails) {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      console.log(`  SKIP    ${email} (no account)`);
      continue;
    }
    await db.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan,
        status: "active",
        // "comp" rather than a real interval, so granted access never counts
        // as revenue no matter which plan it points at.
        interval: "comp",
        currentPeriodEnd: null,
      },
      update: { plan, status: "active", interval: "comp", currentPeriodEnd: null },
    });
    console.log(`  COMPED  ${email}  (${plan})`);
  }
}

async function revoke(emails: string[]) {
  for (const email of emails) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, subscription: true },
    });
    if (!user?.subscription) {
      console.log(`  SKIP    ${email} (nothing to revoke)`);
      continue;
    }
    if (user.subscription.interval !== "comp") {
      console.log(`  REFUSE  ${email} is a paying customer, not a comp. Left alone.`);
      continue;
    }
    await db.subscription.delete({ where: { userId: user.id } });
    console.log(`  REVOKED ${email}`);
  }
}

if (action === "list") {
  await list();
} else if (action === "grant") {
  // --plan <key> anywhere in the args picks the tier. Defaults to lifetime.
  const planIdx = args.indexOf("--plan");
  const plan = planIdx >= 0 ? args[planIdx + 1] : "lifetime";
  if (planIdx >= 0) args.splice(planIdx, 2);
  let emails = args;
  if (args[0] === "--all-existing") {
    const all = await db.user.findMany({ select: { email: true } });
    emails = all.map((u) => u.email).filter((e): e is string => Boolean(e));
  }
  if (emails.length === 0) {
    console.error("No emails given.");
    process.exit(1);
  }
  await grant(emails, plan);
  console.log();
  await list();
} else if (action === "revoke") {
  if (args.length === 0) {
    console.error("No emails given.");
    process.exit(1);
  }
  await revoke(args);
  console.log();
  await list();
} else {
  console.error("Usage: comp-access.mts list | grant [--plan starter|pro|agency|lifetime] <emails...> | grant --all-existing | revoke <emails...>");
  process.exit(1);
}
