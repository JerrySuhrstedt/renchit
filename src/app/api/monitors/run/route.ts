import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDueMonitors } from "@/lib/monitor-runner";

/**
 * The endpoint a scheduler calls to check every site that is due.
 *
 * Vercel's Hobby plan runs cron once a day, which is useless for uptime, so
 * this is driven from outside: a Cloudflare Worker cron trigger, which is free
 * and runs every five minutes. See workers/monitor/.
 */

export const maxDuration = 60;

function authorized(header: string | null): boolean {
  const expected = process.env.MONITOR_SECRET;
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("x-monitor-secret"))) {
    // 404 rather than 401. Anyone who can hit this can make us fetch arbitrary
    // sites on a schedule, so it should not advertise that it exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const summary = await runDueMonitors();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[monitor] run failed", err);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
