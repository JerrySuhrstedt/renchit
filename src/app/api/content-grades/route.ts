import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gradeContent } from "@/lib/content-grader";

export async function GET() {
  const grades = await db.contentGrade.findMany({
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

  const grade = await db.contentGrade.create({
    data: { url, targetKeyword, status: "running" },
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
