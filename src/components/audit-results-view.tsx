"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { HealthScoreDial } from "@/components/health-score-dial";
import { IssueList } from "@/components/issue-list";
import { hostnameOf, formatRelativeTime } from "@/lib/format";
import type { AuditDTO, IssueDTO } from "@/lib/audit-types";

export function AuditResultsView({ audit }: { audit: AuditDTO }) {
  const router = useRouter();
  const [issues, setIssues] = useState<IssueDTO[]>(audit.issues);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [rerunning, setRerunning] = useState(false);

  function handleStatusChange(issueId: string, status: IssueDTO["status"]) {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status } : i)),
    );
  }

  const visibleIssues = useMemo(
    () => (filter === "open" ? issues.filter((i) => i.status === "open") : issues),
    [issues, filter],
  );

  const counts = useMemo(() => {
    const open = issues.filter((i) => i.status === "open");
    return {
      critical: open.filter((i) => i.severity === "critical").length,
      warning: open.filter((i) => i.severity === "warning").length,
      info: open.filter((i) => i.severity === "info").length,
      resolved: issues.filter((i) => i.status === "resolved").length,
    };
  }, [issues]);

  async function handleRerun() {
    setRerunning(true);
    const res = await fetch("/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: audit.site.rootUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/audits/${data.auditId}`);
    } else {
      setRerunning(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-8 sm:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All audits
      </Link>

      <div className="mt-6 flex flex-col items-center gap-6 rounded-3xl border border-border bg-card px-6 py-10 text-center sm:px-10">
        <HealthScoreDial score={audit.healthScore ?? 0} size="lg" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {hostnameOf(audit.site.rootUrl)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {audit.pagesCrawled} pages checked ·{" "}
            {formatRelativeTime(audit.completedAt ?? audit.startedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <CountPill color="var(--critical)" tint="var(--critical-tint)" label="critical" count={counts.critical} />
          <CountPill color="var(--warning)" tint="var(--warning-tint)" label="to review" count={counts.warning} />
          <CountPill color="var(--info)" tint="var(--info-tint)" label="minor" count={counts.info} />
          {counts.resolved > 0 && (
            <CountPill color="var(--success)" tint="var(--success-tint)" label="fixed" count={counts.resolved} />
          )}
        </div>

        <button
          type="button"
          onClick={handleRerun}
          disabled={rerunning}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand-strong disabled:opacity-50"
        >
          <RotateCw className={`h-4 w-4 ${rerunning ? "animate-spin" : ""}`} />
          {rerunning ? "Starting new audit…" : "Re-run this audit"}
        </button>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Issues</h2>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <FilterTab active={filter === "open"} onClick={() => setFilter("open")}>
            Open
          </FilterTab>
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
            All ({issues.length})
          </FilterTab>
        </div>
      </div>

      <div className="mt-4">
        <IssueList
          issues={visibleIssues}
          pages={audit.pages}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}

function CountPill({
  color,
  tint,
  label,
  count,
}: {
  color: string;
  tint: string;
  label: string;
  count: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
      style={{ backgroundColor: tint, color }}
    >
      <span className="tabular-nums">{count}</span> {label}
    </span>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-brand-strong text-brand-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
