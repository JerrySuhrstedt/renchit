/**
 * Confirms the dashboard uptime light tells the truth.
 *
 *   npx tsx scripts/verify-uptime-dashboard.mts
 *
 * The interesting case is the stale one. A monitor whose last check is hours
 * old still has status "up" in the database, and the naive render would show a
 * confident green light for a site nobody has looked at since breakfast. So
 * that case is asserted twice: it must say "No reading", and it must NOT say
 * "Up". The second assertion is the one that would actually catch a regression.
 *
 * Also covers the phone field removal: the alert contact API should now take
 * an email and nothing else.
 */
import { config } from "dotenv";
config();
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

const BASE = process.env.ADMIN_TEST_URL ?? "http://localhost:3000";
const { db } = await import("../src/lib/db.ts");

let fail = 0;
const t = (label: string, ok: boolean) => {
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
};

const stamp = randomBytes(4).toString("hex");
const email = `uptime-check-${stamp}@renchit.test`;

const user = await db.user.create({ data: { email, name: "Uptime Check" } });
// Entitled deliberately. On a free account the alerts page renders a paywall
// instead of the contact form, and every "there is no phone field" assertion
// below would pass without ever having looked at the form.
await db.subscription.create({
  data: { userId: user.id, plan: "pro", status: "active", interval: "month" },
});
const token = randomBytes(32).toString("hex");
await db.session.create({
  data: { sessionToken: token, userId: user.id, expires: new Date(Date.now() + 3_600_000) },
});

const minsAgo = (n: number) => new Date(Date.now() - n * 60_000);

/** One monitor per state the card can render. */
const seeds = [
  { url: "https://up-fresh.test/", status: "up", lastCheckedAt: minsAgo(2), enabled: true },
  {
    url: "https://down-now.test/",
    status: "down",
    lastCheckedAt: minsAgo(2),
    enabled: true,
    lastStatusCode: 503,
    consecutiveFailures: 3,
  },
  // Status says up, but the scheduler stopped calling hours ago.
  { url: "https://up-but-stale.test/", status: "up", lastCheckedAt: minsAgo(300), enabled: true },
  { url: "https://paused-site.test/", status: "up", lastCheckedAt: minsAgo(2), enabled: false },
  { url: "https://never-checked.test/", status: "unknown", lastCheckedAt: null, enabled: true },
];

for (const s of seeds) {
  await db.monitor.create({ data: { userId: user.id, ...s } });
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: `authjs.session-token=${token}` },
    redirect: "manual",
  });
  return { status: res.status, html: await res.text() };
}

/**
 * The whole <li> a site is rendered in. Slicing forward from the hostname is
 * not enough: the lamps are markup that comes before the text, so a
 * forward-only slice would miss them and quietly pass every lamp assertion.
 */
function rowFor(html: string, host: string): string {
  return html.split("<li").find((chunk) => chunk.includes(host)) ?? "";
}

/**
 * Which lamp is actually lit. Every row contains all three colours, because
 * unlit lamps keep a dimmed tint of their own colour, so presence of a colour
 * proves nothing. The glow shadow is what only the lit lamp carries.
 */
function litLamps(row: string): string[] {
  return (["red", "amber", "green"] as const).filter((c) =>
    row.includes(`2px_var(--lamp-${c})`),
  );
}

