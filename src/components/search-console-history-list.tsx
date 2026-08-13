"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleAlert, Search, MousePointerClick } from "lucide-react";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { formatRelativeTime } from "@/lib/format";
import { displayProperty } from "@/lib/search-console-types";

export type SearchConsoleHistoryItem = {
  id: string;
  propertyUrl: string;
  status: string;
  totalClicks: number | null;
  createdAt: string;
};

export function SearchConsoleHistoryList({
  reports: initialReports,
}: {
  reports: SearchConsoleHistoryItem[];
}) {
  const [reports, setReports] = useState(initialReports);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this report? This can't be undone.")) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/search-console/${id}`, { method: "DELETE" }).catch(() => {});
  }

  if (reports.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/search-console/${report.id}`}
            className="group flex items-center gap-5 rounded-3xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(36,28,21,0.03)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-18px_rgba(36,28,21,0.35)] sm:px-6 sm:py-5"
          >
            <div className="shrink-0">
              {report.status === "failed" ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-critical-tint">
                  <TriangleAlert className="h-6 w-6 text-critical" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
                  <Search className="h-6 w-6 text-brand-strong" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {displayProperty(report.propertyUrl)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                {report.status === "completed" && (
                  <>
                    <MousePointerClick className="h-3.5 w-3.5" />
                    {(report.totalClicks ?? 0).toLocaleString()} clicks ·{" "}
                    {formatRelativeTime(report.createdAt)}
                  </>
                )}
                {report.status === "running" && "Pulling data…"}
                {report.status === "failed" && "Report failed"}
              </p>
            </div>

            <RowActionsMenu onDelete={() => handleDelete(report.id)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
