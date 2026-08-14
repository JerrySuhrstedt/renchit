/**
 * Cloudflare Worker that drives renchit's uptime checks.
 *
 * Vercel's Hobby plan runs cron once a day, which is useless for monitoring.
 * Cloudflare Workers run cron triggers every minute on the free plan, so this
 * tiny worker exists purely to poke renchit on a schedule.
 *
 * Deploy:
 *   1. Cloudflare dashboard > Workers & Pages > Create > Worker
 *   2. Paste this in, deploy
 *   3. Settings > Variables > add MONITOR_SECRET (same value as in Vercel)
 *   4. Settings > Triggers > Cron Triggers > add:  every 5 minutes
 *
 * Nothing here is secret except the variable, which Cloudflare stores encrypted.
 */

const ENDPOINT = "https://www.renchit.com/api/monitors/run";

const worker = {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },

  // Also reachable by hand for a one-off check while setting this up.
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/run") {
      return new Response("renchit monitor worker", { status: 200 });
    }
    const result = await run(env);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

export default worker;

async function run(env) {
  if (!env.MONITOR_SECRET) {
    return { error: "MONITOR_SECRET is not set on this worker" };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-monitor-secret": env.MONITOR_SECRET,
      },
    });
    const body = await res.text();
    console.log("renchit monitor run:", res.status, body);
    return { status: res.status, body };
  } catch (err) {
    console.error("renchit monitor run failed", err);
    return { error: String(err) };
  }
}
