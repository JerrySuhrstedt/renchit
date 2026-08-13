import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { getSearchConsoleAccessToken } from "@/lib/google-token";
import { fetchSearchConsoleReport } from "@/lib/search-console";

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: { propertyUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const propertyUrl = body.propertyUrl?.trim();
  if (!propertyUrl) {
    return NextResponse.json({ error: "Pick a Search Console property" }, { status: 400 });
  }

  const token = await getSearchConsoleAccessToken(userId);
  if (!token.ok) {
    return NextResponse.json(
      { error: "Reconnect your Google account to run this report." },
      { status: 403 },
    );
  }

  // Link the report to a Site where we can derive one, so it shows up under
  // the same project as that domain's audits and grades.
  let siteId: string | undefined;
  try {
    const host = propertyUrl.startsWith("sc-domain:")
      ? `https://${propertyUrl.slice("sc-domain:".length)}`
      : new URL(propertyUrl).origin;
    const site = await db.site.upsert({
      where: { userId_rootUrl: { userId, rootUrl: host } },
      update: {},
      create: { rootUrl: host, userId },
    });
    siteId = site.id;
  } catch {
    // Non-fatal; the report still stands on its own without a Site link.
  }

  const report = await db.searchConsoleReport.create({
    data: { propertyUrl, status: "running", userId, siteId },
  });

  try {
    const result = await fetchSearchConsoleReport(token.accessToken, propertyUrl);
    await db.searchConsoleReport.update({
      where: { id: report.id },
      data: {
        status: "completed",
        totalClicks: Math.round(result.totalClicks),
        totalImpressions: Math.round(result.totalImpressions),
        avgPosition: result.avgPosition,
        queriesJson: JSON.stringify({
          startDate: result.startDate,
          endDate: result.endDate,
          queries: result.queries,
          opportunities: result.opportunities,
        }),
        pagesJson: JSON.stringify(result.pages),
      },
    });
  } catch (err) {
    await db.searchConsoleReport.update({
      where: { id: report.id },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }

  return NextResponse.json({ reportId: report.id }, { status: 201 });
}
