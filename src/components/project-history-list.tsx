import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { HealthScoreDial } from "@/components/health-score-dial";
import { hostnameOf, formatRelativeTime } from "@/lib/format";

export type ProjectListItem = {
  id: string;
  rootUrl: string;
  name: string | null;
  createdAt: string;
  latestHealthScore: number | null;
  auditCount: number;
  contentGradeCount: number;
  lastActivityAt: string;
};

export function ProjectHistoryList({ projects }: { projects: ProjectListItem[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
        <Image
          src="/brand/sumolab-mark-orange.svg"
          alt=""
          width={40}
          height={38}
          className="h-10 w-auto opacity-90"
        />
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            No projects yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Run a site audit or grade a page and we&apos;ll automatically
            create a project for that website here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className="group flex items-center gap-5 rounded-3xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(36,28,21,0.03)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-18px_rgba(36,28,21,0.35)] sm:px-6 sm:py-5"
          >
            <div className="shrink-0">
              {project.latestHealthScore !== null ? (
                <HealthScoreDial score={project.latestHealthScore} size="sm" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint">
                  <Image
                    src="/brand/sumolab-mark-orange.svg"
                    alt=""
                    width={24}
                    height={22}
                    className="h-6 w-auto"
                  />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {project.name ?? hostnameOf(project.rootUrl)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {project.auditCount} audit{project.auditCount === 1 ? "" : "s"} ·{" "}
                {project.contentGradeCount} page
                {project.contentGradeCount === 1 ? "" : "s"} graded ·{" "}
                {formatRelativeTime(project.lastActivityAt)}
              </p>
            </div>

            <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-strong" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
