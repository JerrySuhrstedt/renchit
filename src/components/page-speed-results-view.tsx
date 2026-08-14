"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wrench, Smartphone, Monitor } from "lucide-react";
import { HealthScoreDial } from "@/components/health-score-dial";
import { hostnameOf, pageSpeedBand } from "@/lib/format";
import { VITAL_BAND_META, type PageSpeedCheckDTO } from "@/lib/page-speed-types";

export function PageSpeedResultsView({ check }: { check: PageSpeedCheckDTO }) {
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const result = strategy === "mobile" ? check.mobile : check.desktop;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-8 sm:px-8">
      <Link
        href="/speed"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All speed tests
      </Link>

      <div className="mt-6 flex flex-col items-center gap-6 rounded-3xl border border-border bg-card px-6 py-10 text-center sm:px-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {hostnameOf(check.url)}
        </h1>

        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <StrategyTab
            active={strategy === "mobile"}
            onClick={() => setStrategy("mobile")}
            icon={Smartphone}
          >
            Mobile
          </StrategyTab>
          <StrategyTab
            active={strategy === "desktop"}
            onClick={() => setStrategy("desktop")}
            icon={Monitor}
          >
            Desktop
          </StrategyTab>
        </div>

        {result && (
          <HealthScoreDial score={result.score} size="lg" band={pageSpeedBand(result.score)} />
        )}
      </div>

      {result && (
        <>
          {/* Real visitors first when we have them. This is the number that
              actually describes the site, and unlike the lab score it does not
              move between runs, because it is not a simulation. */}
          {result.field && (
            <section className="mt-8 rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground">What real visitors get</h2>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: VITAL_BAND_META[result.field.overall].tint,
                    color: VITAL_BAND_META[result.field.overall].color,
                  }}
                >
                  {VITAL_BAND_META[result.field.overall].label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Measured by Google from people who actually visited this page
                over the last 28 days.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {result.field.metrics.map((m) => {
                  const meta = VITAL_BAND_META[m.band];
                  return (
                    <div key={m.key} className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-lg font-extrabold tabular-nums" style={{ color: meta.color }}>
                        {m.displayValue}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <h2 className="mt-10 text-lg font-bold text-foreground">
            Lab test {strategy === "mobile" ? "on mobile" : "on desktop"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Google loads the page on a simulated device. Useful for finding what
            to fix, but the score moves between runs and can differ from what
            you see on Google&apos;s own page.{" "}
            <a
              href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(check.url)}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-strong hover:underline"
            >
              Check it there
            </a>
            .
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {result.metrics.map((metric) => {
              const meta = VITAL_BAND_META[metric.band];
              return (
                <div
                  key={metric.key}
                  className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="text-xl font-extrabold tabular-nums text-foreground">
                    {metric.displayValue}
                  </p>
                  <span
                    className="w-fit rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: meta.tint, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {result.opportunities.length > 0
                ? "Top ways to speed this page up"
                : "Nothing major to fix"}
            </h2>
            {result.opportunities.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-success/40 bg-success-tint px-8 py-14 text-center">
                <p className="text-lg font-bold text-success">
                  This page is in good shape
                </p>
                <p className="mt-1 text-sm text-success/80">
                  We didn&apos;t find any significant speed opportunities on{" "}
                  {strategy}.
                </p>
              </div>
            ) : (
              result.opportunities.map((opp) => (
                <div
                  key={opp.key}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint">
                    <Wrench className="h-4 w-4 text-brand-strong" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {opp.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {opp.description}
                    </p>
                    {opp.savings && (
                      <p className="mt-1.5 text-xs font-semibold text-brand-strong">
                        {opp.savings}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StrategyTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Smartphone;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-brand-strong text-brand-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

