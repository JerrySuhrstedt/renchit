"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import { TOOLS, type ToolKey } from "@/lib/plans";

export function BillingActions({
  hasStripeCustomer,
  isPaid,
  isLifetime,
}: {
  hasStripeCustomer: boolean;
  isPaid: boolean;
  isLifetime: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not open the billing portal.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex flex-wrap gap-3">
        {!isPaid && (
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-2xl bg-brand-strong px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90"
          >
            See plans
          </Link>
        )}

        {hasStripeCustomer && (
          <button
            type="button"
            onClick={openPortal}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand-strong disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {isLifetime ? "View invoices" : "Manage subscription"}
                <ExternalLink className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {hasStripeCustomer && !isLifetime && (
        <p className="text-xs text-muted-foreground">
          Change your card, switch plan, download invoices, or cancel. Handled
          securely by Stripe.
        </p>
      )}

      {error && <p className="text-sm font-semibold text-critical">{error}</p>}
    </div>
  );
}

export function FreeToolPicker({
  current,
  switchableAt,
}: {
  current: ToolKey | null;
  switchableAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<ToolKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = switchableAt !== null;

  async function pick(tool: ToolKey) {
    if (tool === current) return;
    setBusy(tool);
    setError(null);
    try {
      const res = await fetch("/api/billing/free-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not change your tool.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {locked && (
        <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
          You can switch again on{" "}
          <strong className="text-foreground">
            {new Date(switchableAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </strong>
          .
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const active = tool.key === current;
          return (
            <button
              key={tool.key}
              type="button"
              onClick={() => pick(tool.key)}
              disabled={locked || busy !== null || active}
              className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors ${
                active
                  ? "border-brand bg-brand-tint"
                  : "border-border hover:border-brand disabled:hover:border-border"
              } disabled:cursor-not-allowed ${locked && !active ? "opacity-50" : ""}`}
            >
              <span className="flex w-full items-center justify-between gap-2 text-sm font-bold text-foreground">
                {tool.name}
                {busy === tool.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {active && (
                  <span className="rounded-full bg-brand-strong px-2 py-0.5 text-xs font-bold text-brand-foreground">
                    Yours
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{tool.blurb}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-critical">{error}</p>}
    </>
  );
}
