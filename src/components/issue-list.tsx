"use client";

import { IssueTypeGroup } from "@/components/issue-type-group";
import { CATEGORY_META, type Category } from "@/lib/format";
import type { IssueDTO, PageDTO } from "@/lib/audit-types";

export const CATEGORY_ORDER: Category[] = [
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

  const categoryGroups = CATEGORY_ORDER.map((category) => {
    const categoryIssues = issues.filter((i) => i.category === category);

    const byType = new Map<string, IssueDTO[]>();
    for (const issue of categoryIssues) {
      const list = byType.get(issue.type) ?? [];
      list.push(issue);
      byType.set(issue.type, list);
    }

    const typeGroups = [...byType.values()]
      .map((group) => ({
        group,
        worstSeverity: Math.min(...group.map((i) => SEVERITY_ORDER[i.severity])),
      }))
      .sort((a, b) => a.worstSeverity - b.worstSeverity)
      .map((g) => g.group);

    return { category, issues: categoryIssues, typeGroups };
  }).filter((g) => g.issues.length > 0);

  if (categoryGroups.length === 0) {
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
      {categoryGroups.map((group) => (
        <div key={group.category} id={`category-${group.category}`} className="flex scroll-mt-24 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_META[group.category].label}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {group.issues.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {group.typeGroups.map((typeIssues) => (
              <IssueTypeGroup
                key={typeIssues[0].type}
                issues={typeIssues}
                pageById={pageById}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
