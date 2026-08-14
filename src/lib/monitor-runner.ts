import { db } from "./db";
import { buildAlert, notifyAll, type Recipient } from "./notify";

/**
 * The uptime checker.
 *
 * The hard part of monitoring is not noticing a site is down, it is not crying
 * wolf. Networks blip, servers hiccup, and a checker that emails on every
 * single failed request trains people to ignore it within a week. So a site is
 * only "down" after several consecutive failures, and an alert only fires when
 * the state actually changes, never on every check while it stays down.
 */

/** Consecutive failures before we believe it. */
const FAILURES_BEFORE_DOWN = 3;

/** Generous: a slow site is not a down site. */
const CHECK_TIMEOUT_MS = 15_000;

/** How many monitors one run will handle, so a run cannot outlive its window. */
const MAX_PER_RUN = 50;

const USER_AGENT = "RenchitMonitor/1.0 (+https://www.renchit.com)";

export type CheckOutcome = {
  ok: boolean;
  statusCode: number | null;
  responseMs: number;
  error: string | null;
};

export async function probe(url: string): Promise<CheckOutcome> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    // GET rather than HEAD: plenty of sites answer HEAD incorrectly, and a
    // false "down" alert at 3am is far worse than a slightly heavier request.
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    return {
      // 4xx and 5xx both count as down: a customer landing on a 404 homepage
      // does not care which side of the number it fell on.
      ok: res.ok,
      statusCode: res.status,
      responseMs: Date.now() - started,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? `No response within ${CHECK_TIMEOUT_MS / 1000} seconds`
        : err instanceof Error
          ? err.message
          : "Could not connect";
    return { ok: false, statusCode: null, responseMs: Date.now() - started, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export type RunSummary = {
  checked: number;
  wentDown: number;
  recovered: number;
  notificationsSent: number;
};

/** Checks every monitor that is due, and alerts on state changes only. */
export async function runDueMonitors(now = new Date()): Promise<RunSummary> {
  const candidates = await db.monitor.findMany({
    where: { enabled: true },
    orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } },
    take: MAX_PER_RUN,
    include: {
      user: {
        select: {
          alertRecipients: {
            select: {
              name: true,
              email: true,
              phone: true,
              emailEnabled: true,
              smsEnabled: true,
            },
          },
        },
      },
    },
  });

  // Filtered here rather than in SQL: "due" depends on each monitor's own
  // interval, which is awkward to express as a single where clause.
  const due = candidates.filter((m) => {
    if (!m.lastCheckedAt) return true;
    return now.getTime() - m.lastCheckedAt.getTime() >= m.intervalMinutes * 60_000;
  });

  const summary: RunSummary = { checked: 0, wentDown: 0, recovered: 0, notificationsSent: 0 };

  for (const monitor of due) {
    const outcome = await probe(monitor.url);
    summary.checked += 1;

    const failures = outcome.ok ? 0 : monitor.consecutiveFailures + 1;
    const nextStatus = outcome.ok
      ? "up"
      : failures >= FAILURES_BEFORE_DOWN
        ? "down"
        : monitor.status;

    const changed = nextStatus !== monitor.status && monitor.status !== "unknown";
    const firstResult = monitor.status === "unknown";

    await db.monitor.update({
      where: { id: monitor.id },
      data: {
        status: nextStatus,
        consecutiveFailures: failures,
        lastCheckedAt: now,
        lastStatusCode: outcome.statusCode,
        lastResponseMs: outcome.responseMs,
        lastError: outcome.error,
        ...(nextStatus !== monitor.status ? { lastChangedAt: now } : {}),
      },
    });

    // Nothing to say unless the state actually flipped. A site that has been
    // down for an hour should have produced exactly one alert, not twelve.
    // The very first check is also silent: telling someone their site is up
    // the moment they add it is noise, and telling them it is down before we
    // have confirmed it would be crying wolf.
    if (!changed || firstResult) continue;

    const downtimeMinutes =
      nextStatus === "up" && monitor.lastChangedAt
        ? Math.max(1, Math.round((now.getTime() - monitor.lastChangedAt.getTime()) / 60_000))
        : null;

    const recipients: Recipient[] = monitor.user.alertRecipients;
    const message = buildAlert({
      kind: nextStatus === "down" ? "down" : "recovered",
      url: monitor.url,
      statusCode: outcome.statusCode,
      error: outcome.error,
      downtimeMinutes,
    });

    const sent = recipients.length > 0 ? await notifyAll(recipients, message) : 0;

    await db.alertEvent.create({
      data: {
        monitorId: monitor.id,
        kind: nextStatus === "down" ? "down" : "recovered",
        statusCode: outcome.statusCode,
        error: outcome.error,
        downtimeMinutes,
        notified: sent,
      },
    });

    if (nextStatus === "down") summary.wentDown += 1;
    else summary.recovered += 1;
    summary.notificationsSent += sent;
  }

  return summary;
}
