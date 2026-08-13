"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

/**
 * Every tool is currently in every plan — plans differ only on how many sites
 * you manage and how often you can audit. So each card spells out the full
 * feature list rather than the usual "Everything in X, plus…", because for a
 * lot of visitors pricing is the *first* page they open and "Everything in
 * Starter" tells them nothing.
 *
 * If tools later get split across plans, give a tier its own `features` array
 * and drop the ones it shouldn't include — nothing else needs to change.
 */
const ALL_FEATURES = [
  "Site Audit — up to 50 pages per crawl",
  "~20 SEO & technical checks, explained plainly",
  "Large image finder with one-click optimizing",
  "Keyword & content ideas from real Google data",
  "Content Grader — 13 on-page checks",
  "Local Listing Checker for business info",
  "Page Speed — real mobile & desktop scores",
  "Google Search Console connection",
  "Projects that group everything by website",
  "Full saved history, always accessible",
];

type Tier = {
  name: string;
  blurb: string;
  monthly: number;
  annual: number;
  sites: string;
  audits: string;
  support: string;
  cta: string;
  highlighted?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    blurb: "Enough to actually fix your site.",
    monthly: 0,
    annual: 0,
    sites: "1 website",
    audits: "3 audits per month",
    support: "Community support",
    cta: "Get started free",
  },
  {
    name: "Starter",
    blurb: "For one site you actually care about.",
    monthly: 7,
    annual: 70,
    sites: "1 website",
    audits: "Unlimited audits",
    support: "Email support",
    cta: "Choose Starter",
    highlighted: true,
  },
  {
    name: "Pro",
    blurb: "For a handful of sites at once.",
    monthly: 15,
    annual: 150,
    sites: "5 websites",
    audits: "Unlimited audits",
    support: "Email support",
    cta: "Choose Pro",
  },
  {
    name: "Agency",
    blurb: "For people managing client sites.",
    monthly: 25,
    annual: 250,
    sites: "Unlimited websites",
    audits: "Unlimited audits",
    support: "Priority support",
    cta: "Choose Agency",
  },
];

export function PricingTiers() {
  const [annual, setAnnual] = useState(false);

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

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const isFree = tier.monthly === 0;
          const price = annual ? tier.annual : tier.monthly;

          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-3xl border bg-card p-6 ${
                tier.highlighted
                  ? "border-brand shadow-[0_12px_32px_-16px_rgba(196,61,28,0.35)]"
                  : "border-border"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-strong px-3 py-1 text-xs font-bold text-brand-foreground">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                {tier.blurb}
              </p>

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
                  ? "Free forever — no card required"
                  : annual
                    ? `Works out to $${(tier.annual / 12).toFixed(2)}/month`
                    : `or $${tier.annual}/year`}
              </p>

              <Link
                href="/sign-in"
                className={`mt-5 inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-brand-strong text-brand-foreground hover:bg-brand-strong/90"
                    : "border border-border text-foreground hover:border-brand hover:text-brand-strong"
                }`}
              >
                {tier.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <ul className="mt-6 flex flex-col gap-2.5 border-t border-border pt-5">
                <Feature emphasis>{tier.sites}</Feature>
                <Feature emphasis>{tier.audits}</Feature>
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

function Feature({
  children,
  emphasis = false,
}: {
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
      <span className={emphasis ? "font-semibold text-foreground" : "text-muted-foreground"}>
        {children}
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
