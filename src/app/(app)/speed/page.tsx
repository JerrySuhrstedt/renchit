import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { NewPageSpeedForm } from "@/components/new-page-speed-form";
import {
  PageSpeedHistoryList,
  type PageSpeedHistoryItem,
} from "@/components/page-speed-history-list";

export const dynamic = "force-dynamic";

async function getChecks(userId: string): Promise<PageSpeedHistoryItem[]> {
  const checks = await db.pageSpeedCheck.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return checks.map((c) => ({
    id: c.id,
    url: c.url,
    status: c.status,
    mobileScore: c.mobileScore,
    desktopScore: c.desktopScore,
    createdAt: c.createdAt.toISOString(),
  }));
}

export default async function PageSpeedDashboardPage() {
  const user = await requireUser();
  const checks = await getChecks(user.id);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-24 sm:px-8">
        <section className="flex flex-col items-center gap-6 pb-14 pt-16 text-center sm:pt-24">
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            How fast does your page{" "}
            <span className="text-brand-strong">actually load?</span>
          </h1>
          <p className="max-w-lg text-balance text-lg text-muted-foreground">
            Real mobile and desktop scores straight from Google&apos;s
            PageSpeed Insights, plus a plain-English list of what&apos;s
            slowing you down.
          </p>
          <div className="mt-2 w-full max-w-xl">
            <NewPageSpeedForm />
          </div>
        </section>

        <section className="flex flex-col gap-4 pb-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Past tests
            </h2>
            {checks.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {checks.length} test{checks.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <PageSpeedHistoryList checks={checks} />
        </section>
      </main>
    </>
  );
}
