import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeAuditUrl } from "@/lib/validation";
import { startAuditJob } from "@/lib/audit-job";

const PAGE_LIMIT = 50;

export async function GET() {
  const audits = await db.audit.findMany({
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

  const site = await db.site.upsert({
    where: { rootUrl },
    update: {},
    create: { rootUrl },
  });

  const audit = await db.audit.create({
    data: {
      siteId: site.id,
      status: "running",
      pageLimit: PAGE_LIMIT,
    },
  });

  startAuditJob(audit.id, rootUrl, PAGE_LIMIT);

  return NextResponse.json({ auditId: audit.id, siteId: site.id }, { status: 202 });
}
