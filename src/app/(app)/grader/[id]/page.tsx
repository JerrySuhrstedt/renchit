import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { GraderResultsView } from "@/components/grader-results-view";
import type { ContentGradeDTO } from "@/lib/grader-types";

export const dynamic = "force-dynamic";

export default async function GraderResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const grade = await db.contentGrade.findFirst({ where: { id, userId: user.id } });

  if (!grade) notFound();

  if (grade.status === "failed") {
    return (
      <>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-critical-tint">
            <TriangleAlert className="h-6 w-6 text-critical" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            We couldn&apos;t grade this page
          </h1>
          <p className="text-sm text-muted-foreground">
            {grade.errorMessage ?? "Something went wrong fetching that page."}
          </p>
          <Link
            href="/grader"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to content grader
          </Link>
        </div>
      </>
    );
  }

  const dto: ContentGradeDTO = {
    id: grade.id,
    url: grade.url,
    targetKeyword: grade.targetKeyword,
    status: grade.status as ContentGradeDTO["status"],
    errorMessage: grade.errorMessage,
    score: grade.score,
    wordCount: grade.wordCount,
    checks: grade.checksJson ? JSON.parse(grade.checksJson) : [],
    createdAt: grade.createdAt.toISOString(),
  };

  return (
    <>
      <GraderResultsView grade={dto} />
    </>
  );
}
