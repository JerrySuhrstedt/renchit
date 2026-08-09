import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { HealthScoreDial } from "@/components/health-score-dial";
import { hostnameOf } from "@/lib/format";
import {
  LISTING_CATEGORY_META,
  type ListingCategoryDTO,
  type LocalListingDTO,
} from "@/lib/local-listing-types";

const CATEGORY_ORDER: ListingCategoryDTO[] = [
  "nap",
  "structured-data",
  "discoverability",
  "reputation",
];

const SEVERITY_META: Record<string, { color: string; tint: string }> = {
  critical: { color: "var(--critical)", tint: "var(--critical-tint)" },
  warning: { color: "var(--warning)", tint: "var(--warning-tint)" },
  info: { color: "var(--info)", tint: "var(--info-tint)" },
};

export function LocalListingResultsView({ listing }: { listing: LocalListingDTO }) {
  const passedCount = listing.checks.filter((c) => c.passed).length;

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    checks: listing.checks.filter((c) => c.category === category),
  })).filter((g) => g.checks.length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-8 sm:px-8">
      <Link
        href="/local"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All checks
      </Link>

      <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-10 text-center sm:px-10">
        <HealthScoreDial score={listing.score ?? 0} size="lg" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {listing.businessName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hostnameOf(listing.websiteUrl)}
            {" · "}
            {passedCount} of {listing.checks.length} checks passed
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {groups.map((group) => (
          <div key={group.category} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {LISTING_CATEGORY_META[group.category].label}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {group.checks.filter((c) => c.passed).length}/{group.checks.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {group.checks.map((check) => {
                const meta = check.passed
                  ? { color: "var(--success)", tint: "var(--success-tint)" }
                  : SEVERITY_META[check.severity];
                return (
                  <div
                    key={check.key}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5"
                  >
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: meta.tint }}
                    >
                      {check.passed ? (
                        <Check className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      ) : (
                        <X className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        {check.title}
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {check.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
