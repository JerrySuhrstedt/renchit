const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const FETCH_TIMEOUT_MS = 45_000;

export type CoreWebVital = {
  key: "lcp" | "cls" | "tbt" | "fcp" | "speed-index";
  label: string;
  displayValue: string;
  band: "good" | "needs-improvement" | "poor";
};

export type PageSpeedOpportunity = {
  key: string;
  title: string;
  description: string;
  savings: string | null;
};

export type PageSpeedStrategyResult = {
  score: number;
  metrics: CoreWebVital[];
  opportunities: PageSpeedOpportunity[];
};

type LighthouseAudit = {
  score: number | null;
  displayValue?: string;
  title?: string;
  description?: string;
  details?: { type?: string; overallSavingsMs?: number };
};

function metricBand(score: number | null): CoreWebVital["band"] {
  if (score === null) return "poor";
  if (score >= 0.9) return "good";
  if (score >= 0.5) return "needs-improvement";
  return "poor";
}

function stripMarkdownLinks(text: string): string {
  // Lighthouse audit descriptions include markdown-style links like
  // "[Learn more](https://...)" — strip them for plain display text.
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

async function fetchStrategy(
  url: string,
  strategy: "mobile" | "desktop",
  apiKey: string,
): Promise<PageSpeedStrategyResult> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
    key: apiKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? `PageSpeed API responded with ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  const audits: Record<string, LighthouseAudit> = data.lighthouseResult?.audits ?? {};
  const score = Math.round((data.lighthouseResult?.categories?.performance?.score ?? 0) * 100);

  const metricDefs: { key: CoreWebVital["key"]; auditId: string; label: string }[] = [
    { key: "lcp", auditId: "largest-contentful-paint", label: "Largest Contentful Paint" },
    { key: "cls", auditId: "cumulative-layout-shift", label: "Cumulative Layout Shift" },
    { key: "tbt", auditId: "total-blocking-time", label: "Total Blocking Time" },
    { key: "fcp", auditId: "first-contentful-paint", label: "First Contentful Paint" },
    { key: "speed-index", auditId: "speed-index", label: "Speed Index" },
  ];

  const metrics: CoreWebVital[] = metricDefs
    .map(({ key, auditId, label }) => {
      const audit = audits[auditId];
      if (!audit?.displayValue) return null;
      return {
        key,
        label,
        displayValue: audit.displayValue,
        band: metricBand(audit.score),
      };
    })
    .filter((m): m is CoreWebVital => m !== null);

  const opportunities: PageSpeedOpportunity[] = Object.entries(audits)
    .filter(([, audit]) => audit.details?.type === "opportunity" && (audit.score ?? 1) < 0.9)
    .sort((a, b) => (b[1].details?.overallSavingsMs ?? 0) - (a[1].details?.overallSavingsMs ?? 0))
    .slice(0, 6)
    .map(([key, audit]) => {
      const savingsMs = audit.details?.overallSavingsMs;
      return {
        key,
        title: audit.title ?? key,
        description: stripMarkdownLinks(audit.description ?? ""),
        savings: savingsMs && savingsMs > 0 ? `Potential savings: ${(savingsMs / 1000).toFixed(1)}s` : null,
      };
    });

  return { score, metrics, opportunities };
}

export async function checkPageSpeed(
  rawUrl: string,
  apiKey: string,
): Promise<{ mobile: PageSpeedStrategyResult; desktop: PageSpeedStrategyResult }> {
  const url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).toString();

  const [mobile, desktop] = await Promise.all([
    fetchStrategy(url, "mobile", apiKey),
    fetchStrategy(url, "desktop", apiKey),
  ]);

  return { mobile, desktop };
}
