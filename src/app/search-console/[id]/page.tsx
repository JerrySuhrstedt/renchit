import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { SearchConsoleResultsView } from "@/components/search-console-results-view";
import type {
  SearchConsolePayloadDTO,
  SearchConsoleReportDTO,
  SearchPageRowDTO,
} from "@/lib/search-console-types";

export const dynamic = "force-dynamic";

export default async function SearchConsoleReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const report = await db.searchConsoleReport.findFirst({
    where: { id, userId: user.id },
  });

  if (!report) notFound();

  if (report.status === "failed") {
    return (
      <>
        <SiteHeader />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-critical-tint">
            <TriangleAlert className="h-6 w-6 text-critical" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            We couldn&apos;t pull this report
          </h1>
          <p className="text-sm text-muted-foreground">
            {report.errorMessage ?? "Something went wrong reaching Search Console."}
          </p>
          <Link
            href="/search-console"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search Console
          </Link>
        </div>
      </>
    );
  }

  const payload: SearchConsolePayloadDTO | null = report.queriesJson
    ? JSON.parse(report.queriesJson)
    : null;
  const pages: SearchPageRowDTO[] = report.pagesJson ? JSON.parse(report.pagesJson) : [];

  const dto: SearchConsoleReportDTO = {
    id: report.id,
    propertyUrl: report.propertyUrl,
    status: report.status as SearchConsoleReportDTO["status"],
    errorMessage: report.errorMessage,
    totalClicks: report.totalClicks,
    totalImpressions: report.totalImpressions,
    avgPosition: report.avgPosition,
    queries: payload?.queries ?? [],
    opportunities: payload?.opportunities ?? [],
    pages,
    startDate: payload?.startDate ?? null,
    endDate: payload?.endDate ?? null,
    createdAt: report.createdAt.toISOString(),
  };

  return (
    <>
      <SiteHeader />
      <SearchConsoleResultsView report={dto} />
    </>
  );
}
