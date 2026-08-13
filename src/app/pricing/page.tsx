import Link from "next/link";
import { LandingHeader } from "@/components/landing-header";
import { PricingTiers } from "@/components/pricing-tiers";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Pricing — renchit",
  description:
    "Start free with one site and three audits a month. Paid plans from $7/month. No credit card required to begin.",
};

const FAQS = [
  {
    q: "Is the free plan really free?",
    a: "Yes — one website, three audits a month, and every tool. No credit card, no trial timer, no expiry. If that's all you need, stay on it as long as you like.",
  },
  {
    q: "What counts as a website?",
    a: "One domain. If you run yoursite.com, that's one website no matter how many pages we crawl on it. Audits, grades, keyword research, and speed tests for that domain all roll up under it.",
  },
  {
    q: "What happens if I hit the free audit limit?",
    a: "Nothing breaks and nothing is deleted. You keep full access to every audit you've already run and to the other tools — you just wait until next month or upgrade for unlimited runs.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Any time, and cancellation takes effect at the end of the period you've already paid for. Your data stays put if you drop back to the free plan.",
  },
  {
    q: "What does “unlimited websites” actually mean?",
    a: "Exactly what it says for any normal use, including agencies managing dozens of client sites. There's a generous fair-use ceiling in the background purely to stop automated abuse — you would have to be running hundreds of sites on daily audits to notice it.",
  },
  {
    q: "Do you offer refunds?",
    a: "Email us within 30 days at info@sumolab.co and we'll refund you, no argument. At these prices we'd rather you feel fine about trying it.",
  },
];

export default function PricingPage() {
  return (
    <>
      <LandingHeader />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pt-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center rounded-full bg-brand-tint px-3.5 py-1.5 text-sm font-semibold text-brand-strong">
              The easiest web check tool on the internet
            </span>
            <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Start free. Upgrade when it&apos;s worth it.
            </h1>
            <p className="max-w-xl text-balance text-lg text-muted-foreground">
              Every plan includes all five tools. What changes is how many
              websites you manage and how often you can audit them.
            </p>
          </div>

          <div className="mt-12">
            <PricingTiers />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Prices in USD. Cancel any time.
          </p>
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
