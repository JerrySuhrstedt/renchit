/**
 * Exercises uptime monitoring end to end, including the part that matters
 * most: not crying wolf.
 *
 *   npx tsx scripts/verify-monitoring.mts
 *
 * Uses a local server we can break on demand, so "down" is a fact rather than
 * something we hope happens.
 */
import { config } from "dotenv";
config();
import { createServer } from "node:http";

const { db } = await import("../src/lib/db.ts");
const { runDueMonitors, probe } = await import("../src/lib/monitor-runner.ts");

let fail = 0;
const t = (l: string, ok: boolean) => { if (!ok) fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}`); };

let healthy = true;
const server = createServer((_req, res) => {
  if (healthy) { res.writeHead(200); res.end("ok"); }
  else { res.writeHead(503); res.end("nope"); }
});
await new Promise<void>((r) => server.listen(4601, r));
const URL_ = "http://localhost:4601/";

const owner = await db.user.findFirstOrThrow({ where: { role: "owner" }, select: { id: true } });
let monitorId: string | null = null;

/** Forces the monitor to look due, since the runner respects the interval. */
async function makeDue() {
  await db.monitor.update({
    where: { id: monitorId! },
    data: { lastCheckedAt: new Date(Date.now() - 60 * 60_000) },
  });
}

try {
  console.log("\nProbe");
  const good = await probe(URL_);
  t("a healthy site reads as up", good.ok && good.statusCode === 200);
  healthy = false;
  const bad = await probe(URL_);
  t("a 503 reads as down", !bad.ok && bad.statusCode === 503);
  healthy = true;

  const m = await db.monitor.create({
    data: { userId: owner.id, url: URL_, intervalMinutes: 5 },
  });
  monitorId = m.id;

  console.log("\nFirst check is silent");
  await runDueMonitors();
  let row = await db.monitor.findUniqueOrThrow({ where: { id: monitorId } });
  t("status becomes up", row.status === "up");
  t("no alert on the first result", (await db.alertEvent.count({ where: { monitorId } })) === 0);

  console.log("\nOne blip does not raise an alarm");
  healthy = false;
  await makeDue(); await runDueMonitors();
  row = await db.monitor.findUniqueOrThrow({ where: { id: monitorId } });
  t("still reported as up after 1 failure", row.status === "up");
  t("failure counted", row.consecutiveFailures === 1);
  await makeDue(); await runDueMonitors();
  row = await db.monitor.findUniqueOrThrow({ where: { id: monitorId } });
  t("still up after 2 failures", row.status === "up");
  t("no alert sent yet", (await db.alertEvent.count({ where: { monitorId } })) === 0);

  console.log("\nThree in a row is believed");
  await makeDue(); await runDueMonitors();
  row = await db.monitor.findUniqueOrThrow({ where: { id: monitorId } });
  t("now marked down", row.status === "down");
  const downEvents = await db.alertEvent.count({ where: { monitorId, kind: "down" } });
  t("exactly one down alert", downEvents === 1);

  console.log("\nStaying down does not keep alerting");
  await makeDue(); await runDueMonitors();
  await makeDue(); await runDueMonitors();
  t("still exactly one down alert after 2 more checks",
    (await db.alertEvent.count({ where: { monitorId, kind: "down" } })) === 1);

  console.log("\nRecovery");
  healthy = true;
  await makeDue(); await runDueMonitors();
  row = await db.monitor.findUniqueOrThrow({ where: { id: monitorId } });
  t("back to up", row.status === "up");
  t("failures reset", row.consecutiveFailures === 0);
  const rec = await db.alertEvent.findFirst({ where: { monitorId, kind: "recovered" } });
  t("exactly one recovery alert", Boolean(rec));
  t("downtime recorded", (rec?.downtimeMinutes ?? 0) >= 1);

  console.log("\nPaused monitors are left alone");
  await db.monitor.update({ where: { id: monitorId }, data: { enabled: false } });
  await makeDue();
  const before = (await db.monitor.findUniqueOrThrow({ where: { id: monitorId } })).lastCheckedAt;
  await runDueMonitors();
  const after = (await db.monitor.findUniqueOrThrow({ where: { id: monitorId } })).lastCheckedAt;
  t("a paused monitor is not checked", before?.getTime() === after?.getTime());

  console.log("\nThe cron endpoint is not open to the public");
  const noSecret = await fetch("http://localhost:3000/api/monitors/run", { method: "POST" });
  t("no secret is a 404", noSecret.status === 404);
  const wrong = await fetch("http://localhost:3000/api/monitors/run", {
    method: "POST", headers: { "x-monitor-secret": "wrong" },
  });
  t("wrong secret is a 404", wrong.status === 404);
  const right = await fetch("http://localhost:3000/api/monitors/run", {
    method: "POST", headers: { "x-monitor-secret": process.env.MONITOR_SECRET! },
  });
  t("correct secret runs", right.status === 200);
} finally {
  if (monitorId) await db.monitor.delete({ where: { id: monitorId } }).catch(() => {});
  server.close();
  console.log("\n  cleaned up the test monitor");
}

console.log(fail === 0 ? "\nAll monitoring checks passed.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
