import Link from "next/link";
import { ArrowLeft, TrendingUp, MousePointerClick, Eye, ArrowUpRight } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import {
  displayProperty,
  type SearchConsoleReportDTO,
  type SearchQueryRowDTO,
} from "@/lib/search-console-types";

function formatPosition(position: number): string {
  return position > 0 ? position.toFixed(1) : "-";
}

function formatPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function SearchConsoleResultsView({ report }: { report: SearchConsoleReportDTO }) {
  const hasData = (report.totalImpressions ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-8 sm:px-8">
      <Link
        href="/search-console"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All reports
      </Link>

      <div className="mt-6 flex flex-col gap-6 rounded-3xl border border-border bg-card px-6 py-8 sm:px-10">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {displayProperty(report.propertyUrl)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.startDate && report.endDate
              ? `${report.startDate} to ${report.endDate} · pulled ${formatRelativeTime(report.createdAt)}`
              : formatRelativeTime(report.createdAt)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatTile
            icon={MousePointerClick}
            label="Clicks"
            value={(report.totalClicks ?? 0).toLocaleString()}
          />
          <StatTile
            icon={Eye}
            label="Impressions"
            value={(report.totalImpressions ?? 0).toLocaleString()}
          />
          <StatTile
            icon={TrendingUp}
            label="Avg. position"
            value={formatPosition(report.avgPosition ?? 0)}
          />
        </div>
      </div>

      {!hasData ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-14 text-center">
          <p className="text-lg font-bold text-foreground">
            No search data for this period
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Google didn&apos;t record any impressions for this property in the
            last 28 days. That usually means the site is very new, was verified
            recently, or isn&apos;t being indexed yet.
          </p>
        </div>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="text-lg font-bold text-foreground">
              Your closest wins
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These are phrases you already rank for on page 2, positions 11 to
              20. Almost nobody scrolls to page 2, so nudging any of these up a
              few spots is the fastest traffic you can get.
            </p>

            {report.opportunities.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-8 text-center text-sm text-muted-foreground">
                Nothing sitting on page 2 right now. Either you&apos;re already
                on page 1 for your main phrases, or there isn&apos;t enough data
                yet to tell.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                {report.opportunities.map((row) => (
                  <OpportunityRow key={row.query} row={row} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-bold text-foreground">
              What people searched to find you
            </h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Search phrase</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                    <th className="px-4 py-3 text-right">Shown</th>
                    <th className="px-4 py-3 text-right">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {report.queries.slice(0, 25).map((row) => (
                    <tr key={row.query} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.query}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {row.clicks.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {row.impressions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatPosition(row.position)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {report.pages.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-bold text-foreground">
                Your top pages in search
              </h2>
              <div className="mt-4 flex flex-col gap-2.5">
                {report.pages.slice(0, 10).map((row) => (
                  <div
                    key={row.page}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <a
                      href={row.page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground hover:text-brand-strong"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{row.page}</span>
                    </a>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {row.clicks.toLocaleString()} click
                      {row.clicks === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function OpportunityRow({ row }: { row: SearchQueryRowDTO }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-tint/40 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{row.query}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Shown {row.impressions.toLocaleString()} time
          {row.impressions === 1 ? "" : "s"} · {row.clicks} click
          {row.clicks === 1 ? "" : "s"} ({formatPct(row.ctr)})
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-brand-strong px-3 py-1.5 text-sm font-bold tabular-nums text-brand-foreground">
        #{formatPosition(row.position)}
      </span>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-secondary/60 px-3 py-4 text-center">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="text-xl font-extrabold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
