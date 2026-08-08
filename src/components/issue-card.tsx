"use client";

import { useState, useTransition } from "react";
import { Wrench, Check, EyeOff, RotateCcw, ExternalLink } from "lucide-react";
import { SEVERITY_META } from "@/lib/format";
import type { IssueDTO, PageDTO } from "@/lib/audit-types";

export function IssueCard({
  issue,
  page,
  onStatusChange,
}: {
  issue: IssueDTO;
  page: PageDTO | undefined;
  onStatusChange: (issueId: string, status: IssueDTO["status"]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState(issue.status);
  const meta = SEVERITY_META[issue.severity];

  function updateStatus(status: IssueDTO["status"]) {
    setOptimisticStatus(status);
    startTransition(async () => {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        onStatusChange(issue.id, status);
      } else {
        setOptimisticStatus(issue.status);
      }
    });
  }

  const resolved = optimisticStatus === "resolved";
  const ignored = optimisticStatus === "ignored";

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 transition-opacity ${
        resolved || ignored ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: meta.tint, color: meta.color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: meta.color }}
              aria-hidden
            />
            {meta.label}
          </span>
          {resolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-1 text-xs font-semibold text-success">
              <Check className="h-3 w-3" /> Fixed
            </span>
          )}
          {ignored && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              <EyeOff className="h-3 w-3" /> Ignored
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!resolved && (
            <button
              type="button"
              disabled={pending}
              onClick={() => updateStatus("resolved")}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-success hover:text-success disabled:opacity-50"
            >
              <Check className="h-3 w-3" /> Mark fixed
            </button>
          )}
          {!ignored && !resolved && (
            <button
              type="button"
              disabled={pending}
              onClick={() => updateStatus("ignored")}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 disabled:opacity-50"
            >
              <EyeOff className="h-3 w-3" /> Ignore
            </button>
          )}
          {(resolved || ignored) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => updateStatus("open")}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-brand hover:text-brand-strong disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" /> Reopen
            </button>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-base font-bold text-foreground">
        {issue.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {issue.description}
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/70 px-3.5 py-3">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden />
        <p className="text-sm leading-relaxed text-foreground">
          {issue.fixSteps}
        </p>
      </div>

      {page && (
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-brand-strong"
        >
          <ExternalLink className="h-3 w-3" />
          {page.url}
        </a>
      )}
    </div>
  );
}
