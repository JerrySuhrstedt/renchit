import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { reapStaleRuns } from "@/lib/stale-runs";

/**
 * What has finished since the user last looked.
 *
 * Compared against a single timestamp on the user rather than a read flag on
 * every row of every tool, because "have I seen this" is a property of the
 * person, not of each result.
 */
export async function GET() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  // A run killed mid-flight would otherwise sit as "running" and never appear
  // here at all, so sweep before counting.
  await reapStaleRuns(userId);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { resultsSeenAt: true },
  });
  const since = user?.resultsSeenAt ?? new Date(0);

  const [audits, speed, running] = await Promise.all([
    db.audit.findMany({
      where: { site: { userId }, status: "completed", completedAt: { gt: since } },
      select: { id: true, healthScore: true, completedAt: true, site: { select: { rootUrl: true } } },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
    db.pageSpeedCheck.findMany({
      where: { userId, status: "completed", createdAt: { gt: since } },
      select: { id: true, url: true, mobileScore: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.audit.count({ where: { site: { userId }, status: "running" } }),
  ]);

  const items = [
    ...audits.map((a) => ({
      id: a.id,
      href: `/audits/${a.id}`,
      tool: "Site Audit",
      target: a.site.rootUrl,
      score: a.healthScore,
      at: a.completedAt?.toISOString() ?? null,
    })),
    ...speed.map((s) => ({
      id: s.id,
      href: `/speed/${s.id}`,
      tool: "Page Speed",
      target: s.url,
      score: s.mobileScore,
      at: s.createdAt.toISOString(),
    })),
  ].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

  return NextResponse.json({ items, count: items.length, running });
}

/** Marks everything as seen, which is what opening the panel means. */
export async function POST() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  await db.user.update({ where: { id: userId }, data: { resultsSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
