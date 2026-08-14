import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { requireToolAccess, requireSiteCapacity } from "@/lib/entitlements";
import { normalizeAuditUrl } from "@/lib/validation";
import { startAuditJob } from "@/lib/audit-job";

const PAGE_LIMIT = 50;

// Ask for the longest run the platform allows. The crawler stops itself
// before this, but without it the default is far shorter and crawls get cut
// off mid-page.
export const maxDuration = 60;

export async function GET() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const audits = await db.audit.findMany({
    where: { site: { userId } },
    orderBy: { startedAt: "desc" },
    include: {
      site: true,
      _count: { select: { issues: { where: { status: "open" } } } },
    },
  });

  return NextResponse.json({
    audits: audits.map((a) => ({
      id: a.id,
      status: a.status,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      pagesCrawled: a.pagesCrawled,
      pageLimit: a.pageLimit,
      healthScore: a.healthScore,
      errorMessage: a.errorMessage,
      openIssueCount: a._count.issues,
      site: { id: a.site.id, rootUrl: a.site.rootUrl, name: a.site.name },
    })),
  });
}

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const ent = await requireToolAccess(userId, "audit");
  if (ent instanceof NextResponse) return ent;

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "A URL is required" }, { status: 400 });
  }

  let rootUrl: string;
  try {
    rootUrl = normalizeAuditUrl(body.url);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }

  const overLimit = await requireSiteCapacity(userId, ent, rootUrl);
  if (overLimit) return overLimit;

  const site = await db.site.upsert({
    where: { userId_rootUrl: { userId, rootUrl } },
    update: {},
    create: { rootUrl, userId },
  });

  const audit = await db.audit.create({
    data: {
      siteId: site.id,
      status: "running",
      pageLimit: PAGE_LIMIT,
    },
  });

  // after() keeps this work running past the response on Vercel's serverless
  // runtime, where a plain unawaited promise can get frozen once the response
  // is sent; a bare fire-and-forget call only reliably finishes on a
  // long-lived Node process (e.g. local dev).
  after(() => startAuditJob(audit.id, rootUrl, PAGE_LIMIT));

  return NextResponse.json({ auditId: audit.id, siteId: site.id }, { status: 202 });
}
