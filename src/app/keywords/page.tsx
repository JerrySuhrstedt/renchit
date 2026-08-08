import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { NewKeywordSearchForm } from "@/components/new-keyword-search-form";
import {
  KeywordSearchHistoryList,
  type KeywordSearchListItem,
} from "@/components/keyword-search-history-list";

export const dynamic = "force-dynamic";

async function getSearches(userId: string): Promise<KeywordSearchListItem[]> {
  const searches = await db.keywordSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: {
      _count: { select: { ideas: true } },
    },
  });

  return searches.map((s) => ({
    id: s.id,
    seed: s.seed,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    ideaCount: s._count.ideas,
  }));
}

export default async function KeywordsDashboardPage() {
  const user = await requireUser();
  const searches = await getSearches(user.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-24 sm:px-8">
        <section className="flex flex-col items-center gap-6 pb-14 pt-16 text-center sm:pt-24">
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            What should you{" "}
            <span className="text-brand-strong">write about next?</span>
          </h1>
          <p className="max-w-lg text-balance text-lg text-muted-foreground">
            Enter a topic and get real questions and phrases people search
            for — straight from Google, no guesswork.
          </p>
          <div className="mt-2 w-full max-w-xl">
            <NewKeywordSearchForm />
          </div>
        </section>

        <section className="flex flex-col gap-4 pb-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Past searches
            </h2>
            {searches.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {searches.length} search{searches.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
          <KeywordSearchHistoryList searches={searches} />
        </section>
      </main>
    </>
  );
}
