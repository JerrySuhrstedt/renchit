import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { generateKeywordIdeas } from "@/lib/keyword-ideas";

export async function GET() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const searches = await db.keywordSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: {
      _count: { select: { ideas: true } },
    },
  });

  return NextResponse.json({
    searches: searches.map((s) => ({
      id: s.id,
      seed: s.seed,
      status: s.status,
      createdAt: s.createdAt,
      ideaCount: s._count.ideas,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: { seed?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const seed = body.seed?.trim();
  if (!seed) {
    return NextResponse.json({ error: "Enter a topic or keyword" }, { status: 400 });
  }
  if (seed.length > 100) {
    return NextResponse.json({ error: "Keep it under 100 characters" }, { status: 400 });
  }

  const search = await db.keywordSearch.create({
    data: { seed, status: "running", userId },
  });

  try {
    const ideas = await generateKeywordIdeas(seed);

    await db.$transaction([
      db.keywordIdea.createMany({
        data: ideas.map((i) => ({
          searchId: search.id,
          phrase: i.phrase,
          category: i.category,
        })),
      }),
      db.keywordSearch.update({
        where: { id: search.id },
        data: { status: "completed" },
      }),
    ]);
  } catch {
    await db.keywordSearch.update({
      where: { id: search.id },
      data: { status: "failed" },
    });
  }

  return NextResponse.json({ searchId: search.id }, { status: 201 });
}
