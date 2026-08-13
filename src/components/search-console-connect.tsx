"use client";

import { useState } from "react";
import { Search, Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectSearchConsole } from "@/app/(app)/search-console/actions";

const HELP_EMAIL = `Hi, I'm setting up an SEO tool for our website and it needs access to our Google Search Console.

Could you either:
1) Verify our site at search.google.com/search-console, or
2) If it's already set up, add me as a user so I can see it?

Thanks!`;

export function SearchConsoleConnect() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-border bg-card/60 px-8 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
        <Search className="h-6 w-6 text-brand-strong" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-foreground">
          Connect Google Search Console
        </p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          See the actual phrases people search to find you, where you rank for
          each one, and which ones you&apos;re closest to winning. This is real
          data from Google about your site, and we only ever read it.
        </p>
      </div>
      <form action={connectSearchConsole}>
        <Button
          type="submit"
          size="lg"
          className="h-11 rounded-2xl bg-brand-strong px-6 text-base font-semibold text-brand-foreground shadow-none hover:bg-brand-strong/90"
        >
          Connect Search Console
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <NeedHelp />
    </div>
  );
}

/**
 * Shown alongside the connect button and on the empty-properties state. The
 * two places someone gets stuck because the fix lives outside this app.
 */
export function NeedHelp() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    await navigator.clipboard.writeText(HELP_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <details className="w-full max-w-md text-left">
      <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground hover:text-foreground">
        Don&apos;t have Search Console set up?
      </summary>
      <div className="mt-3 space-y-3 rounded-2xl bg-secondary/60 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Search Console is a free Google tool, but your site has to be
          verified before it collects data. Often whoever built your site has
          already done this, so you may just need them to add you.
        </p>
        <button
          type="button"
          onClick={copyEmail}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand-strong"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy an email to your web person
            </>
          )}
        </button>
      </div>
    </details>
  );
}
