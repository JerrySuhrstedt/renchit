"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, ArrowRight, Loader2 } from "lucide-react";
import { startCheckout } from "@/lib/paddle-checkout";
import {
  ALL_FEATURES,
  LIFETIME_SEATS,
  PLANS,
  PRICING_ORDER,
  TRIAL_DAYS,
  monitoringLabel,
  siteLimitLabel,
  toolAccessLabel,
  type BillingInterval,
  type PlanKey,
} from "@/lib/plans";

export function PricingTiers() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PlanKey, interval: BillingInterval) {
    if (plan === "free") {
      router.push("/sign-in");
      return;
    }

    setBusy(plan);
    setError(null);

    const result = await startCheckout(plan, interval);
    // Not signed in yet: send them to sign in, then straight back here.
    if (!result.ok && result.reason === "signed-out") {
      router.push(`/sign-in?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    if (!result.ok) setError(result.message);
    setBusy(null);
  }

  return (
    <>
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <BillingTab active={!annual} onClick={() => setAnnual(false)}>
            Monthly
          </BillingTab>
          <BillingTab active={annual} onClick={() => setAnnual(true)}>
            Annual
            <span className="ml-1.5 rounded-full bg-success-tint px-2 py-0.5 text-xs font-bold text-success">
              2 months free
            </span>
          </BillingTab>
        </div>
      </div>

      {error && (
        <p className="mt-6 text-center text-sm font-semibold text-critical">{error}</p>
      )}

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PRICING_ORDER.map((key) => {
          const tier = PLANS[key];
          const isFree = key === "free";
          const price = annual ? tier.annual : tier.monthly;
          const highlighted = key === "starter";

          return (
            <div
              key={key}
              className={`relative flex flex-col rounded-3xl border bg-card p-6 ${
                highlighted
                  ? "border-brand shadow-[0_12px_32px_-16px_rgba(196,61,28,0.35)]"
                  : "border-border"
              }`}
            >
              {highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-strong px-3 py-1 text-xs font-bold text-brand-foreground">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-muted-foreground">{tier.blurb}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">
                  ${price}
                </span>
                {!isFree && (
                  <span className="text-sm text-muted-foreground">
                    /{annual ? "year" : "month"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isFree
                  ? "Free forever, no card required"
                  : annual
                    ? `Works out to $${((tier.annual ?? 0) / 12).toFixed(2)}/month`
                    : `or $${tier.annual}/year`}
              </p>

              <button
                type="button"
                disabled={busy !== null}
                onClick={() => choose(key, annual ? "year" : "month")}
                className={`mt-5 inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  highlighted
                    ? "bg-brand-strong text-brand-foreground hover:bg-brand-strong/90"
                    : "border border-border text-foreground hover:border-brand hover:text-brand-strong"
                }`}
              >
                {busy === key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isFree ? `Start ${TRIAL_DAYS}-day free trial` : `Choose ${tier.name}`}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <ul className="mt-6 flex flex-col gap-2.5 border-t border-border pt-5">
                <Feature emphasis>{siteLimitLabel(tier)}</Feature>
                <Feature emphasis>{toolAccessLabel(tier)}</Feature>
                <Feature muted={tier.monitoring === "none"}>
                  {monitoringLabel(tier.monitoring)}
                </Feature>
                {ALL_FEATURES.map((feature) => (
                  <Feature key={feature}>{feature}</Feature>
                ))}
                <Feature>{tier.support}</Feature>
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** The Founding Member lifetime deal, sold separately below the grid. */
export function LifetimeOffer({ seatsLeft }: { seatsLeft: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const tier = PLANS.lifetime;
  const soldOut = seatsLeft <= 0;

  async function buy() {
    setBusy(true);
    setError(null);

    const result = await startCheckout("lifetime", "once");
    if (!result.ok && result.reason === "signed-out") {
      router.push(`/sign-in?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    if (!result.ok) setError(result.message);
    setBusy(false);
  }

  return (
    <div className="rounded-3xl border-2 border-brand bg-brand-tint/40 p-7 sm:p-9">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center rounded-full bg-brand-strong px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-foreground">
            Founding Member
          </span>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Pay once. Never pay again.
          </h3>
          <p className="mt-2 text-base text-muted-foreground">
            {siteLimitLabel(tier)}, all six tools, and uptime alerts, for a
            single payment. This is how we fund the build, so it closes for good
            once the last seat goes.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            <Feature emphasis>{siteLimitLabel(tier)}</Feature>
            <Feature emphasis>All 6 tools, forever</Feature>
            <Feature emphasis>Uptime alerts by email</Feature>
            <Feature emphasis>Every core tool we add later</Feature>
            <Feature>{tier.support}</Feature>
            <Feature>No renewal, ever</Feature>
          </ul>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3 rounded-2xl border border-border bg-card px-7 py-6 text-center">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-extrabold tracking-tight text-foreground">
              ${tier.once}
            </span>
            <span className="text-sm text-muted-foreground">once</span>
          </div>
          <p className="text-xs font-semibold text-brand-strong">
            {soldOut
              ? "All seats claimed"
              : `${seatsLeft} of ${LIFETIME_SEATS} seat${seatsLeft === 1 ? "" : "s"} left`}
          </p>
          <button
            type="button"
            disabled={busy || soldOut}
            onClick={buy}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-strong px-6 py-3 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : soldOut ? (
              "Sold out"
            ) : (
              <>
                Become a Founding Member
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">30-day refund, no argument</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-critical">{error}</p>}
    </div>
  );
}

function Feature({
  children,
  emphasis = false,
  muted = false,
  soon = false,
}: {
  children: React.ReactNode;
  emphasis?: boolean;
  muted?: boolean;
  soon?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {/* A green tick next to "No automatic monitoring" reads as a feature.
          Anything absent gets a dash instead. */}
      {muted ? (
        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
      )}
      <span
        className={
          muted
            ? "text-muted-foreground/60"
            : emphasis
              ? "font-semibold text-foreground"
              : "text-muted-foreground"
        }
      >
        {children}
        {soon && (
          <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Soon
          </span>
        )}
      </span>
    </li>
  );
}

function BillingTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-brand-strong text-brand-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
