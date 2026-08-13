"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NeedHelp } from "@/components/search-console-connect";
import { displayProperty } from "@/lib/search-console-types";

type Property = { siteUrl: string; permissionLevel: string };

export function NewSearchConsoleForm() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/search-console/properties", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: Property[] = data.properties ?? [];
        setProperties(list);
        if (list.length > 0) setSelected(list[0].siteUrl);
      })
      .catch(() => {
        if (!cancelled) setProperties([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyUrl: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      router.push(`/search-console/${data.reportId}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  if (properties === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-card px-6 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your Search Console properties…
      </div>
    );
  }

  // Connected fine, but Google returned nothing. Two very different causes and
  // we genuinely can't tell them apart, so name both rather than guess.
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-tint">
          <TriangleAlert className="h-6 w-6 text-warning" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            No Search Console properties on this account
          </p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Either your site isn&apos;t set up in Search Console yet, or it&apos;s
            set up under a different Google account than the one you signed in
            with — that second one is very common if someone else built your
            site.
          </p>
        </div>
        <NeedHelp />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(36,28,21,0.04),0_12px_32px_-16px_rgba(36,28,21,0.18)] sm:flex-row sm:items-center sm:p-2.5">
        <div className="flex flex-1 items-center gap-3 px-3 py-2">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loading}
            aria-label="Search Console property"
            className="h-11 w-full min-w-0 border-0 bg-transparent text-base outline-none md:text-lg"
          >
            {properties.map((p) => (
              <option key={p.siteUrl} value={p.siteUrl}>
                {displayProperty(p.siteUrl)}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 rounded-2xl bg-brand-strong px-6 text-base font-semibold text-brand-foreground shadow-none hover:bg-brand-strong/90 sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Pulling data
            </>
          ) : (
            <>
              See my search data
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {error ? (
        <p className="mt-3 px-2 text-sm font-medium text-critical">{error}</p>
      ) : (
        <p className="mt-3 px-2 text-sm text-muted-foreground">
          We&apos;ll pull the last 28 days of real search data from Google —
          what people searched, and where you showed up.
        </p>
      )}
    </form>
  );
}
