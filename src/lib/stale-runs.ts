import { db } from "@/lib/db";

/**
 * Marks abandoned runs as failed.
 *
 * Every tool writes a "running" row, does its work, then writes the result.
 * If the serverless function is killed in between, which happens whenever a
 * crawl outlives the platform's function timeout, that row stays "running"
 * forever and the user watches a progress bar that will never move again.
 *
 * Nothing else can notice this. The process that would have updated the row
 * is the process that died, so the only way to catch it is for a later read
 * to look at the clock.
 */

/**
 * Comfortably longer than any run can survive. Vercel caps functions well
 * below this, so anything still "running" after it is definitively dead
 * rather than slow.
 */
export const STALE_AFTER_MS = 5 * 60_000;

const MESSAGE =
  "This run stopped before it finished, usually because the site took too long to crawl. Try again, and if it keeps happening the site may be too slow or too large for a single pass.";

/**
 * Sweeps a user's abandoned runs. Cheap enough to call on any read: each query
 * is indexed on status and touches only rows that are already too old.
 */
export async function reapStaleRuns(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);

  const [audits, grades, listings, speed, search] = await Promise.all([
    db.audit.updateMany({
      where: { status: "running", startedAt: { lt: cutoff }, site: { userId } },
      data: { status: "failed", errorMessage: MESSAGE, completedAt: new Date() },
    }),
    db.contentGrade.updateMany({
      where: { status: "running", createdAt: { lt: cutoff }, userId },
      data: { status: "failed", errorMessage: MESSAGE },
    }),
    db.localListing.updateMany({
      where: { status: "running", createdAt: { lt: cutoff }, userId },
      data: { status: "failed", errorMessage: MESSAGE },
    }),
    db.pageSpeedCheck.updateMany({
      where: { status: "running", createdAt: { lt: cutoff }, userId },
      data: { status: "failed", errorMessage: MESSAGE },
    }),
    db.searchConsoleReport.updateMany({
      where: { status: "running", createdAt: { lt: cutoff }, userId },
      data: { status: "failed", errorMessage: MESSAGE },
    }),
  ]);

  return audits.count + grades.count + listings.count + speed.count + search.count;
}
