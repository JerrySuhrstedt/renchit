import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";

const MAX_WIDTH = 1920;
const OUTPUT_QUALITY = 75;
const FETCH_TIMEOUT_MS = 15_000;

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").pop() || "image";
    return base.replace(/\.[^.]+$/, "");
  } catch {
    return "image";
  }
}

export async function GET(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const issueId = new URL(request.url).searchParams.get("issueId");
  if (!issueId) {
    return NextResponse.json({ error: "issueId is required" }, { status: 400 });
  }

  const dbIssue = await db.issue.findFirst({
    where: { id: issueId, type: "large-image", audit: { site: { userId } } },
    select: { affectedUrl: true },
  });
  if (!dbIssue?.affectedUrl) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let sourceRes: Response;
  try {
    sourceRes = await fetch(dbIssue.affectedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "RenchitBot/1.0" },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the image" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  if (!sourceRes.ok) {
    return NextResponse.json({ error: "Couldn't reach the image" }, { status: 502 });
  }

  const originalBuffer = Buffer.from(await sourceRes.arrayBuffer());

  let optimized: Buffer;
  try {
    optimized = await sharp(originalBuffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: OUTPUT_QUALITY })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "This file isn't a format we can resize" },
      { status: 415 },
    );
  }

  const filename = `${filenameFromUrl(dbIssue.affectedUrl)}-optimized.webp`;

  return new NextResponse(new Uint8Array(optimized), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(optimized.byteLength),
    },
  });
}
