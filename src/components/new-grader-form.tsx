"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileSearch, ArrowRight, Loader2 } from "lucide-react";

export function NewGraderForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !keyword.trim()) {
      setError("Enter both a page URL and a target keyword.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/content-grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, targetKeyword: keyword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      router.push(`/grader/${data.gradeId}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(36,28,21,0.04),0_12px_32px_-16px_rgba(36,28,21,0.18)] sm:p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3 px-3 py-2">
            <FileSearch className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yoursite.com/blog-post"
              aria-label="Page URL to grade"
              className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-lg"
              disabled={loading}
            />
          </div>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div className="flex flex-1 items-center gap-3 px-3 py-2">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="target keyword"
              aria-label="Target keyword"
              className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-lg"
              disabled={loading}
            />
          </div>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 w-full rounded-2xl bg-brand-strong text-base font-semibold text-brand-foreground shadow-none hover:bg-brand-strong/90"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Grading page
            </>
          ) : (
            <>
              Grade this page
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {error ? (
        <p className="mt-3 px-2 text-sm font-medium text-critical">{error}</p>
      ) : (
        <p className="mt-3 px-2 text-sm text-muted-foreground">
          We&apos;ll check the page&apos;s title, headings, and content
          against your target keyword, done in a few seconds.
        </p>
      )}
    </form>
  );
}
