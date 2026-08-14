"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, TriangleAlert, Gauge, Smartphone, Monitor } from "lucide-react";
import { HealthScoreDial } from "@/components/health-score-dial";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { hostnameOf, formatRelativeTime, pageSpeedBand } from "@/lib/format";

export type PageSpeedHistoryItem = {
  id: string;
  url: string;
  status: string;
  mobileScore: number | null;
  desktopScore: number | null;
  createdAt: string;
};

export function PageSpeedHistoryList({
  checks: initialChecks,
}: {
  checks: PageSpeedHistoryItem[];
}) {
  const [checks, setChecks] = useState(initialChecks);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this speed test? This can't be undone.")) return;
    setChecks((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/page-speed/${id}`, { method: "DELETE" }).catch(() => {});
  }

  if (checks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
          <Gauge className="h-6 w-6 text-brand-strong" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            No page speed tests yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Enter a page URL above to see its real mobile and desktop
            PageSpeed score.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {checks.map((check) => (
        <li key={check.id}>
          <Link
            href={`/speed/${check.id}`}
            className="group flex items-center gap-5 rounded-3xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(36,28,21,0.03)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-18px_rgba(36,28,21,0.35)] sm:px-6 sm:py-5"
          >
            <div className="shrink-0">
              {check.status === "completed" ? (
                <div className="flex items-center gap-4">
                  <ScoreDial label="Mobile" icon={Smartphone} score={check.mobileScore} />
                  <ScoreDial label="Desktop" icon={Monitor} score={check.desktopScore} />
                </div>
              ) : check.status === "failed" ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-critical-tint">
                  <TriangleAlert className="h-6 w-6 text-critical" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-strong" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {hostnameOf(check.url)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {check.status === "completed" && formatRelativeTime(check.createdAt)}
                {check.status === "running" && "Testing…"}
                {check.status === "failed" && "Test failed"}
              </p>
            </div>

            <RowActionsMenu onDelete={() => handleDelete(check.id)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * One score with its platform underneath.
 *
 * A dash rather than a hidden dial when a score is missing: an absent dial
 * silently changes the row's shape, which reads as a layout bug rather than
 * as "we do not have that number".
 */
function ScoreDial({
  label,
  icon: Icon,
  score,
}: {
  label: string;
  icon: typeof Smartphone;
  score: number | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {score === null ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border text-sm text-muted-foreground">
          &ndash;
        </div>
      ) : (
        <HealthScoreDial score={score} size="sm" band={pageSpeedBand(score)} />
      )}
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </span>
    </div>
  );
}
