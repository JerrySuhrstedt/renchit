"use client";

import { Check, X } from "lucide-react";
import { HealthScoreDial } from "@/components/health-score-dial";

const SAMPLE_CHECKS = [
  { label: "Title tag includes your keyword", passed: true },
  { label: "3 images missing alt text", passed: false },
  { label: "Page loads in under 2 seconds", passed: true },
];

export function LandingHeroPreview() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-2 shadow-[0_1px_2px_rgba(36,28,21,0.04),0_24px_60px_-24px_rgba(36,28,21,0.28)]">
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-critical/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
        <span className="ml-2 truncate rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          yoursite.com
        </span>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-background px-6 py-8">
        <HealthScoreDial score={78} size="lg" />
        <div className="flex w-full flex-col gap-2">
          {SAMPLE_CHECKS.map((check) => (
            <div
              key={check.label}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  check.passed ? "bg-success-tint" : "bg-critical-tint"
                }`}
              >
                {check.passed ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <X className="h-3 w-3 text-critical" />
                )}
              </span>
              <span className="text-sm font-medium text-foreground">
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
