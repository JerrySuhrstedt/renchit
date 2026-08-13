import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ProjectHistoryList, type ProjectListItem } from "@/components/project-history-list";

export const dynamic = "force-dynamic";

async function getProjects(userId: string): Promise<ProjectListItem[]> {
  const sites = await db.site.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      audits: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { healthScore: true, startedAt: true },
      },
      contentGrades: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { audits: true, contentGrades: true } },
    },
  });

  return sites.map((s) => {
    const lastAuditAt = s.audits[0]?.startedAt ?? null;
    const lastGradeAt = s.contentGrades[0]?.createdAt ?? null;
    const lastActivityAt =
      lastAuditAt && lastGradeAt
        ? lastAuditAt > lastGradeAt
          ? lastAuditAt
          : lastGradeAt
        : (lastAuditAt ?? lastGradeAt ?? s.createdAt);

    return {
      id: s.id,
      rootUrl: s.rootUrl,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
      latestHealthScore: s.audits[0]?.healthScore ?? null,
      auditCount: s._count.audits,
      contentGradeCount: s._count.contentGrades,
      lastActivityAt: lastActivityAt.toISOString(),
    };
  });
}

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await getProjects(user.id);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-24 sm:px-8">
        <section className="flex flex-col items-center gap-6 pb-14 pt-16 text-center sm:pt-24">
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Every website,{" "}
            <span className="text-brand-strong">all in one place.</span>
          </h1>
          <p className="max-w-lg text-balance text-lg text-muted-foreground">
            Projects automatically group your audits and graded pages by
            website, so you can see everything about one site at a glance.
          </p>
        </section>

        <section className="flex flex-col gap-4 pb-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-foreground">Projects</h2>
            {projects.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {projects.length} project{projects.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <ProjectHistoryList projects={projects} />
        </section>
      </main>
    </>
  );
}
