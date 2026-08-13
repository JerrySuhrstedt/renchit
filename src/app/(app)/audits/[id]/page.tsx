import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AuditPageClient } from "@/components/audit-page-client";
import type { AuditDTO } from "@/lib/audit-types";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const audit = await db.audit.findFirst({
    where: { id, site: { userId: user.id } },
    include: {
      site: true,
      issues: { orderBy: [{ severity: "asc" }, { createdAt: "asc" }] },
      pages: { orderBy: { crawledAt: "asc" } },
    },
  });

  if (!audit) notFound();

  const dto: AuditDTO = {
    id: audit.id,
    status: audit.status as AuditDTO["status"],
    startedAt: audit.startedAt.toISOString(),
    completedAt: audit.completedAt?.toISOString() ?? null,
    pageLimit: audit.pageLimit,
    pagesCrawled: audit.pagesCrawled,
    healthScore: audit.healthScore,
    errorMessage: audit.errorMessage,
    site: { id: audit.site.id, rootUrl: audit.site.rootUrl, name: audit.site.name },
    pages: audit.pages.map((p) => ({
      id: p.id,
      url: p.url,
      statusCode: p.statusCode,
      title: p.title,
      wordCount: p.wordCount,
      loadTimeMs: p.loadTimeMs,
    })),
    issues: audit.issues.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity as AuditDTO["issues"][number]["severity"],
      category: i.category as AuditDTO["issues"][number]["category"],
      title: i.title,
      description: i.description,
      fixSteps: i.fixSteps,
      affectedUrl: i.affectedUrl,
      status: i.status as AuditDTO["issues"][number]["status"],
      pageId: i.pageId,
    })),
  };

  return (
    <>
      <AuditPageClient initialAudit={dto} />
    </>
  );
}
