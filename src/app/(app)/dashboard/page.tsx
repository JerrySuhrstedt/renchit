import Link from "next/link";
import {
  Wrench,
  Lightbulb,
  FileSearch,
  MapPin,
  Gauge,
  Search,
  ArrowRight,
  TriangleAlert,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { HealthScoreDial } from "@/components/health-score-dial";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { ScoreTrendChart, type TrendPoint } from "@/components/score-trend-chart";
import { hostnameOf, formatRelativeTime, pageSpeedBand } from "@/lib/format";

export const dynamic = "force-dynamic";

const MIN_POINTS_FOR_TREND = 3;

async function getDashboardData(userId: string) {
  const [audits, openIssues, latestGrade, latestListing, latestSpeed, latestSearch, counts] =
    await Promise.all([
      db.audit.findMany({
        where: { site: { userId }, status: "completed" },
        orderBy: { startedAt: "asc" },
        take: 30,
        include: { site: { select: { rootUrl: true } } },
      }),
      db.issue.count({
        where: { audit: { site: { userId } }, status: "open" },
      }),
      db.contentGrade.findFirst({
        where: { userId, status: "completed" },
        orderBy: { createdAt: "desc" },
      }),
      db.localListing.findFirst({
        where: { userId, status: "completed" },
        orderBy: { createdAt: "desc" },
      }),
      db.pageSpeedCheck.findFirst({
        where: { userId, status: "completed" },
        orderBy: { createdAt: "desc" },
      }),
      db.searchConsoleReport.findFirst({
        where: { userId, status: "completed" },
        orderBy: { createdAt: "desc" },
      }),
      Promise.all([
        db.audit.count({ where: { site: { userId } } }),
        db.keywordSearch.count({ where: { userId } }),
        db.contentGrade.count({ where: { userId } }),
        db.site.count({ where: { userId } }),
      ]),
    ]);

  const [auditCount, keywordCount, gradeCount, siteCount] = counts;

  return {
    audits,
    openIssues,
    latestGrade,
    latestListing,
    latestSpeed,
    latestSearch,
    auditCount,
    keywordCount,
    gradeCount,
    siteCount,
  };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  const latestAudit = data.audits.length > 0 ? data.audits[data.audits.length - 1] : null;

  const trendPoints: TrendPoint[] = data.audits
    .filter((a) => a.healthScore !== null)
    .map((a) => ({
      label: a.startedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: a.healthScore as number,
    }));

  const hasAnything =
    data.auditCount > 0 || data.keywordCount > 0 || data.gradeCount > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <DashboardGreeting name={user.name ?? null} />

      {!hasAnything ? (
        <EmptyDashboard />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Sites tracked"
              value={String(data.siteCount)}
              hint={data.siteCount === 1 ? "project" : "projects"}
            />
            <StatCard
              label="Audits run"
              value={String(data.auditCount)}
              hint="all time"
            />
            <StatCard
              label="Open issues"
              value={String(data.openIssues)}
              hint="across all audits"
              tone={data.openIssues > 0 ? "warning" : "success"}
            />
            <StatCard
              label="Keyword searches"
              value={String(data.keywordCount)}
              hint="all time"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-foreground">
                  Site health over time
                </h2>
                {latestAudit && (
                  <span className="text-sm text-muted-foreground">
                    {hostnameOf(latestAudit.site.rootUrl)}
                  </span>
                )}
              </div>

              {trendPoints.length >= MIN_POINTS_FOR_TREND ? (
                <div className="mt-5">
                  <ScoreTrendChart
                    points={trendPoints}
                    ariaLabel={`Site health score across your last ${trendPoints.length} audits`}
                  />
                </div>
              ) : (
                <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background/60 px-6 py-10 text-center">
                  {latestAudit?.healthScore !== null && latestAudit ? (
                    <>
                      <HealthScoreDial score={latestAudit.healthScore ?? 0} size="lg" />
                      <p className="max-w-xs text-sm text-muted-foreground">
                        Run a few more audits and this becomes a trend line you can
                        actually track.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Run your first audit to start tracking site health.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Latest scores</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                <ToolScore
                  icon={Wrench}
                  label="Site Audit"
                  href="/audit"
                  score={latestAudit?.healthScore ?? null}
                  when={latestAudit?.startedAt ?? null}
                />
                <ToolScore
                  icon={FileSearch}
                  label="Content Grader"
                  href="/grader"
                  score={data.latestGrade?.score ?? null}
                  when={data.latestGrade?.createdAt ?? null}
                />
                <ToolScore
                  icon={MapPin}
                  label="Local Listing"
                  href="/local"
                  score={data.latestListing?.score ?? null}
                  when={data.latestListing?.createdAt ?? null}
                />
                <ToolScore
                  icon={Gauge}
                  label="Page Speed"
                  href="/speed"
                  score={data.latestSpeed?.mobileScore ?? null}
                  when={data.latestSpeed?.createdAt ?? null}
                  band="pagespeed"
                />
                <ToolScore
                  icon={Search}
                  label="Search clicks"
                  href="/search-console"
                  rawValue={
                    data.latestSearch
                      ? (data.latestSearch.totalClicks ?? 0).toLocaleString()
                      : null
                  }
                  when={data.latestSearch?.createdAt ?? null}
                />
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyDashboard() {
  const tools = [
    { icon: Wrench, label: "Run a site audit", href: "/audit", desc: "Find what's broken and how to fix it." },
    { icon: Lightbulb, label: "Find content ideas", href: "/keywords", desc: "Real phrases people search for." },
    { icon: Gauge, label: "Test your page speed", href: "/speed", desc: "Real Google PageSpeed scores." },
  ];

  return (
    <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-12">
      <h2 className="text-center text-lg font-bold text-foreground">
        Nothing here yet. Pick a place to start
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint">
              <tool.icon className="h-5 w-5 text-brand-strong" aria-hidden />
            </span>
            <span className="font-bold text-foreground">{tool.label}</span>
            <span className="text-sm text-muted-foreground">{tool.desc}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-strong">
              Start <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : "text-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1.5 text-3xl font-extrabold tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ToolScore({
  icon: Icon,
  label,
  href,
  score = null,
  rawValue = null,
  when,
  band,
}: {
  icon: typeof Wrench;
  label: string;
  href: string;
  score?: number | null;
  rawValue?: string | null;
  when: Date | null;
  band?: "pagespeed";
}) {
  const hasValue = score !== null || rawValue !== null;
  const color =
    score !== null && band === "pagespeed" ? pageSpeedBand(score).color : undefined;

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint">
          <Icon className="h-4 w-4 text-brand-strong" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {label}
          </span>
          <span className="block text-xs text-muted-foreground">
            {when ? formatRelativeTime(when.toISOString()) : "Not run yet"}
          </span>
        </span>
        {hasValue ? (
          <span
            className="shrink-0 text-lg font-extrabold tabular-nums text-foreground"
            style={color ? { color } : undefined}
          >
            {rawValue ?? score}
          </span>
        ) : (
          <TriangleAlert className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
        )}
      </Link>
    </li>
  );
}
