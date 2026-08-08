"use client";

import { IssueCard } from "@/components/issue-card";
import { CATEGORY_META, type Category } from "@/lib/format";
import type { IssueDTO, PageDTO } from "@/lib/audit-types";

const CATEGORY_ORDER: Category[] = [
  "technical",
  "meta",
  "content",
  "links",
  "performance",
];

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

export function IssueList({
  issues,
  pages,
  onStatusChange,
}: {
  issues: IssueDTO[];
  pages: PageDTO[];
  onStatusChange: (issueId: string, status: IssueDTO["status"]) => void;
}) {
  const pageById = new Map(pages.map((p) => [p.id, p]));

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    issues: issues
      .filter((i) => i.category === category)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
  })).filter((g) => g.issues.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-success/40 bg-success-tint px-8 py-14 text-center">
        <p className="text-lg font-bold text-success">
          Nothing left to fix here
        </p>
        <p className="mt-1 text-sm text-success/80">
          Every issue we found is resolved or dismissed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.category} className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_META[group.category].label}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {group.issues.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {group.issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                page={issue.pageId ? pageById.get(issue.pageId) : undefined}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
