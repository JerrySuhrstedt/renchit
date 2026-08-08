"use client";

import { useState, useTransition } from "react";
import { Wrench, Check, EyeOff, RotateCcw, ExternalLink, ChevronDown, Download } from "lucide-react";
import { SEVERITY_META } from "@/lib/format";
import type { IssueDTO, PageDTO } from "@/lib/audit-types";

export function IssueTypeGroup({
  issues,
  pageById,
  onStatusChange,
}: {
  issues: IssueDTO[];
  pageById: Map<string, PageDTO>;
  onStatusChange: (issueId: string, status: IssueDTO["status"]) => void;
}) {
  const [open, setOpen] = useState(issues.length <= 1);
  const first = issues[0];
  const meta = SEVERITY_META[first.severity];
  const openCount = issues.filter((i) => i.status === "open").length;

  async function bulkResolve() {
    const targets = issues.filter((i) => i.status === "open");
    for (const issue of targets) {
      onStatusChange(issue.id, "resolved");
    }
    await Promise.all(
      targets.map((issue) =>
        fetch(`/api/issues/${issue.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "resolved" }),
        }).catch(() => {}),
      ),
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
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
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {issues.length} page{issues.length === 1 ? "" : "s"}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold text-foreground">
            {first.title}
          </h3>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="flex items-start gap-2 rounded-xl bg-secondary/70 px-3.5 py-3">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden />
            <p className="text-sm leading-relaxed text-foreground">
              {first.fixSteps}
            </p>
          </div>

          {issues.length > 1 && openCount > 1 && (
            <button
              type="button"
              onClick={bulkResolve}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-success hover:text-success"
            >
              <Check className="h-3 w-3" />
              Mark all {openCount} as fixed
            </button>
          )}

          <div className="mt-4 flex flex-col divide-y divide-border">
            {issues.map((issue) => (
              <IssueInstanceRow
                key={issue.id}
                issue={issue}
                page={issue.pageId ? pageById.get(issue.pageId) : undefined}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssueInstanceRow({
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
    <div className={`flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 ${resolved || ignored ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-foreground">
          {issue.description}
        </p>
        {page && (
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-brand-strong"
          >
            <ExternalLink className="h-3 w-3" />
            {page.url}
          </a>
        )}
        {issue.type === "large-image" && issue.affectedUrl && (
          <a
            href={`/api/images/optimize?issueId=${issue.id}`}
            className="mt-1.5 flex w-fit items-center gap-1.5 rounded-full border border-brand/30 bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-strong transition-colors hover:border-brand"
          >
            <Download className="h-3 w-3" />
            Download optimized version
          </a>
        )}
        {resolved && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success-tint px-2 py-0.5 text-xs font-semibold text-success">
            <Check className="h-3 w-3" /> Fixed
          </span>
        )}
        {ignored && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            <EyeOff className="h-3 w-3" /> Ignored
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!resolved && (
          <button
            type="button"
            disabled={pending}
            onClick={() => updateStatus("resolved")}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-success hover:text-success disabled:opacity-50"
          >
            <Check className="h-3 w-3" /> Fixed
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
  );
}
