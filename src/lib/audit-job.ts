import { db } from "./db";
import { crawlSite } from "./crawler";
import { runChecks, computeHealthScore } from "./checks";

const runningJobs = new Set<string>();

export function isAuditRunning(auditId: string) {
  return runningJobs.has(auditId);
}

export async function startAuditJob(auditId: string, rootUrl: string, pageLimit: number) {
  if (runningJobs.has(auditId)) return;
  runningJobs.add(auditId);

  runAuditJob(auditId, rootUrl, pageLimit)
    .catch(async (err) => {
      // Only overwrite if still "running"; if the user cancelled it, that
      // status (and its "Cancelled by you." message) should stick.
      await db.audit.updateMany({
        where: { id: auditId, status: "running" },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    })
    .finally(() => {
      runningJobs.delete(auditId);
    });
}

async function runAuditJob(auditId: string, rootUrl: string, pageLimit: number) {
  let lastUpdate = 0;

  const crawl = await crawlSite(rootUrl, pageLimit, async (crawled) => {
    const now = Date.now();
    if (now - lastUpdate < 1000 && crawled < pageLimit) return;
    lastUpdate = now;
    await db.audit.update({
      where: { id: auditId },
      data: { pagesCrawled: crawled },
    }).catch(() => {});
  });

  const issues = runChecks(crawl);
  const healthScore = computeHealthScore(issues, crawl.pages.length);

  await db.$transaction(
    async (tx) => {
      // If the user cancelled this audit while the crawl was still running,
      // don't resurrect it by writing results after the fact.
      const current = await tx.audit.findUnique({
        where: { id: auditId },
        select: { status: true },
      });
      if (current?.status !== "running") return;

      // createManyAndReturn batches all pages into one insert (with ids back)
      // instead of one create() per page; with up to 50 pages, N sequential
      // round-trips to Neon could alone blow past the transaction timeout.
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
        },
      });
    },
    { timeout: 20_000 },
  );
}
