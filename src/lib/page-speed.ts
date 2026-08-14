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

/**
 * What Google measured from actual visitors over the last 28 days, when the
 * site has enough traffic to qualify. Unlike the lab score this does not vary
 * between runs, because it is not a simulation: it is what happened.
 */
export type FieldMetric = {
  key: string;
  label: string;
  displayValue: string;
  band: "good" | "needs-improvement" | "poor";
};

export type PageSpeedStrategyResult = {
  score: number;
  metrics: CoreWebVital[];
  opportunities: PageSpeedOpportunity[];
  /** Null when the site has too little traffic for Google to report on. */
  field: { overall: "good" | "needs-improvement" | "poor"; metrics: FieldMetric[] } | null;
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

const FIELD_LABELS: Record<string, string> = {
  LARGEST_CONTENTFUL_PAINT_MS: "Loading, largest element",
  FIRST_CONTENTFUL_PAINT_MS: "First thing appears",
  CUMULATIVE_LAYOUT_SHIFT_SCORE: "Layout stability",
  INTERACTION_TO_NEXT_PAINT: "Responds to a tap",
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: "Server response",
};

function fieldBand(category: string | undefined): FieldMetric["band"] {
  if (category === "FAST") return "good";
  if (category === "AVERAGE") return "needs-improvement";
  return "poor";
}

function formatFieldValue(key: string, percentile: number): string {
  if (key === "CUMULATIVE_LAYOUT_SHIFT_SCORE") return (percentile / 100).toFixed(2);
  if (percentile >= 1000) return `${(percentile / 1000).toFixed(1)} s`;
  return `${percentile} ms`;
}

type LoadingExperience = {
  overall_category?: string;
  metrics?: Record<string, { percentile?: number; category?: string }>;
};

function parseField(le: LoadingExperience | undefined): PageSpeedStrategyResult["field"] {
  if (!le?.overall_category || !le.metrics) return null;
  const metrics: FieldMetric[] = [];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const m = le.metrics[key];
    if (!m || typeof m.percentile !== "number") continue;
    metrics.push({
      key,
      label,
      displayValue: formatFieldValue(key, m.percentile),
      band: fieldBand(m.category),
    });
  }
  if (metrics.length === 0) return null;
  return { overall: fieldBand(le.overall_category), metrics };
}

function stripMarkdownLinks(text: string): string {
  // Lighthouse audit descriptions include markdown-style links like
  // "[Learn more](https://...)"; strip them for plain display text.
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

  if (!data.lighthouseResult?.categories?.performance) {
    throw new Error(
      "Google ran the test but did not return a score for this page. This usually means the page was too slow to load in time. Try again in a minute.",
    );
  }

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

  return { score, metrics, opportunities, field: parseField(data.loadingExperience) };
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
