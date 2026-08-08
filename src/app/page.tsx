import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { NewAuditForm } from "@/components/new-audit-form";
import { AuditHistoryList, type AuditListItem } from "@/components/audit-history-list";

export const dynamic = "force-dynamic";

async function getAudits(userId: string): Promise<AuditListItem[]> {
  const audits = await db.audit.findMany({
    where: { site: { userId } },
    orderBy: { startedAt: "desc" },
    take: 25,
    include: {
      site: true,
      _count: { select: { issues: { where: { status: "open" } } } },
    },
  });

  return audits.map((a) => ({
    id: a.id,
    status: a.status,
    startedAt: a.startedAt.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
    pagesCrawled: a.pagesCrawled,
    pageLimit: a.pageLimit,
    healthScore: a.healthScore,
    errorMessage: a.errorMessage,
    openIssueCount: a._count.issues,
    site: { id: a.site.id, rootUrl: a.site.rootUrl, name: a.site.name },
  }));
}

export default async function DashboardPage() {
  const user = await requireUser();
  const audits = await getAudits(user.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-24 sm:px-8">
        <section className="flex flex-col items-center gap-6 pb-14 pt-16 text-center sm:pt-24">
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Is your site okay?{" "}
            <span className="text-brand-strong">Let&apos;s find out.</span>
          </h1>
          <p className="max-w-lg text-balance text-lg text-muted-foreground">
            Run a real crawl of your website and get a health score plus
            plain-English fixes — no SEO degree required.
          </p>
          <div className="mt-2 w-full max-w-xl">
            <NewAuditForm />
          </div>
        </section>

        <section className="flex flex-col gap-4 pb-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Past audits
            </h2>
            {audits.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {audits.length} audit{audits.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <AuditHistoryList audits={audits} />
        </section>
      </main>
    </>
  );
}
