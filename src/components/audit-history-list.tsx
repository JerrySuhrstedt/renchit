"use client";

import { useState } from "react";
import Link from "next/link";
import { HealthScoreDial } from "@/components/health-score-dial";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { formatRelativeTime, hostnameOf } from "@/lib/format";
import { Loader2, TriangleAlert, Wrench } from "lucide-react";

export type AuditListItem = {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  pagesCrawled: number;
  pageLimit: number;
  healthScore: number | null;
  errorMessage: string | null;
  openIssueCount: number;
  site: { id: string; rootUrl: string; name: string | null };
};

export function AuditHistoryList({ audits: initialAudits }: { audits: AuditListItem[] }) {
  const [audits, setAudits] = useState(initialAudits);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this audit? This can't be undone.")) return;
    setAudits((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/audits/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function handleStop(id: string) {
    if (!window.confirm("Stop this audit?")) return;
    setAudits((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: "failed", errorMessage: "Cancelled by you." }
          : a,
      ),
    );
    await fetch(`/api/audits/${id}/cancel`, { method: "POST" }).catch(() => {});
  }

  if (audits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
          <Wrench className="h-6 w-6 text-brand-strong" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            No audits yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Drop a URL in above and we&apos;ll crawl it, check it over, and
            hand you a health score with plain-English fixes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {audits.map((audit) => (
        <li key={audit.id}>
          <Link
            href={`/audits/${audit.id}`}
            className="group flex items-center gap-5 rounded-3xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(36,28,21,0.03)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-18px_rgba(36,28,21,0.35)] sm:px-6 sm:py-5"
          >
            <div className="shrink-0">
              {audit.status === "completed" && audit.healthScore !== null ? (
                <HealthScoreDial score={audit.healthScore} size="sm" />
              ) : audit.status === "failed" ? (
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
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-foreground">
                  {audit.site.name ?? hostnameOf(audit.site.rootUrl)}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {audit.status === "completed" &&
                  `${audit.openIssueCount} open issue${audit.openIssueCount === 1 ? "" : "s"} · ${formatRelativeTime(audit.completedAt ?? audit.startedAt)}`}
                {audit.status === "running" &&
                  `Crawling — ${audit.pagesCrawled}/${audit.pageLimit} pages`}
                {audit.status === "failed" &&
                  (audit.errorMessage ?? "Audit failed")}
              </p>
            </div>

            <RowActionsMenu
              onDelete={() => handleDelete(audit.id)}
              onStop={audit.status === "running" ? () => handleStop(audit.id) : undefined}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
