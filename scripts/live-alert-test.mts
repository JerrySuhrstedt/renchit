/**
 * Sends a real down-and-recovery alert through production, end to end.
 *
 *   npx tsx scripts/live-alert-test.mts you@example.com sumolab.co
 *
 * This puts actual email in a real inbox, so the recipient is a required
 * argument with no default. Nothing fires by accident.
 *
 * The site is never touched. A temporary monitor is pointed at a path on the
 * domain that does not exist, so the check genuinely fails against the real
 * server over the real network. Recovery is triggered by repointing that
 * monitor at the homepage. The alert reads "<domain> is down" either way,
 * because the email names the host.
 *
 * Production is driven through its own cron endpoint rather than by calling
 * the runner here, so what gets exercised is the deployed code path.
 */
import { config } from "dotenv";
config();

const [recipientEmail, domainArg] = process.argv.slice(2);
if (!recipientEmail || !domainArg) {
  console.error("Usage: npx tsx scripts/live-alert-test.mts <email> <domain>");
  process.exit(1);
}

const BASE = process.env.LIVE_TEST_URL ?? "https://www.renchit.com";
const SECRET = process.env.MONITOR_SECRET;
if (!SECRET) {
  console.error("MONITOR_SECRET is not set");
  process.exit(1);
}

const { db } = await import("../src/lib/db.ts");

let fail = 0;
const t = (label: string, ok: boolean) => {
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
};

const domain = domainArg.replace(/^https?:\/\//, "").replace(/\/$/, "");
const brokenUrl = `https://${domain}/renchit-alert-test-${Date.now().toString(36)}`;
const workingUrl = `https://${domain}/`;

const owner = await db.user.findFirstOrThrow({
  where: { email: "jerry@sumolab.co" },
  select: { id: true },
});

/** Asks production to run its checks, then reports what it did. */
async function runProduction() {
  const res = await fetch(`${BASE}/api/monitors/run`, {
    method: "POST",
    headers: { "x-monitor-secret": SECRET! },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const monitor = await db.monitor.create({
  data: {
    userId: owner.id,
    url: brokenUrl,
    // Seeded as already up, because the very first check on a new monitor is
    // deliberately silent. Without this the test would prove nothing.
    status: "up",
    lastChangedAt: new Date(),
  },
});
await db.alertRecipient.create({
  data: { userId: owner.id, monitorId: monitor.id, email: recipientEmail },
});

console.log(`\nWatching  ${brokenUrl}`);
console.log(`Emailing  ${recipientEmail}\n`);

try {
  console.log("Going down (three consecutive failures required)");
  for (let i = 1; i <= 3; i++) {
    // Production only checks a monitor that is due, so this clears the clock
    // rather than waiting five real minutes between attempts.
    await db.monitor.update({ where: { id: monitor.id }, data: { lastCheckedAt: null } });
    await runProduction();
    const m = await db.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
    console.log(`  check ${i}: status=${m.status} failures=${m.consecutiveFailures} code=${m.lastStatusCode}`);
    if (i < 3) t(`still not crying wolf after ${i} failure(s)`, m.status === "up");
  }

  const down = await db.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
  t("marked down after three", down.status === "down");

  const downEvents = await db.alertEvent.findMany({
    where: { monitorId: monitor.id, kind: "down" },
  });
  t("exactly one down alert", downEvents.length === 1);
  t("the down email actually sent", downEvents[0]?.notified === 1);

  console.log("\nStaying down should stay quiet");
  await db.monitor.update({ where: { id: monitor.id }, data: { lastCheckedAt: null } });
  await runProduction();
  t(
    "still exactly one down alert",
    (await db.alertEvent.count({ where: { monitorId: monitor.id, kind: "down" } })) === 1,
  );

  console.log("\nRecovering");
  await db.monitor.update({
    where: { id: monitor.id },
    data: { url: workingUrl, lastCheckedAt: null },
  });
  await runProduction();

  const back = await db.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
  t("marked up again", back.status === "up");

  const upEvents = await db.alertEvent.findMany({
    where: { monitorId: monitor.id, kind: "recovered" },
  });
  t("exactly one recovery alert", upEvents.length === 1);
  t("the recovery email actually sent", upEvents[0]?.notified === 1);
  t("downtime was recorded", (upEvents[0]?.downtimeMinutes ?? 0) >= 1);
} finally {
  // Cascades to the recipient and the events.
  await db.monitor.delete({ where: { id: monitor.id } }).catch(() => {});
  console.log("\n  cleaned up the test monitor");
}

console.log(
  fail === 0
    ? `\nAll checks passed. Two emails should be in ${recipientEmail}.\n`
    : `\n${fail} check(s) failed.\n`,
);
process.exit(fail === 0 ? 0 : 1);
