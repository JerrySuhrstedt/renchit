export type CoreWebVitalDTO = {
  key: "lcp" | "cls" | "tbt" | "fcp" | "speed-index";
  label: string;
  displayValue: string;
  band: "good" | "needs-improvement" | "poor";
};

export type PageSpeedOpportunityDTO = {
  key: string;
  title: string;
  description: string;
  savings: string | null;
};

export type PageSpeedStrategyResultDTO = {
  score: number;
  metrics: CoreWebVitalDTO[];
  opportunities: PageSpeedOpportunityDTO[];
};

export type PageSpeedCheckDTO = {
  id: string;
  url: string;
  status: "running" | "completed" | "failed";
  errorMessage: string | null;
  mobile: PageSpeedStrategyResultDTO | null;
  desktop: PageSpeedStrategyResultDTO | null;
  createdAt: string;
};

export const VITAL_BAND_META: Record<CoreWebVitalDTO["band"], { label: string; color: string; tint: string }> = {
  good: { label: "Good", color: "var(--success)", tint: "var(--success-tint)" },
  "needs-improvement": { label: "Needs improvement", color: "var(--warning)", tint: "var(--warning-tint)" },
  poor: { label: "Poor", color: "var(--critical)", tint: "var(--critical-tint)" },
};
