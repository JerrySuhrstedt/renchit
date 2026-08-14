import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { reapStaleRuns } from "@/lib/stale-runs";
import { NewGraderForm } from "@/components/new-grader-form";
import { GraderHistoryList, type GraderHistoryItem } from "@/components/grader-history-list";

export const dynamic = "force-dynamic";

async function getGrades(userId: string): Promise<GraderHistoryItem[]> {
  const grades = await db.contentGrade.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return grades.map((g) => ({
    id: g.id,
    url: g.url,
    targetKeyword: g.targetKeyword,
    status: g.status,
    score: g.score,
    createdAt: g.createdAt.toISOString(),
  }));
}

export default async function GraderDashboardPage() {
  const user = await requireUser();
  // Clear out anything a killed function left saying "running".
  await reapStaleRuns(user.id);
  const grades = await getGrades(user.id);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-24 sm:px-8">
        <section className="flex flex-col items-center gap-6 pb-14 pt-16 text-center sm:pt-24">
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Is this page{" "}
            <span className="text-brand-strong">optimized to rank?</span>
          </h1>
          <p className="max-w-lg text-balance text-lg text-muted-foreground">
            Grade any page against a target keyword and get a plain-English
            checklist of exactly what to fix.
          </p>
          <div className="mt-2 w-full max-w-xl">
            <NewGraderForm />
          </div>
        </section>

        <section className="flex flex-col gap-4 pb-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Past grades
            </h2>
            {grades.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {grades.length} page{grades.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <GraderHistoryList grades={grades} />
        </section>
      </main>
    </>
  );
}
