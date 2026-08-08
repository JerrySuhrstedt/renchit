import Link from "next/link";
import { ArrowUpRight, Loader2, TriangleAlert, Lightbulb } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

export type KeywordSearchListItem = {
  id: string;
  seed: string;
  status: string;
  createdAt: string;
  ideaCount: number;
};

export function KeywordSearchHistoryList({
  searches,
}: {
  searches: KeywordSearchListItem[];
}) {
  if (searches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
          <Lightbulb className="h-6 w-6 text-brand-strong" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            No searches yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Enter a topic above and we&apos;ll pull real questions and
            phrases people are searching for around it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {searches.map((search) => (
        <li key={search.id}>
          <Link
            href={`/keywords/${search.id}`}
            className="group flex items-center gap-5 rounded-3xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(36,28,21,0.03)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-18px_rgba(36,28,21,0.35)] sm:px-6 sm:py-5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-tint">
              {search.status === "running" ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-strong" />
              ) : search.status === "failed" ? (
                <TriangleAlert className="h-5 w-5 text-critical" />
              ) : (
                <Lightbulb className="h-5 w-5 text-brand-strong" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {search.seed}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {search.status === "completed" &&
                  `${search.ideaCount} idea${search.ideaCount === 1 ? "" : "s"} · ${formatRelativeTime(search.createdAt)}`}
                {search.status === "running" && "Finding ideas…"}
                {search.status === "failed" && "Search failed"}
              </p>
            </div>

            <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-strong" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
