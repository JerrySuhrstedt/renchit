import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { KeywordResultsView } from "@/components/keyword-results-view";
import type { KeywordSearchDTO } from "@/lib/keyword-types";

export const dynamic = "force-dynamic";

export default async function KeywordSearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const search = await db.keywordSearch.findFirst({
    where: { id, userId: user.id },
    include: {
      ideas: { orderBy: { phrase: "asc" } },
    },
  });

  if (!search) notFound();

  if (search.status === "failed") {
    return (
      <>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-critical-tint">
            <TriangleAlert className="h-6 w-6 text-critical" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            We couldn&apos;t find ideas for this search
          </h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong reaching the search suggestion service. Try
            again in a moment.
          </p>
          <Link
            href="/keywords"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to keyword ideas
          </Link>
        </div>
      </>
    );
  }

  const dto: KeywordSearchDTO = {
    id: search.id,
    seed: search.seed,
    status: search.status as KeywordSearchDTO["status"],
    createdAt: search.createdAt.toISOString(),
    ideas: search.ideas.map((i) => ({
      id: i.id,
      phrase: i.phrase,
      category: i.category as KeywordSearchDTO["ideas"][number]["category"],
      saved: i.saved,
    })),
  };

  return (
    <>
      <KeywordResultsView search={dto} />
    </>
  );
}
