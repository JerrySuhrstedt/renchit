import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * A number on the admin dashboard that goes somewhere.
 *
 * A count with no way through to the rows behind it just prompts the question
 * "which ones?", so every stat links to the filtered list that produced it.
 */
export function AdminStat({
  label,
  value,
  href,
  sub,
  tone = "plain",
}: {
  label: string;
  value: number;
  href: string;
  sub?: string;
  tone?: "plain" | "brand" | "warning";
}) {
  const valueColor =
    tone === "brand" ? "text-brand-strong" : tone === "warning" ? "text-warning" : "text-foreground";

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-brand"
    >
      <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        {label}
        <ArrowRight
          className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </span>
      <span className={`mt-1 text-3xl font-extrabold tracking-tight ${valueColor}`}>{value}</span>
      {sub && <span className="mt-0.5 text-xs text-muted-foreground">{sub}</span>}
    </Link>
  );
}

/** Filter chips shared by the admin list pages. */
export function FilterChips({
  options,
  active,
  basePath,
  param = "filter",
}: {
  options: Array<{ key: string; label: string; count: number }>;
  active: string;
  basePath: string;
  param?: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {options.map((o) => {
        const isActive = o.key === active;
        const href = o.key === "all" ? basePath : `${basePath}?${param}=${o.key}`;
        return (
          <Link
            key={o.key}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-brand-strong text-brand-foreground"
                : "border border-border text-muted-foreground hover:border-brand hover:text-brand-strong"
            }`}
          >
            {o.label}
            <span className={isActive ? "opacity-80" : "opacity-60"}>{o.count}</span>
          </Link>
        );
      })}
    </div>
  );
}
