import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getEntitlements } from "@/lib/entitlements";
import { PLANS, TOOLS, monitoringLabel, siteLimitLabel } from "@/lib/plans";
import { BillingActions, FreeToolPicker } from "@/components/billing-panel";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Billing | renchit" };

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const sessionUser = await requireUser();
  const { checkout } = await searchParams;
  const ent = await getEntitlements(sessionUser.id);
  const plan = PLANS[ent.plan];

  // A comped tester is stored as lifetime so they inherit its entitlements,
  // but calling them a "Founding Member" who paid once is simply untrue.
  const planName = ent.isComp ? "Complimentary access" : plan.name;
  const planBlurb = ent.isComp ? "Every tool, on the house." : plan.blurb;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-24 pt-8 sm:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your plan, what it includes, and how to change it.
      </p>

      {checkout === "success" && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-success/40 bg-success-tint px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="text-sm font-bold text-foreground">You are all set.</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Payment went through and your plan is active. If this page still
              shows the old plan, give it a few seconds and refresh.
            </p>
          </div>
        </div>
      )}

      {ent.status === "past_due" && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-critical/40 bg-critical-tint px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-critical" aria-hidden />
          <div>
            <p className="text-sm font-bold text-foreground">Your last payment failed.</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Nothing is locked yet and we will keep retrying, but please update
              your card so you do not lose access.
            </p>
          </div>
        </div>
      )}

      {/* Current plan */}
      <div className="mt-6 rounded-3xl border border-border bg-card px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">{planName}</h2>
          {ent.plan === "trial" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-strong">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {ent.trialDaysLeft} day{ent.trialDaysLeft === 1 ? "" : "s"} left
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{planBlurb}</p>

        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>{siteLimitLabel(plan)}</li>
          <li>
            {ent.allowedTools === "all"
              ? "All 6 tools"
              : ent.freeTool
                ? `1 tool: ${TOOLS.find((t) => t.key === ent.freeTool)?.name}`
                : "No tool picked yet"}
          </li>
          <li>{monitoringLabel(plan.monitoring)}</li>
        </ul>

        {ent.plan === "trial" && ent.trialEndsAt && (
          <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
            Your trial runs until <strong className="text-foreground">{formatDate(ent.trialEndsAt)}</strong>.
            No card is on file and nothing will be charged. When it ends you
            keep one tool of your choice, free, and everything you have already
            run stays readable.
          </p>
        )}

        {ent.plan === "lifetime" && (
          <p className="mt-4 rounded-2xl bg-success-tint px-4 py-3 text-sm text-muted-foreground">
            {ent.isComp ? (
              <>
                You have <strong className="text-foreground">complimentary access</strong> as an
                early tester. Every tool, no charge, no expiry. Thank you for
                kicking the tires.
              </>
            ) : (
              <>
                You are a <strong className="text-foreground">Founding Member</strong>. This never
                renews and will never be charged again.
              </>
            )}
          </p>
        )}

        {ent.currentPeriodEnd && ent.plan !== "lifetime" && (
          <p className="mt-4 text-sm text-muted-foreground">
            {ent.cancelAtPeriodEnd ? "Access ends on " : "Renews on "}
            <strong className="text-foreground">{formatDate(ent.currentPeriodEnd)}</strong>.
          </p>
        )}

        <BillingActions
          hasPaddleCustomer={ent.hasPaddleCustomer}
          // Comps get the "See plans" link too. They are on the house, not
          // sold to, but they should still be able to look at pricing.
          isPaid={ent.isPaid && !ent.isComp}
          isLifetime={ent.plan === "lifetime"}
        />
      </div>

      {/* Free plan tool choice */}
      {ent.allowedTools !== "all" && (
        <div className="mt-6 rounded-3xl border border-border bg-card px-6 py-6 sm:px-8">
          <h2 className="text-sm font-bold text-foreground">Your one free tool</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the one you want to keep using. You can change it once every 30
            days, or upgrade any time to unlock all six.
          </p>
          <FreeToolPicker
            current={ent.freeTool}
            switchableAt={ent.freeToolSwitchableAt?.toISOString() ?? null}
          />
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Questions about a charge? Email{" "}
        <a href="mailto:info@sumolab.co" className="underline hover:text-foreground">
          info@sumolab.co
        </a>{" "}
        or read the{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </Link>
        .
      </p>
    </main>
  );
}
