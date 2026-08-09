"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, TriangleAlert, MapPin } from "lucide-react";
import { HealthScoreDial } from "@/components/health-score-dial";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { formatRelativeTime } from "@/lib/format";

export type LocalListingHistoryItem = {
  id: string;
  websiteUrl: string;
  businessName: string;
  status: string;
  score: number | null;
  createdAt: string;
};

export function LocalListingHistoryList({
  listings: initialListings,
}: {
  listings: LocalListingHistoryItem[];
}) {
  const [listings, setListings] = useState(initialListings);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this check? This can't be undone.")) return;
    setListings((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/local-listings/${id}`, { method: "DELETE" }).catch(() => {});
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
          <MapPin className="h-6 w-6 text-brand-strong" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            No local listings checked yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Enter your business details above to see how consistent your
            website is with your Google listing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {listings.map((listing) => (
        <li key={listing.id}>
          <Link
            href={`/local/${listing.id}`}
            className="group flex items-center gap-5 rounded-3xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(36,28,21,0.03)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-18px_rgba(36,28,21,0.35)] sm:px-6 sm:py-5"
          >
            <div className="shrink-0">
              {listing.status === "completed" && listing.score !== null ? (
                <HealthScoreDial score={listing.score} size="sm" />
              ) : listing.status === "failed" ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-critical-tint">
                  <TriangleAlert className="h-6 w-6 text-critical" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-strong" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {listing.businessName}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {listing.status === "completed" && formatRelativeTime(listing.createdAt)}
                {listing.status === "running" && "Checking…"}
                {listing.status === "failed" && "Check failed"}
              </p>
            </div>

            <RowActionsMenu onDelete={() => handleDelete(listing.id)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
