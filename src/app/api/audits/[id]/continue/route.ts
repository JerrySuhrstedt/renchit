import { NextResponse, after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runAuditChunk, continuationSecret } from "@/lib/audit-job";

/**
 * Continues a chunked crawl.
 *
 * Called by the worker, never by a browser. A fresh invocation is the entire
 * point: it comes with a fresh time budget, which is what lets a crawl outlive
 * the platform's function ceiling.
 */

export const maxDuration = 60;

function authorized(header: string | null): boolean {
  if (!header) return false;
  const expected = continuationSecret();
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // Length must match before timingSafeEqual, which throws otherwise, and the
  // comparison is constant-time so the secret cannot be guessed a byte at a
  // time from response timings.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorized(request.headers.get("x-audit-worker"))) {
    // 404 rather than 401: this endpoint is not for the public and there is no
    // reason to confirm it exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;

  let body: { rootUrl?: string; pageLimit?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.rootUrl) {
    return NextResponse.json({ error: "rootUrl is required" }, { status: 400 });
  }

  // Respond immediately and keep working. The caller is another chunk of this
  // same job, and it should not sit waiting on us: that would chain the two
  // invocations' budgets together and defeat the point.
  const rootUrl = body.rootUrl;
  const pageLimit = body.pageLimit ?? 100;
  after(() => runAuditChunk(id, rootUrl, pageLimit));

  return NextResponse.json({ continuing: true }, { status: 202 });
}
