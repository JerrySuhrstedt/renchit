"use client";

import { useState } from "react";
import { OctagonX, Wrench } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { hostnameOf } from "@/lib/format";

const STEPS = [
  "Fetching pages",
  "Reading titles & meta tags",
  "Checking links",
  "Scoring content",
];

export function AuditProgressView({
  auditId,
  rootUrl,
  pagesCrawled,
  pageLimit,
}: {
  auditId: string;
  rootUrl: string;
  pagesCrawled: number;
  pageLimit: number;
}) {
  const [stopping, setStopping] = useState(false);
  const pct = pageLimit > 0 ? Math.min(100, (pagesCrawled / pageLimit) * 100) : 0;
  const stepIndex = Math.min(
    STEPS.length - 1,
    Math.floor((pct / 100) * STEPS.length),
  );

  async function handleStop() {
    if (!window.confirm("Stop this audit?")) return;
    setStopping(true);
    await fetch(`/api/audits/${auditId}/cancel`, { method: "POST" }).catch(() => {});
    // The parent's poll (every 1.5s) will pick up the "failed"/cancelled
    // status and swap to the failed view; no local state needed here.
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 px-5 py-24 text-center">
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 animate-pulse rounded-full bg-brand-tint blur-xl"
          aria-hidden
        />
        <Wrench
          className="h-14 w-14 text-brand-strong animate-[spin_3.5s_linear_infinite]"
          aria-hidden
        />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Auditing {hostnameOf(rootUrl)}
        </h1>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {STEPS[stepIndex]}…
        </p>
      </div>

      <div className="w-full space-y-2">
        <Progress value={pct} className="h-2.5" />
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {pagesCrawled} of {pageLimit} pages checked
        </p>
      </div>

      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-critical/40 hover:text-critical disabled:opacity-50"
      >
        <OctagonX className="h-4 w-4" />
        {stopping ? "Stopping…" : "Stop audit"}
      </button>
    </div>
  );
}
