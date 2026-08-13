import Link from "next/link";
import { LandingHeader } from "@/components/landing-header";
import { PricingTiers, LifetimeOffer } from "@/components/pricing-tiers";
import { TestModeBanner } from "@/components/test-mode-banner";
import { LIFETIME_SEATS, TRIAL_DAYS } from "@/lib/plans";
import { lifetimeSeatsSold } from "@/lib/paddle-customer";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Pricing | renchit",
  description:
    "Try every tool free for 14 days, no credit card. Then keep one tool free forever, or go unlimited from $9/month.",
};

// Seats remaining is read per request, so a sold-out deal stops selling the
// moment the last one goes.
export const dynamic = "force-dynamic";

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. Sign up and all six tools are unlocked for 14 days with no card, no billing details, and nothing to cancel. If you do nothing at the end of the trial you simply move to the free plan.",
  },
  {
    q: "What happens when the 14 days are up?",
    a: "You pick one tool to keep, free, forever. Everything you already ran stays visible and readable, we never delete or hide your results. You just cannot start new runs with the other five unless you upgrade.",
  },
  {
    q: "Can I change which free tool I keep?",
    a: "Yes, once every 30 days. That cooldown is the only thing making the limit mean anything, otherwise everyone would just switch tools whenever they wanted and have all six.",
  },
  {
    q: "What counts as a website?",
    a: "One domain. If you run yoursite.com, that is one website no matter how many pages we crawl on it. Audits, grades, keyword research, and speed tests for that domain all roll up under it.",
  },
  {
    q: "What is the Founding Member deal?",
    a: "One payment of $199 for Pro-level access that never renews: 5 websites, all six tools, and every core tool we add later. We are capping it at 100 because it is funding the build, and once those are gone it will not come back.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Any time, and cancellation takes effect at the end of the period you have already paid for. Your data stays put if you drop back to the free plan.",
  },
  {
    q: "What does \u201cunlimited websites\u201d actually mean?",
    a: "Exactly what it says for any normal use, including agencies managing dozens of client sites. There is a generous fair-use ceiling in the background purely to stop automated abuse. You would have to be running hundreds of sites on daily audits to notice it.",
  },
  {
    q: "Do you offer refunds?",
    a: "Email us within 30 days at support@renchit.com and we will refund you, no argument. That includes the Founding Member deal.",
  },
];

export default async function PricingPage() {
  const seatsLeft = Math.max(0, LIFETIME_SEATS - (await lifetimeSeatsSold()));

  return (
    <>
      <LandingHeader />
      <main className="flex flex-1 flex-col">
        <TestModeBanner />
        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pt-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center rounded-full bg-brand-tint px-3.5 py-1.5 text-sm font-semibold text-brand-strong">
              The easiest web check tool on the internet
            </span>
            <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Try everything free. No card needed.
            </h1>
            <p className="max-w-xl text-balance text-lg text-muted-foreground">
              All six tools are unlocked for {TRIAL_DAYS} days. After that keep
              one tool free forever, or pick a plan and keep the lot.
            </p>
          </div>

          <div className="mt-12">
            <PricingTiers />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Prices in USD. Cancel any time.
          </p>

          <div className="mt-16">
            <LifetimeOffer seatsLeft={seatsLeft} />
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/60">
          <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-foreground">
              Pricing questions
            </h2>
            <div className="mt-10 flex flex-col gap-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-2xl border border-border bg-card px-5 py-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-foreground">
                    {faq.q}
                    <span className="shrink-0 text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-5 py-16 text-center sm:px-8">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground">
            See what&apos;s wrong with your site in about a minute.
          </h2>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-strong px-7 py-3.5 text-base font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90"
          >
            Get Started Free
          </Link>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-card/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 py-8 text-center text-xs text-muted-foreground sm:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
          <p>© {new Date().getFullYear()} All Rights Reserved | SumoLab LLC</p>
        </div>
      </footer>
    </>
  );
}
