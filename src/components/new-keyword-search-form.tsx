"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, Loader2 } from "lucide-react";

export function NewKeywordSearchForm() {
  const router = useRouter();
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seed.trim()) {
      setError("Enter a topic or keyword to get started.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/keyword-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      router.push(`/keywords/${data.searchId}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(36,28,21,0.04),0_12px_32px_-16px_rgba(36,28,21,0.18)] sm:flex-row sm:items-center sm:p-2.5">
        <div className="flex flex-1 items-center gap-3 px-3 py-2">
          <Lightbulb className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="dj services, cold brew coffee, dog walking…"
            aria-label="Topic or keyword to research"
            className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-lg"
            disabled={loading}
          />
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
              Finding ideas
            </>
          ) : (
            <>
              Get content ideas
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {error ? (
        <p className="mt-3 px-2 text-sm font-medium text-critical">{error}</p>
      ) : (
        <p className="mt-3 px-2 text-sm text-muted-foreground">
          We&apos;ll pull real questions and phrases people search for around
          this topic — usually done in a couple seconds.
        </p>
      )}
    </form>
  );
}