try {
  console.log(`\nThrowaway user: ${email}\n`);

  const page = await get("/dashboard");
  t("dashboard loads", page.status === 200);
  t('the card is present ("Is my site up?")', page.html.includes("Is my site up?"));

  console.log("\nTraffic lights");
  const up = rowFor(page.html, "up-fresh.test");
  t("a healthy site reads Up", up.includes(">Up<"));
  t("a healthy site lights green only", String(litLamps(up)) === "green");
  t("the signal is labelled for screen readers", up.includes('aria-label="up-fresh.test: Up"'));

  const down = rowFor(page.html, "down-now.test");
  t("a failing site reads Down", down.includes(">Down<"));
  t("a failing site lights red only", String(litLamps(down)) === "red");
  t("a failing site says why", down.includes("503"));

  const stale = rowFor(page.html, "up-but-stale.test");
  t('a stale check reads "No reading"', stale.includes(">No reading<"));
  t("a stale check lights amber only", String(litLamps(stale)) === "amber");
  t("a stale check does NOT claim Up", !stale.includes(">Up<"));
  t("a stale check explains itself", stale.includes("out of date"));

  const paused = rowFor(page.html, "paused-site.test");
  t("a paused monitor reads Paused", paused.includes(">Paused<"));
  t("a paused monitor lights nothing at all", litLamps(paused).length === 0);
  t("a paused monitor does NOT claim Up", !paused.includes(">Up<"));

  const fresh = rowFor(page.html, "never-checked.test");
  t("a brand new monitor waits rather than guessing", fresh.includes("Waiting for the first check"));
  t("a brand new monitor lights amber only", String(litLamps(fresh)) === "amber");

  console.log("\nLegend");
  t("the legend is present", page.html.includes("What the lights mean"));
  for (const word of ["Up", "Down", "No reading", "Paused"]) {
    t(`the legend explains "${word}"`, page.html.includes(`>${word}<`));
  }

  t(
    "the down state is called out below the list",
    page.html.includes("We have emailed everyone on your alert list"),
  );

  console.log("\nEmpty state");
  // A user with no activity at all gets the onboarding panel instead, so this
  // needs someone who has used the app but never set up a monitor.
  await db.keywordSearch.create({
    data: { userId: user.id, seed: "wedding dj gilbert az", status: "completed" },
  });
  await db.monitor.deleteMany({ where: { userId: user.id } });
  const bare = await get("/dashboard");
  t("with no monitors, the card invites you to add one", bare.html.includes("Watch my site"));
  t("no stray light is rendered", !bare.html.includes(">Up<"));

  console.log("\nNo phone field left");
  const alerts = await get("/alerts");
  // Proves the assertions below look at the real page, not a paywall.
  t("the watch form is actually on screen", alerts.html.includes("Watch this site"));
  t("no phone input", !alerts.html.includes("+14805551234"));
  t("no leftover texting notice", !/texting|Text messages/i.test(alerts.html));

  async function api(path: string, method: string, body?: unknown) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", cookie: `authjs.session-token=${token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  }

  console.log("\nA site cannot be watched with nobody to tell");
  const noEmail = await api("/api/monitors", "POST", { url: "shop-a.test" });
  t("adding a site without an email is refused", noEmail.status === 400);
  t(
    "and no half-made site is left behind",
    (await db.monitor.count({ where: { userId: user.id, url: { contains: "shop-a" } } })) === 0,
  );

  const badEmail = await api("/api/monitors", "POST", { url: "shop-a.test", email: "nope" });
  t("a malformed email is refused", badEmail.status === 400);

  const siteA = await api("/api/monitors", "POST", {
    url: "shop-a.test",
    email: "anna@renchit.test",
  });
  t("a site with an email is accepted", siteA.status === 201);
  const monitorA = await db.monitor.findFirstOrThrow({
    where: { userId: user.id, url: { contains: "shop-a" } },
    include: { recipients: true },
  });
  t("the contact was created with the site", monitorA.recipients.length === 1);
  t("and it is the address given", monitorA.recipients[0]?.email === "anna@renchit.test");

  console.log("\nContacts stay with their own site");
  await api("/api/monitors", "POST", { url: "shop-b.test", email: "ben@renchit.test" });
  const monitorB = await db.monitor.findFirstOrThrow({
    where: { userId: user.id, url: { contains: "shop-b" } },
    include: { recipients: true },
  });
  t("the second site has its own contact", monitorB.recipients[0]?.email === "ben@renchit.test");
  t(
    "anna is not told about shop-b",
    !monitorB.recipients.some((r) => r.email === "anna@renchit.test"),
  );
  t(
    "ben is not told about shop-a",
    !(await db.monitor.findFirstOrThrow({ where: { id: monitorA.id }, include: { recipients: true } }))
      .recipients.some((r) => r.email === "ben@renchit.test"),
  );

  // The bug this whole change exists to prevent: the runner reading everyone
  // on the account instead of this site's own people.
  const runnerSrc = await readFile(new URL("../src/lib/monitor-runner.ts", import.meta.url), "utf8");
  t("the runner reads the monitor's own recipients", runnerSrc.includes("monitor.recipients"));
  t(
    "the runner no longer reads the whole account",
    !runnerSrc.includes("user.alertRecipients") && !runnerSrc.includes("alertRecipients:"),
  );

  console.log("\nA site is never left with nobody");
  const onlyOne = await api(
    `/api/alert-recipients?id=${monitorA.recipients[0]!.id}`,
    "DELETE",
  );
  t("removing the only contact is refused", onlyOne.status === 400);
  t("the refusal explains why", String(onlyOne.json.error).includes("only person"));
  t(
    "and the contact really is still there",
    (await db.alertRecipient.count({ where: { monitorId: monitorA.id } })) === 1,
  );

  const second = await api("/api/alert-recipients", "POST", {
    monitorId: monitorA.id,
    email: "cara@renchit.test",
  });
  t("a second contact can be added to a site", second.status === 201);

  const dupe = await api("/api/alert-recipients", "POST", {
    monitorId: monitorA.id,
    email: "cara@renchit.test",
  });
  t("the same address twice is refused", dupe.status === 400);

  const nowRemovable = await api(
    `/api/alert-recipients?id=${monitorA.recipients[0]!.id}`,
    "DELETE",
  );
  t("with a spare, the first can be removed", nowRemovable.status === 200);
  t(
    "leaving exactly one",
    (await db.alertRecipient.count({ where: { monitorId: monitorA.id } })) === 1,
  );

  console.log("\nOther people's sites");
  const stranger = await db.user.create({
    data: { email: `stranger-${stamp}@renchit.test` },
  });
  const strangerMonitor = await db.monitor.create({
    data: { userId: stranger.id, url: "https://not-yours.test/" },
  });
  const intrusion = await api("/api/alert-recipients", "POST", {
    monitorId: strangerMonitor.id,
    email: "attacker@renchit.test",
  });
  t("adding a contact to someone else's site is refused", intrusion.status === 404);
  t(
    "and nothing was written",
    (await db.alertRecipient.count({ where: { monitorId: strangerMonitor.id } })) === 0,
  );
  await db.user.delete({ where: { id: stranger.id } });
} finally {
  await db.subscription.deleteMany({ where: { userId: user.id } });
  await db.keywordSearch.deleteMany({ where: { userId: user.id } });
  await db.alertRecipient.deleteMany({ where: { userId: user.id } });
  await db.monitor.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } }).catch(() => {});
}

console.log(fail === 0 ? "\nAll checks passed.\n" : `\n${fail} check(s) failed.\n`);
process.exit(fail === 0 ? 0 : 1);
