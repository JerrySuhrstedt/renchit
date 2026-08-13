"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { PageSpeedProgressView } from "@/components/page-speed-progress-view";
import { PageSpeedResultsView } from "@/components/page-speed-results-view";
import type { PageSpeedCheckDTO } from "@/lib/page-speed-types";

const POLL_INTERVAL_MS = 2000;

export function PageSpeedPageClient({ initialCheck }: { initialCheck: PageSpeedCheckDTO }) {
  const [check, setCheck] = useState<PageSpeedCheckDTO>(initialCheck);

  useEffect(() => {
    if (check.status !== "running") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/page-speed/${check.id}`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) setCheck(data.check);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [check.status, check.id]);

  if (check.status === "failed") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-critical-tint">
          <TriangleAlert className="h-6 w-6 text-critical" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          We couldn&apos;t test this page
        </h1>
        <p className="text-sm text-muted-foreground">
          {check.errorMessage ?? "Something went wrong running the speed test."}
        </p>
        <Link
          href="/speed"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to page speed
        </Link>
      </div>
    );
  }

  if (check.status === "running") {
    return <PageSpeedProgressView url={check.url} />;
  }

  return <PageSpeedResultsView check={check} />;
}
