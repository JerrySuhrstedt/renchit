import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { AuditHistoryList, type AuditListItem } from "@/components/audit-history-list";
import { GraderHistoryList, type GraderHistoryItem } from "@/components/grader-history-list";
import { hostnameOf } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const site = await db.site.findFirst({
    where: { id, userId: user.id },
    include: {
      audits: {
        orderBy: { startedAt: "desc" },
        include: { _count: { select: { issues: { where: { status: "open" } } } } },
      },
      contentGrades: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!site) notFound();

  const audits: AuditListItem[] = site.audits.map((a) => ({
    id: a.id,
    status: a.status,
    startedAt: a.startedAt.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
    pagesCrawled: a.pagesCrawled,
    pageLimit: a.pageLimit,
    healthScore: a.healthScore,
    errorMessage: a.errorMessage,
    openIssueCount: a._count.issues,
    site: { id: site.id, rootUrl: site.rootUrl, name: site.name },
  }));

  const grades: GraderHistoryItem[] = site.contentGrades.map((g) => ({
    id: g.id,
    url: g.url,
    targetKeyword: g.targetKeyword,
    status: g.status,
    score: g.score,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-8 sm:px-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>

        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-6 py-10 text-center sm:px-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {site.name ?? hostnameOf(site.rootUrl)}
          </h1>
          <p className="text-sm text-muted-foreground">{site.rootUrl}</p>
        </div>

        <section className="mt-10 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground">
            Audits ({audits.length})
          </h2>
          <AuditHistoryList audits={audits} />
        </section>

        <section className="mt-10 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground">
            Graded pages ({grades.length})
          </h2>
          <GraderHistoryList grades={grades} />
        </section>
      </main>
    </>
  );
}
