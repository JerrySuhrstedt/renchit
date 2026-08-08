import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { AppSessionProvider } from "@/components/session-provider";
import "./globals.css";

const sans = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SumoLab Web Wrench — Site Audit",
  description:
    "Crawl your site, find what's holding your SEO back, and get plain-English fixes. No jargon, no clutter — just a healthier site.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/*
          THESIS: A site audit tool with the warmth of Mailchimp, not the density of an SEO
          suite — one job, done with confidence and plain language.
          OWN-WORLD: Warm cream ground (#fdf8f3), near-black warm text, single committed
          brand accent (#fc5434, SumoLab's pinned coral-red) carried by the sumo-knot mark,
          big pill/rounded-3xl cards, Inter Tight throughout for a confident, tightly-set
          voice, severity colors (red/amber/blue/green) kept visually distinct from brand.
          STORY: Visitor pastes a URL, watches a live crawl, gets a satisfying health-score
          reveal, then reads issues as plain-English problems with concrete fixes — never
          jargon they have to Google.
          FIRST VIEWPORT: Dashboard — SumoLab mark + wordmark top-left, a large centered URL
          entry card as the hero action, past audits below as a friendly history list.
          FORM: Brief-pinned canon (Mailchimp-esque Operate surface) with SumoLab's own
          brand assets as visual authority; no tournament roll needed — direction locked by
          user-supplied logo kit and accent color.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
          review, the verdict, and DESIGN.md.
        */}
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
