import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { reapStaleRuns } from "@/lib/stale-runs";
import { hasSearchConsoleScope } from "@/lib/google-token";
import { SearchConsoleConnect } from "@/components/search-console-connect";
import { NewSearchConsoleForm } from "@/components/new-search-console-form";
import {
  SearchConsoleHistoryList,
  type SearchConsoleHistoryItem,
} from "@/components/search-console-history-list";

export const dynamic = "force-dynamic";

async function getReports(userId: string): Promise<SearchConsoleHistoryItem[]> {
  const reports = await db.searchConsoleReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return reports.map((r) => ({
    id: r.id,
    propertyUrl: r.propertyUrl,
    status: r.status,
    totalClicks: r.totalClicks,
    createdAt: r.createdAt.toISOString(),
  }));
}

export default async function SearchConsoleDashboardPage() {
  const user = await requireUser();
  // Clear out anything a killed function left saying "running".
  await reapStaleRuns(user.id);
  const [connected, reports] = await Promise.all([
    hasSearchConsoleScope(user.id),
    getReports(user.id),
  ]);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-24 sm:px-8">
        <section className="flex flex-col items-center gap-6 pb-14 pt-16 text-center sm:pt-24">
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            What are people{" "}
            <span className="text-brand-strong">actually finding you for?</span>
          </h1>
          <p className="max-w-lg text-balance text-lg text-muted-foreground">
            Real search data straight from Google: the phrases people typed,
            where you ranked, and which ones you&apos;re closest to winning.
          </p>
          <div className="mt-2 w-full max-w-xl">
            {connected ? <NewSearchConsoleForm /> : <SearchConsoleConnect />}
          </div>
        </section>

        {reports.length > 0 && (
          <section className="flex flex-col gap-4 pb-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-foreground">Past reports</h2>
              <span className="text-sm text-muted-foreground">
                {reports.length} report{reports.length === 1 ? "" : "s"}
              </span>
            </div>
            <SearchConsoleHistoryList reports={reports} />
          </section>
        )}
      </main>
    </>
  );
}
