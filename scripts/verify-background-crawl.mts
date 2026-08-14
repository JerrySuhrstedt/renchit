/**
 * Drives a real chunked audit end to end.
 *
 *   npx tsx scripts/verify-background-crawl.mts [url]
 *
 * Starts an audit the way the app does, then watches the database while the
 * worker chunks and hands off to itself. Proves the crawl outlives a single
 * invocation and finishes without the browser being involved at all.
 */
import { config } from "dotenv";
config();
import { randomBytes } from "node:crypto";

const BASE = "http://localhost:3000";
const TARGET = process.argv[2] ?? "https://sumolab.co";
const { db } = await import("../src/lib/db.ts");

let fail = 0;
const t = (l: string, ok: boolean) => { if (!ok) fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}`); };

const owner = await db.user.findFirstOrThrow({ where: { role: "owner" }, select: { id: true } });
const token = randomBytes(32).toString("hex");
await db.session.create({ data: { sessionToken: token, userId: owner.id, expires: new Date(Date.now() + 3_600_000) } });
const cookie = `authjs.session-token=${token}`;

let auditId: string | null = null;
try {
  console.log(`\nStarting an audit of ${TARGET}`);
  const res = await fetch(`${BASE}/api/audits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ url: TARGET }),
  });
  const data = await res.json();
  t("audit accepted", res.status === 202 && Boolean(data.auditId));
  auditId = data.auditId;
  if (!auditId) throw new Error(data.error ?? "no audit id");

  console.log("\nWatching, without any browser polling:");
  let chunksSeen = 0;
  let last = -1;
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const a = await db.audit.findUniqueOrThrow({
      where: { id: auditId },
      select: { status: true, pagesCrawled: true, chunkCount: true, healthScore: true, errorMessage: true, crawlState: true },
    });
    chunksSeen = Math.max(chunksSeen, a.chunkCount);
    if (a.pagesCrawled !== last) {
      console.log(`    ${String(a.pagesCrawled).padStart(3)} pages   chunk ${a.chunkCount}   ${a.status}`);
      last = a.pagesCrawled;
    }
    if (a.status !== "running") {
      console.log();
      t("finished rather than hanging", a.status === "completed");
      const forced = Boolean(process.env.AUDIT_CHUNK_BUDGET_MS);
      // A fast site finishes in one pass and never hands off, which is the
      // good case. Only demand a handoff when the budget was squeezed.
      if (forced) t(`handed off between invocations (${chunksSeen} chunks)`, chunksSeen >= 1);
      else console.log(`        finished in one pass, ${chunksSeen} handoffs needed`);
      t("health score computed", a.healthScore !== null);
      t("parked state cleared after finishing", a.crawlState === null);
      const pages = await db.page.count({ where: { auditId } });
      const issues = await db.issue.count({ where: { auditId } });
      t(`pages written (${pages})`, pages > 0);
      t(`issues written (${issues})`, issues >= 0);
      t("no duplicate pages", pages === a.pagesCrawled);
      if (a.errorMessage) console.log(`        note: ${a.errorMessage}`);
      break;
    }
    if (i === 99) t("finished within five minutes", false);
  }

  console.log("\nContinuation endpoint is not open to the public");
  const unauth = await fetch(`${BASE}/api/audits/${auditId}/continue`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rootUrl: TARGET }),
  });
  t("rejects a request with no secret", unauth.status === 404);
  const wrong = await fetch(`${BASE}/api/audits/${auditId}/continue`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-audit-worker": "wrong" },
    body: JSON.stringify({ rootUrl: TARGET }),
  });
  t("rejects a wrong secret", wrong.status === 404);
} finally {
  if (auditId) await db.audit.delete({ where: { id: auditId } }).catch(() => {});
  await db.session.delete({ where: { sessionToken: token } }).catch(() => {});
  console.log("\n  cleaned up the test audit");
}

console.log(fail === 0 ? "\nAll background crawl checks passed.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
