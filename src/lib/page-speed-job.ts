import { db } from "./db";
import { checkPageSpeed } from "./page-speed";

const runningJobs = new Set<string>();

export function startPageSpeedJob(checkId: string, url: string) {
  if (runningJobs.has(checkId)) return;
  runningJobs.add(checkId);

  runPageSpeedJob(checkId, url)
    .catch(async (err) => {
      await db.pageSpeedCheck.updateMany({
        where: { id: checkId, status: "running" },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
    })
    .finally(() => {
      runningJobs.delete(checkId);
    });
}

async function runPageSpeedJob(checkId: string, url: string) {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    throw new Error("PageSpeed checks aren't configured yet. Missing PAGESPEED_API_KEY.");
  }

  const { mobile, desktop } = await checkPageSpeed(url, apiKey);

  await db.pageSpeedCheck.updateMany({
    where: { id: checkId, status: "running" },
    data: {
      status: "completed",
      mobileScore: mobile.score,
      desktopScore: desktop.score,
      mobileJson: JSON.stringify(mobile),
      desktopJson: JSON.stringify(desktop),
    },
  });
}
