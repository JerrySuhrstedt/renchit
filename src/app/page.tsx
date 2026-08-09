import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Wrench,
  Lightbulb,
  FileSearch,
  MapPin,
  ArrowRight,
  Search,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { HealthScoreDial } from "@/components/health-score-dial";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "renchit — Plain-English SEO tools for real websites",
  description:
    "Audit your site, find real content ideas, and grade your pages — in plain English, with zero SEO jargon. Free to start.",
};

const CTA_LABEL = "Get Started Free";

const TOOLS = [
  {
    icon: Wrench,
    name: "Site Audit",
    tagline: "Know exactly what to fix",
    what: "Crawls up to 50 real pages of your site and checks them against ~20 SEO and technical rules — broken links, missing titles, thin content, slow pages, and more.",
    why: "Most site owners have no idea what's actually wrong with their site — SEO tools either bury you in jargon or don't tell you anything actionable at all.",
    how: [
      "Paste your website URL",
      "We crawl your real pages and run every check",
      "Get a health score plus a plain-English fix for each issue",
    ],
  },
  {
    icon: Lightbulb,
    name: "Keyword & Content Ideas",
    tagline: "Never run out of things to write",
    what: "Pulls real questions, comparisons, and phrases people search for around any topic — straight from Google's own autocomplete, not a guess.",
    why: "Staring at a blank page trying to guess what your customers are searching for wastes hours and usually guesses wrong.",
    how: [
      "Enter a topic or seed keyword",
      "We query Google's real suggestion data across dozens of variations",
      "Get an organized, save-able list of real content ideas in seconds",
    ],
  },
  {
    icon: FileSearch,
    name: "Content Grader",
    tagline: "Publish with confidence",
    what: "Grades any page against a target keyword with ~13 on-page checks — titles, headings, keyword usage, readability, alt text, and more.",
    why: "It's easy to publish a page and have no idea whether it's actually optimized until it quietly fails to rank months later.",
    how: [
      "Paste a page URL and your target keyword",
      "We fetch the page and run every on-page check",
      "Get a score and a checklist of exactly what to fix before you publish",
    ],
  },
  {
    icon: MapPin,
    name: "Local Listing Checker",
    tagline: "Show up right in local search",
    what: "Checks your business name, address, and phone number for consistency against your website, plus structured data and Google Business Profile fundamentals.",
    why: "Mismatched business info between your website and Google is one of the most common — and most overlooked — reasons local businesses don't show up in the map pack.",
    how: [
      "Enter your business name, address, and phone number",
      "We scan your website for matching info and local SEO basics",
      "Get a score and a plain-English checklist of what to fix",
    ],
  },
];

const FEATURES = [
  { title: "Real crawl, up to 50 pages", desc: "Every audit is a live crawl of your actual site." },
  { title: "Automatic 0–100 health score", desc: "One number that tells you where you stand." },
  { title: "~20 built-in SEO checks", desc: "Titles, meta, headings, links, speed, and more." },
  { title: "Plain-English fixes", desc: "Every issue explains what to do, not just what's wrong." },
  { title: "Track fixed & ignored issues", desc: "Mark progress and re-run audits to compare." },
  { title: "Real Google autocomplete data", desc: "No invented keywords — pulled live from Google." },
  { title: "Questions, comparisons & A–Z ideas", desc: "Organized so you always know where to start." },
  { title: "Save & copy your favorite ideas", desc: "Build a running list of what to write next." },
  { title: "13-point on-page content grading", desc: "Titles, headings, density, alt text, readability." },
  { title: "Word count & readability at a glance", desc: "See if your content is thin before you publish." },
  { title: "Projects group everything by site", desc: "Every audit and grade, organized automatically." },
  { title: "Free Google sign-in", desc: "No password to create or remember." },
  { title: "Local business info consistency check", desc: "Catch NAP mismatches between your site and Google." },
  { title: "LocalBusiness structured data check", desc: "See if your site helps Google confirm who you are." },
];

