export type SearchQueryRowDTO = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchPageRowDTO = {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type SearchConsolePayloadDTO = {
  startDate: string;
  endDate: string;
  queries: SearchQueryRowDTO[];
  opportunities: SearchQueryRowDTO[];
};

export type SearchConsoleReportDTO = {
  id: string;
  propertyUrl: string;
  status: "running" | "completed" | "failed";
  errorMessage: string | null;
  totalClicks: number | null;
  totalImpressions: number | null;
  avgPosition: number | null;
  queries: SearchQueryRowDTO[];
  pages: SearchPageRowDTO[];
  opportunities: SearchQueryRowDTO[];
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

/** Strips the "sc-domain:" prefix so domain properties read like plain domains. */
export function displayProperty(propertyUrl: string): string {
  if (propertyUrl.startsWith("sc-domain:")) return propertyUrl.slice("sc-domain:".length);
  try {
    return new URL(propertyUrl).hostname;
  } catch {
    return propertyUrl;
  }
}
