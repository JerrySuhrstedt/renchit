import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

type ProfileUpdateBody = {
  name?: string;
  company?: string;
  linkedinUrl?: string;
};

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

export async function PATCH(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: ProfileUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const linkedinUrl = cleanText(body.linkedinUrl, 300);
  if (linkedinUrl && !/^https?:\/\/([\w-]+\.)?linkedin\.com\//i.test(linkedinUrl)) {
    return NextResponse.json(
      { error: "LinkedIn URL must be a linkedin.com link" },
      { status: 400 },
    );
  }

  const user = await db.user.update({
    where: { id: userId },
    data: {
      name: cleanText(body.name, 100),
      company: cleanText(body.company, 100),
      linkedinUrl,
    },
    select: { name: true, company: true, linkedinUrl: true },
  });

  return NextResponse.json({ user });
}
