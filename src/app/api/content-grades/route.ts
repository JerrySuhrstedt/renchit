import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { gradeContent } from "@/lib/content-grader";

export async function GET() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const grades = await db.contentGrade.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({
    grades: grades.map((g) => ({
      id: g.id,
      url: g.url,
      targetKeyword: g.targetKeyword,
      status: g.status,
      score: g.score,
      createdAt: g.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: { url?: string; targetKeyword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const url = body.url?.trim();
  const targetKeyword = body.targetKeyword?.trim();

  if (!url) {
    return NextResponse.json({ error: "A page URL is required" }, { status: 400 });
  }
  if (!targetKeyword) {
    return NextResponse.json({ error: "A target keyword is required" }, { status: 400 });
  }

  let siteId: string | undefined;
  try {
    const origin = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin;
    const site = await db.site.upsert({
      where: { userId_rootUrl: { userId, rootUrl: origin } },
      update: {},
      create: { rootUrl: origin, userId },
    });
    siteId = site.id;
  } catch {
    // invalid URL; gradeContent below will surface the real error
  }

  const grade = await db.contentGrade.create({
    data: { url, targetKeyword, status: "running", userId, siteId },
  });

  try {
    const result = await gradeContent(url, targetKeyword);
    await db.contentGrade.update({
      where: { id: grade.id },
      data: {
        status: "completed",
        score: result.score,
        wordCount: result.wordCount,
        checksJson: JSON.stringify(result.checks),
      },
    });
  } catch (err) {
    await db.contentGrade.update({
      where: { id: grade.id },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }

  return NextResponse.json({ gradeId: grade.id }, { status: 201 });
}
