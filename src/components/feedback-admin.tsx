"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

const NEXT_STATUS: Record<string, string> = {
  new: "triaged",
  triaged: "done",
  done: "new",
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-brand-strong text-brand-foreground",
  triaged: "bg-warning-tint text-warning",
  done: "bg-success-tint text-success",
};

export function FeedbackRow({
  id,
  kind,
  message,
  status: initialStatus,
  who,
  plan,
  pageUrl,
  viewport,
  userAgent,
  at,
}: {
  id: string;
  kind: string;
  message: string;
  status: string;
  who: string;
  plan: string | null;
  pageUrl: string | null;
  viewport: string | null;
  userAgent: string | null;
  at: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function cycleStatus() {
    const next = NEXT_STATUS[status] ?? "new";
    setBusy(true);
    // Optimistic: this is a single-admin triage list, so a failed write is
    // better corrected by the refresh below than by blocking the click.
    setStatus(next);
    try {
      await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={`rounded-2xl border bg-card px-5 py-4 ${
        status === "new" ? "border-brand/50" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-foreground">{kind}</span>
          <button
            type="button"
            onClick={cycleStatus}
            disabled={busy}
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition-opacity disabled:opacity-50 ${
              STATUS_STYLE[status] ?? "bg-secondary text-muted-foreground"
            }`}
          >
            {status}
          </button>
        </div>
        <span className="text-xs text-muted-foreground">{at}</span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{message}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{who}</span>
        {plan && <span>· {plan}</span>}
        {pageUrl && <span className="truncate">· {pageUrl.replace(/^https?:\/\/[^/]+/, "")}</span>}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 hover:text-foreground"
        >
          details
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <dl className="mt-2 grid gap-1 rounded-xl bg-secondary px-3.5 py-2.5 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-semibold">Page</dt>
            <dd className="break-all">{pageUrl ?? "unknown"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-semibold">Viewport</dt>
            <dd>{viewport ?? "unknown"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-semibold">Browser</dt>
            <dd className="break-all">{userAgent ?? "unknown"}</dd>
          </div>
        </dl>
      )}
    </li>
  );
}
