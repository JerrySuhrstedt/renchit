const API_BASE = "https://www.googleapis.com/webmasters/v3";
const FETCH_TIMEOUT_MS = 20_000;
const LOOKBACK_DAYS = 28;
// Search Console data lags roughly 2-3 days behind, so asking for "today"
// mostly returns empty rows. Ending the window a few days back gives a
// complete picture instead of a misleadingly quiet one.
const DATA_LAG_DAYS = 3;

// A query sitting on page 2 is the classic "almost there" win — already
// ranking, just below where anyone clicks.
const OPPORTUNITY_MIN_POSITION = 11;
const OPPORTUNITY_MAX_POSITION = 20;

export type SearchQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type SearchConsoleProperty = {
  siteUrl: string;
  permissionLevel: string;
};

export type SearchConsoleReportResult = {
  propertyUrl: string;
  startDate: string;
  endDate: string;
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  queries: SearchQueryRow[];
  pages: SearchPageRow[];
  opportunities: SearchQueryRow[];
};

type ApiRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function gscFetch(path: string, accessToken: string, body?: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      payload?.error?.message ?? `Search Console API responded with ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

export async function listProperties(accessToken: string): Promise<SearchConsoleProperty[]> {
  const data = await gscFetch("/sites", accessToken);
  const entries: { siteUrl?: string; permissionLevel?: string }[] = data.siteEntry ?? [];
  return entries
    .filter((e) => e.siteUrl)
    .map((e) => ({
      siteUrl: e.siteUrl as string,
      permissionLevel: e.permissionLevel ?? "unknown",
    }))
    // siteUnverifiedUser means they can see it exists but get no data from it.
    .filter((e) => e.permissionLevel !== "siteUnverifiedUser");
}

export async function fetchSearchConsoleReport(
  accessToken: string,
  propertyUrl: string,
): Promise<SearchConsoleReportResult> {
  const end = new Date();
  end.setDate(end.getDate() - DATA_LAG_DAYS);
  const start = new Date(end);
  start.setDate(start.getDate() - (LOOKBACK_DAYS - 1));

  const startDate = formatDate(start);
  const endDate = formatDate(end);
  const encoded = encodeURIComponent(propertyUrl);
  const queryPath = `/sites/${encoded}/searchAnalytics/query`;

  const [totalsData, queryData, pageData] = await Promise.all([
    gscFetch(queryPath, accessToken, { startDate, endDate }),
    gscFetch(queryPath, accessToken, {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 100,
    }),
    gscFetch(queryPath, accessToken, {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 25,
    }),
  ]);

  const totalsRow: ApiRow = totalsData.rows?.[0] ?? {};

  const queries: SearchQueryRow[] = (queryData.rows ?? []).map((r: ApiRow) => ({
    query: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));

  const pages: SearchPageRow[] = (pageData.rows ?? []).map((r: ApiRow) => ({
    page: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    position: r.position ?? 0,
  }));

  const opportunities = queries
    .filter(
      (q) =>
        q.position >= OPPORTUNITY_MIN_POSITION && q.position <= OPPORTUNITY_MAX_POSITION,
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  return {
    propertyUrl,
    startDate,
    endDate,
    totalClicks: totalsRow.clicks ?? 0,
    totalImpressions: totalsRow.impressions ?? 0,
    avgPosition: totalsRow.position ?? 0,
    queries: queries.slice(0, 50),
    pages,
    opportunities,
  };
}