const FAQS = [
  {
    q: "Is this actually free?",
    a: "Yes. Sign in with your Google account and use all four tools — no credit card required.",
  },
  {
    q: "Do you show keyword search volume, like Ahrefs or SEMrush?",
    a: "Not yet — real search-volume data requires expensive paid data providers. We're focused on the free, high-value parts first: real content ideas, real site audits, and real on-page grading.",
  },
  {
    q: "How is this different from Ahrefs or SEMrush?",
    a: "Those tools pack in hundreds of features built for SEO agencies. We do three things, do them well, and explain every result in plain English — no jargon, no learning curve.",
  },
  {
    q: "Is my data private?",
    a: "Your audits, keyword research, and content grades are tied to your Google account and only visible to you.",
  },
  {
    q: "How many pages does a site audit check?",
    a: "Up to 50 pages per audit, following your site's real internal links.",
  },
  {
    q: "Do I need to know anything about SEO to use this?",
    a: "No — that's the whole point. Every result comes with a plain-English explanation of what's wrong and exactly how to fix it.",
  },
];

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative isolate flex min-h-[560px] items-center overflow-hidden sm:min-h-[640px]">
          <Image
            src="/hero/hero-woman-v2.jpg"
            alt="A satisfied renchit customer standing in her office"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[72%_18%] sm:object-[68%_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:px-8">
            <h1 className="max-w-xl text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Stop guessing what&apos;s wrong with your website.
            </h1>
            <p className="max-w-lg text-balance text-lg text-white/90">
              renchit audits your site, finds real content ideas, and grades
              your pages — in plain English, with zero SEO jargon.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-strong px-7 py-3.5 text-base font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90"
            >
              {CTA_LABEL}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <ul className="flex flex-col items-start gap-2 text-sm font-medium text-white">
              {[
                "Real site crawl & health score, not vague guesses",
                "Content ideas pulled straight from Google",
                "Know if a page is optimized before you hit publish",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Health score explainer */}
        <section className="border-b border-border/70 bg-card/60">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[auto_1fr] md:gap-16">
            <div className="flex justify-center md:justify-start">
              <HealthScoreDial score={78} size="lg" />
            </div>
            <div className="flex flex-col gap-3 text-center md:text-left">
              <h2 className="text-balance text-2xl font-bold leading-snug text-foreground sm:text-3xl">
                Every audit boils your site down to one honest number.
              </h2>
              <p className="max-w-lg text-balance text-base leading-relaxed text-muted-foreground md:mx-0 mx-auto">
                No more scrolling through a hundred metrics wondering what
                matters. Your health score weighs every issue we find —
                critical, worth reviewing, or minor — so you know at a
                glance where your site stands, and exactly what to fix to
                move the number up.
              </p>
            </div>
          </div>
        </section>

        {/* Problem / Solution */}
        <section className="border-y border-border/70 bg-card/60">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-2 md:gap-16">
            <p className="text-balance text-2xl font-bold leading-snug text-foreground sm:text-3xl">
              You know your website is supposed to be &ldquo;optimized&rdquo;
              — but you have no idea what that actually means for your site,
              right now.
            </p>
            <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Most SEO tools throw you into a wall of jargon — canonical
                tags, crawl budget, keyword density — spread across dozens of
                tabs and hundreds of features you&apos;ll never touch.
                They&apos;re built for agencies, not for you.
              </p>
              <p>
                You just want to know: is my site okay? What should I write
                about next? Is this page actually ready to publish?
              </p>
              <p className="font-semibold text-foreground">
                renchit does a handful of things, does them well, and
                explains every result in plain English — so you can fix your
                site today, not learn a new discipline first.
              </p>
            </div>
          </div>
        </section>

        {/* Tools deep-dive */}
        <section id="tools" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Four tools. Nothing you don&apos;t need.
            </h2>
            <p className="max-w-lg text-balance text-muted-foreground">
              Every tool does one job, does it with real data, and tells you
              exactly what to do next.
            </p>
          </div>

          <div className="mt-14 flex flex-col gap-8">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="grid gap-8 rounded-3xl border border-border bg-card p-8 sm:p-10 md:grid-cols-[1fr_1.3fr] md:items-center"
              >
                <div className="flex flex-col gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint">
                    <tool.icon className="h-6 w-6 text-brand-strong" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {tool.name}
                    </h3>
                    <p className="mt-0.5 text-sm font-semibold text-brand-strong">
                      {tool.tagline}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {tool.what}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Why you need it:{" "}
                    </span>
                    {tool.why}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    How it works
                  </p>
                  {tool.how.map((step, stepIndex) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 rounded-2xl bg-secondary/70 px-4 py-3.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-strong text-xs font-bold text-brand-foreground">
                        {stepIndex + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works overall */}
        <section id="how-it-works" className="border-y border-border/70 bg-card/60">
          <div className="mx-auto w-full max-w-5xl px-5 py-20 sm:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Getting started takes about a minute.
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: Sparkles,
                  title: "Sign in free",
                  desc: "One click with your Google account — no password to create.",
                },
                {
                  icon: Search,
                  title: "Pick a tool",
                  desc: "Audit a site, find content ideas, or grade a page.",
                },
                {
                  icon: ListChecks,
                  title: "Get real answers",
                  desc: "Plain-English results you can act on immediately.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint">
                    <step.icon className="h-6 w-6 text-brand-strong" />
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features checklist */}
        <section className="mx-auto w-full max-w-5xl px-5 py-20 sm:px-8">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Everything that&apos;s in here.
          </h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card px-5 py-4"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-tint">
                  <Check className="h-3 w-3 text-success" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {feature.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-y border-border/70 bg-card/60">
          <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Questions, answered.
            </h2>
            <div className="mt-12 flex flex-col gap-3">
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

        {/* Final CTA */}
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-5 py-20 text-center sm:px-8">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Ready to see what&apos;s actually going on with your site?
          </h2>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-strong px-7 py-3.5 text-base font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90"
          >
            {CTA_LABEL}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-card/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              A simpler way to keep your website healthy.
            </p>
          </div>

          <div className="flex gap-12">
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Tools
              </p>
              <a href="#tools" className="text-sm text-foreground hover:text-brand-strong">
                Site Audit
              </a>
              <a href="#tools" className="text-sm text-foreground hover:text-brand-strong">
                Keyword Ideas
              </a>
              <a href="#tools" className="text-sm text-foreground hover:text-brand-strong">
                Content Grader
              </a>
              <a href="#tools" className="text-sm text-foreground hover:text-brand-strong">
                Local Listing Checker
              </a>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Account
              </p>
              <Link href="/sign-in" className="text-sm text-foreground hover:text-brand-strong">
                Sign in
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border/70 px-5 py-5 text-center text-xs text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} All Rights Reserved | SumoLab LLC
        </div>
      </footer>
    </>
  );
}
