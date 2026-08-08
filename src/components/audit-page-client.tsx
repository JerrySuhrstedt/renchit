"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { AuditProgressView } from "@/components/audit-progress-view";
import { AuditResultsView } from "@/components/audit-results-view";
import type { AuditDTO } from "@/lib/audit-types";

const POLL_INTERVAL_MS = 1500;

export function AuditPageClient({ initialAudit }: { initialAudit: AuditDTO }) {
  const [audit, setAudit] = useState<AuditDTO>(initialAudit);

  useEffect(() => {
    if (audit.status !== "running") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/audits/${audit.id}`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) setAudit(data.audit);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [audit.status, audit.id]);

  if (audit.status === "failed") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-critical-tint">
          <TriangleAlert className="h-6 w-6 text-critical" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          We couldn&apos;t finish this audit
        </h1>
        <p className="text-sm text-muted-foreground">
          {audit.errorMessage ??
            "Something went wrong while crawling this site."}
        </p>
        <Link
          href="/audit"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (audit.status === "running") {
    return (
      <AuditProgressView
        rootUrl={audit.site.rootUrl}
        pagesCrawled={audit.pagesCrawled}
        pageLimit={audit.pageLimit}
      />
    );
  }

  return <AuditResultsView audit={audit} />;
}
