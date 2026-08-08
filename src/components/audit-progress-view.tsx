"use client";

import { Wrench } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { hostnameOf } from "@/lib/format";

const STEPS = [
  "Fetching pages",
  "Reading titles & meta tags",
  "Checking links",
  "Scoring content",
];

export function AuditProgressView({
  rootUrl,
  pagesCrawled,
  pageLimit,
}: {
  rootUrl: string;
  pagesCrawled: number;
  pageLimit: number;
}) {
  const pct = pageLimit > 0 ? Math.min(100, (pagesCrawled / pageLimit) * 100) : 0;
  const stepIndex = Math.min(
    STEPS.length - 1,
    Math.floor((pct / 100) * STEPS.length),
  );

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
    </div>
  );
}
