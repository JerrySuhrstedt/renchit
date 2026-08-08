export type Severity = "critical" | "warning" | "info";
export type Category = "technical" | "content" | "meta" | "links" | "performance";

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; tint: string }
> = {
  critical: { label: "Critical", color: "var(--critical)", tint: "var(--critical-tint)" },
  warning: { label: "Needs attention", color: "var(--warning)", tint: "var(--warning-tint)" },
  info: { label: "Worth a look", color: "var(--info)", tint: "var(--info-tint)" },
};

export const CATEGORY_META: Record<Category, { label: string }> = {
  technical: { label: "Technical" },
  content: { label: "Content" },
  meta: { label: "Titles & Meta" },
  links: { label: "Links" },
  performance: { label: "Performance" },
};

export function scoreBand(score: number): {
  label: string;
  color: string;
  tint: string;
} {
  if (score >= 80) return { label: "Healthy", color: "var(--success)", tint: "var(--success-tint)" };
  if (score >= 50) return { label: "Needs work", color: "var(--warning)", tint: "var(--warning-tint)" };
  return { label: "In trouble", color: "var(--critical)", tint: "var(--critical-tint)" };
}

export function formatRelativeTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
