import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { startPageSpeedJob } from "@/lib/page-speed-job";

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "A page URL is required" }, { status: 400 });
  }

  let url: string;
  let siteId: string | undefined;
  try {
    url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).toString();
    const origin = new URL(url).origin;
    const site = await db.site.upsert({
      where: { userId_rootUrl: { userId, rootUrl: origin } },
      update: {},
      create: { rootUrl: origin, userId },
    });
    siteId = site.id;
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }

  const check = await db.pageSpeedCheck.create({
    data: { url, status: "running", userId, siteId },
  });

  // after() keeps this work running past the response on Vercel's serverless
  // runtime — PageSpeed Insights typically takes 10-30s per strategy.
  after(() => startPageSpeedJob(check.id, url));

  return NextResponse.json({ checkId: check.id }, { status: 202 });
}
