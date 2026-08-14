import { db } from "./db";
import { crawlChunk, analyseCrawl, type CrawlProgress } from "./crawler";
import { runChecks, computeHealthScore } from "./checks";

/**
 * The audit worker.
 *
 * A hundred-page crawl cannot finish inside one serverless invocation, and an
 * invocation killed mid-crawl leaves an audit stuck at "running" with nothing
 * to show. So the crawl runs in chunks: fetch for a while, park the queue and
 * what has been gathered on the audit row, then invoke ourselves again to
 * carry on. The user can close the tab at any point; none of this depends on
 * their browser being open.
 */

/**
 * Well under the 60s function ceiling, leaving room to save state and hand
 * off. Overridable so tests can force the handoff on a site fast enough to
 * finish in one pass, which is otherwise unreachable.
 */
const CHUNK_BUDGET_MS = Number(process.env.AUDIT_CHUNK_BUDGET_MS ?? 40_000);

/**
 * A hard stop on continuations. A loop here would be expensive and completely
 * invisible, so it ends with whatever has been collected rather than running
 * forever.
 */
const MAX_CHUNKS = 20;

export function continuationSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://www.renchit.com";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Kicks off the first chunk. Everything after that is self-driven. */
export async function startAuditJob(auditId: string, rootUrl: string, pageLimit: number) {
  await runAuditChunk(auditId, rootUrl, pageLimit).catch(async (err) => {
    await failAudit(auditId, err instanceof Error ? err.message : "Unknown error");
  });
}

async function failAudit(auditId: string, message: string) {
  // Only overwrite while still running. If the user cancelled, that status
  // and its message should stick.
  await db.audit
    .updateMany({
      where: { id: auditId, status: "running" },
      data: { status: "failed", errorMessage: message, completedAt: new Date() },
    })
    .catch(() => {});
}

/**
 * One slice of work: resume where the last chunk stopped, crawl until the
 * budget runs out, then either finish or hand off to the next chunk.
 */
export async function runAuditChunk(auditId: string, rootUrl: string, pageLimit: number) {
  const audit = await db.audit.findUnique({
    where: { id: auditId },
    select: { status: true, crawlState: true, chunkCount: true, pageLimit: true },
  });

  // Cancelled, already finished, or gone. Either way there is nothing to do,
  // and continuing would resurrect an audit the user stopped on purpose.
  if (!audit || audit.status !== "running") return;

  const limit = audit.pageLimit || pageLimit;
  const resume: CrawlProgress | null = audit.crawlState
    ? (JSON.parse(audit.crawlState) as CrawlProgress)
    : null;

  let lastUpdate = 0;
  const chunk = await crawlChunk(rootUrl, limit, CHUNK_BUDGET_MS, resume, async (crawled) => {
    const now = Date.now();
    if (now - lastUpdate < 1000) return;
    lastUpdate = now;
    await db.audit
      .update({ where: { id: auditId }, data: { pagesCrawled: crawled } })
      .catch(() => {});
  });

  const nextChunk = audit.chunkCount + 1;
  const outOfChunks = nextChunk >= MAX_CHUNKS;

  if (chunk.done || outOfChunks) {
    await finishAudit(auditId, rootUrl, chunk, outOfChunks && !chunk.done);
    return;
  }

  // Park progress and hand off. Written before the handoff so a failed handoff
  // still leaves resumable state rather than losing the work.
  await db.audit.update({
    where: { id: auditId },
    data: {
      crawlState: JSON.stringify({
        queue: chunk.queue,
        visited: chunk.visited,
        pages: chunk.pages,
      }),
      chunkCount: nextChunk,
      pagesCrawled: chunk.pages.length,
    },
  });

  await handOff(auditId, rootUrl, limit);
}

/**
 * Triggers the next chunk over HTTP, because a new invocation is exactly the
 * point: a fresh function gets a fresh time budget.
 */
async function handOff(auditId: string, rootUrl: string, pageLimit: number) {
  const url = `${baseUrl()}/api/audits/${auditId}/continue`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-audit-worker": continuationSecret(),
      },
      body: JSON.stringify({ rootUrl, pageLimit }),
    });
    if (!res.ok && res.status !== 202) {
      await failAudit(auditId, `Could not continue the crawl (${res.status}).`);
    }
  } catch (err) {
    await failAudit(
      auditId,
      `Could not continue the crawl: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
}

/** Runs the analysis pass and writes the finished audit. */
async function finishAudit(
  auditId: string,
  rootUrl: string,
  chunk: { pages: CrawlProgress["pages"]; queue: string[]; pageLimitHit: boolean },
  stoppedEarly: boolean,
) {
  const crawl = await analyseCrawl(rootUrl, chunk.pages, chunk.pageLimitHit, stoppedEarly);
  const issues = runChecks(crawl);
  const healthScore = computeHealthScore(issues, crawl.pages.length);

  await db.$transaction(
    async (tx) => {
      const current = await tx.audit.findUnique({
        where: { id: auditId },
        select: { status: true },
      });
      if (current?.status !== "running") return;

      // Chunks may have written pages already on a previous partial finish;
      // clear first so a resumed audit cannot end up with duplicates.
      await tx.page.deleteMany({ where: { auditId } });
      await tx.issue.deleteMany({ where: { auditId } });

      // createManyAndReturn batches every page into one insert with ids back.
      // At a hundred pages, one create() per page would be a hundred sequential
      // round-trips to Neon and would alone blow the transaction timeout.
      const createdPages =
        crawl.pages.length > 0
          ? await tx.page.createManyAndReturn({
              data: crawl.pages.map((page) => ({
                auditId,
                url: page.url,
                statusCode: page.statusCode,
                title: page.title,
                metaDescription: page.metaDescription,
                h1Count: page.h1s.length,
                wordCount: page.wordCount,
                sizeBytes: page.sizeBytes,
                loadTimeMs: page.loadTimeMs,
                canonical: page.canonical,
                redirectedFrom: page.redirectedFrom,
              })),
            })
          : [];

      const pageIdByUrl = new Map(createdPages.map((p) => [p.url, p.id]));

      if (issues.length > 0) {
        await tx.issue.createMany({
          data: issues.map((i) => ({
            auditId,
            pageId: i.pageUrl ? pageIdByUrl.get(i.pageUrl) ?? null : null,
            type: i.type,
            severity: i.severity,
            category: i.category,
            title: i.title,
            description: i.description,
            fixSteps: i.fixSteps,
            affectedUrl: i.affectedUrl,
          })),
        });
      }

      await tx.audit.update({
        where: { id: auditId },
        data: {
          status: "completed",
          completedAt: new Date(),
          pagesCrawled: crawl.pages.length,
          healthScore,
          // Drop the parked state: it is large, and keeping it would leave a
          // copy of every crawl sitting in the database forever.
          crawlState: null,
          errorMessage: stoppedEarly
            ? `We stopped after ${crawl.pages.length} pages. Everything below is real, it just does not cover the whole site.`
            : null,
        },
      });
    },
    { timeout: 20_000 },
  );
}
