"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Floating "Report a problem" button, present on every signed-in page.
 *
 * Kept to one click and one text box on purpose. Every extra required field is
 * a reason not to bother, and a vague report still beats silence. Everything
 * useful for debugging is captured automatically instead of being asked for.
 */

const KINDS = [
  { key: "bug", label: "Something broke" },
  { key: "confusing", label: "Confusing" },
  { key: "idea", label: "Idea" },
  { key: "praise", label: "Nice work" },
] as const;

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setSent(false);
    setMessage("");
    setKind("bug");
    setError(null);
  }

  async function submit() {
    if (!message.trim()) {
      setError("Tell us what happened first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message,
          pageUrl: window.location.href,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not send that. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg transition-colors hover:border-brand hover:text-brand-strong"
      >
        <MessageSquarePlus className="h-4 w-4" aria-hidden />
        Report a problem
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(24rem,calc(100vw-2.5rem))] rounded-3xl border border-border bg-card p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-foreground">
          {sent ? "Thank you" : "What happened?"}
        </h2>
        <button
          type="button"
          onClick={reset}
          aria-label="Close"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {sent ? (
        <div className="mt-3 flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Got it, and we can see exactly which page you were on. If it needs a
            reply we will email you.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  kind === k.key
                    ? "bg-brand-strong text-brand-foreground"
                    : "border border-border text-muted-foreground hover:border-brand hover:text-brand-strong"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            autoFocus
            placeholder="What were you trying to do, and what happened instead?"
            className="mt-3 w-full resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
          />

          <p className="mt-1.5 text-xs text-muted-foreground">
            We automatically include the page you are on, so you do not have to
            describe where you were.
          </p>

          {error && <p className="mt-2 text-sm font-semibold text-critical">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-strong px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </button>
        </>
      )}

      <p className="mt-2 text-center text-xs text-muted-foreground">{pathname}</p>
    </div>
  );
}
