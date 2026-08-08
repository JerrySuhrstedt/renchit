"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, TriangleAlert, FileSearch } from "lucide-react";
import { HealthScoreDial } from "@/components/health-score-dial";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { hostnameOf, formatRelativeTime } from "@/lib/format";

export type GraderHistoryItem = {
  id: string;
  url: string;
  targetKeyword: string;
  status: string;
  score: number | null;
  createdAt: string;
};

export function GraderHistoryList({ grades: initialGrades }: { grades: GraderHistoryItem[] }) {
  const [grades, setGrades] = useState(initialGrades);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this grade? This can't be undone.")) return;
    setGrades((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/content-grades/${id}`, { method: "DELETE" }).catch(() => {});
  }

  if (grades.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
          <FileSearch className="h-6 w-6 text-brand-strong" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            No pages graded yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Enter a page URL and a target keyword above to get a score and a
            checklist of exactly what to fix.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {grades.map((grade) => (
        <li key={grade.id}>
          <Link
            href={`/grader/${grade.id}`}
            className="group flex items-center gap-5 rounded-3xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(36,28,21,0.03)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-18px_rgba(36,28,21,0.35)] sm:px-6 sm:py-5"
          >
            <div className="shrink-0">
              {grade.status === "completed" && grade.score !== null ? (
                <HealthScoreDial score={grade.score} size="sm" />
              ) : grade.status === "failed" ? (
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
                {hostnameOf(grade.url)}
                {new URL(grade.url).pathname !== "/" && new URL(grade.url).pathname}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {grade.status === "completed" &&
                  `Target: "${grade.targetKeyword}" · ${formatRelativeTime(grade.createdAt)}`}
                {grade.status === "running" && "Grading…"}
                {grade.status === "failed" && "Grading failed"}
              </p>
            </div>

            <RowActionsMenu onDelete={() => handleDelete(grade.id)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
