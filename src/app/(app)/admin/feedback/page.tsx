import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { FeedbackRow } from "@/components/feedback-admin";
import { AlertTriangle, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Feedback | renchit" };

const KIND_LABEL: Record<string, string> = {
  bug: "Something broke",
  confusing: "Confusing",
  idea: "Idea",
  praise: "Nice work",
};

/**
 * Recent tool failures, gathered from the errorMessage each tool already
 * writes to its own row.
 *
 * This is the half users never report. They see a failed run, assume the
 * product is broken, and say nothing.
 */
async function recentFailures() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [audits, grades, listings, speed, search] = await Promise.all([
    db.audit.findMany({
      where: { status: "failed", startedAt: { gte: since } },
      select: { id: true, errorMessage: true, startedAt: true, site: { select: { rootUrl: true } } },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    db.contentGrade.findMany({
      where: { status: "failed", createdAt: { gte: since } },
      select: { id: true, errorMessage: true, createdAt: true, url: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.localListing.findMany({
      where: { status: "failed", createdAt: { gte: since } },
      select: { id: true, errorMessage: true, createdAt: true, websiteUrl: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.pageSpeedCheck.findMany({
      where: { status: "failed", createdAt: { gte: since } },
      select: { id: true, errorMessage: true, createdAt: true, url: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.searchConsoleReport.findMany({
      where: { status: "failed", createdAt: { gte: since } },
      select: { id: true, errorMessage: true, createdAt: true, propertyUrl: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return [
    ...audits.map((a) => ({ tool: "Site Audit", target: a.site.rootUrl, at: a.startedAt, error: a.errorMessage })),
    ...grades.map((g) => ({ tool: "Content Grader", target: g.url, at: g.createdAt, error: g.errorMessage })),
    ...listings.map((l) => ({ tool: "Local Listing", target: l.websiteUrl, at: l.createdAt, error: l.errorMessage })),
    ...speed.map((s) => ({ tool: "Page Speed", target: s.url, at: s.createdAt, error: s.errorMessage })),
    ...search.map((s) => ({ tool: "Search Data", target: s.propertyUrl, at: s.createdAt, error: s.errorMessage })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
}

export default async function AdminFeedbackPage() {
  await requireAdmin();

  const [feedback, failures] = await Promise.all([
    db.feedback.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { user: { select: { email: true, name: true } } },
    }),
    recentFailures(),
  ]);

  const unread = feedback.filter((f) => f.status === "new").length;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-24 pt-8 sm:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Feedback</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What people told you, and what broke without anyone telling you.
      </p>

      {/* Silent failures */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
          Tool failures, last 7 days ({failures.length})
        </h2>
        {failures.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
            Nothing failed this week.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {failures.slice(0, 25).map((f, i) => (
              <li
                key={`${f.tool}-${i}`}
                className="rounded-2xl border border-border bg-card px-5 py-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold text-foreground">{f.tool}</span>
                  <span className="text-xs text-muted-foreground">
                    {f.at.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.target}</p>
                <p className="mt-1 font-mono text-xs text-critical">
                  {f.error ?? "(no error recorded)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reports */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Inbox className="h-4 w-4 text-brand-strong" aria-hidden />
          Reports ({unread} new of {feedback.length})
        </h2>

        {feedback.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
            Nobody has sent anything yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {feedback.map((f) => (
              <FeedbackRow
                key={f.id}
                id={f.id}
                kind={KIND_LABEL[f.kind] ?? f.kind}
                message={f.message}
                status={f.status}
                who={f.user?.email ?? "signed out"}
                plan={f.plan}
                pageUrl={f.pageUrl}
                viewport={f.viewport}
                userAgent={f.userAgent}
                at={f.createdAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
