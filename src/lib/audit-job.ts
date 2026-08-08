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
      await db.audit.update({
        where: { id: auditId },
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

  await db.$transaction(async (tx) => {
    const pageIdByUrl = new Map<string, string>();

    for (const page of crawl.pages) {
      const created = await tx.page.create({
        data: {
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
        },
      });
      pageIdByUrl.set(page.url, created.id);
    }

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
  });
}
