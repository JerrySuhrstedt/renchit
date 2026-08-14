import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  FREE_TOOL_SWITCH_DAYS,
  PLANS,
  TOOL_KEYS,
  isToolKey,
  type Monitoring,
  type PlanKey,
  type ToolKey,
} from "@/lib/plans";

/**
 * What a given user is allowed to do right now. Everything that gates a
 * feature reads this, so there is exactly one place where "is this person
 * paid up" gets decided.
 */
export type Entitlements = {
  plan: PlanKey;
  /** Raw Paddle status when there is a subscription, otherwise derived. */
  status: "trialing" | "active" | "past_due" | "free";
  siteLimit: number | null;
  /** "all", or the specific tools this user may run. */
  allowedTools: "all" | ToolKey[];
  monitoring: Monitoring;
  isPaid: boolean;
  /** Comped account (early tester). Full access, but nothing was charged. */
  isComp: boolean;

  // Trial
  trialEndsAt: Date | null;
  trialDaysLeft: number;

  // Free plan tool choice
  freeTool: ToolKey | null;
  /** Null when they may switch right now. */
  freeToolSwitchableAt: Date | null;

  // Billing surface
  hasPaddleCustomer: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

const DAY_MS = 86_400_000;

/**
 * Paddle keeps retrying a failed payment for a dunning window before giving
 * up. Cutting someone off the moment a card bounces punishes people whose bank
 * declined a routine renewal, so past_due keeps working and just shows a
 * banner. Only a terminal status actually drops them to free.
 */
const ENTITLING_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      trialEndsAt: true,
      freeTool: true,
      freeToolChangedAt: true,
      paddleCustomerId: true,
      subscription: true,
    },
  });

  if (!user) return freeEntitlements(null, null, null, false);

  const now = new Date();
  const sub = user.subscription;
  const freeTool = isToolKey(user.freeTool) ? user.freeTool : null;

  // 1. Lifetime never lapses and never renews, so it short-circuits before any
  //    date arithmetic.
  if (sub && sub.plan === "lifetime" && ENTITLING_STATUSES.has(sub.status)) {
    return fromPlan("lifetime", "active", {
      isComp: sub.interval === "comp",
      trialEndsAt: user.trialEndsAt,
      freeTool,
      freeToolSwitchableAt: null,
      hasPaddleCustomer: Boolean(user.paddleCustomerId),
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });
  }

  // 2. A live recurring subscription.
  if (sub && ENTITLING_STATUSES.has(sub.status) && isPaidPlan(sub.plan)) {
    const notLapsed = !sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() > now.getTime();
    if (notLapsed) {
      return fromPlan(sub.plan, sub.status === "past_due" ? "past_due" : "active", {
        // interval "comp" marks access we granted rather than sold. It applies
        // to any plan, not just lifetime, so it has to be read here too or a
        // comped Agency account would be counted as revenue.
        isComp: sub.interval === "comp",
        trialEndsAt: user.trialEndsAt,
        freeTool,
        freeToolSwitchableAt: null,
        hasPaddleCustomer: Boolean(user.paddleCustomerId),
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        currentPeriodEnd: sub.currentPeriodEnd,
      });
    }
  }

  // 3. Still inside the signup trial.
  if (user.trialEndsAt && user.trialEndsAt.getTime() > now.getTime()) {
    return fromPlan("trial", "trialing", {
      isComp: false,
      trialEndsAt: user.trialEndsAt,
      freeTool,
      freeToolSwitchableAt: null,
      hasPaddleCustomer: Boolean(user.paddleCustomerId),
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });
  }

  // 4. Free.
  return freeEntitlements(
    user.trialEndsAt,
    freeTool,
    user.freeToolChangedAt,
    Boolean(user.paddleCustomerId),
  );
}

function isPaidPlan(plan: string): plan is PlanKey {
  return plan === "starter" || plan === "pro" || plan === "agency";
}

function freeEntitlements(
  trialEndsAt: Date | null,
  freeTool: ToolKey | null,
  freeToolChangedAt: Date | null,
  hasPaddleCustomer: boolean,
): Entitlements {
  const switchableAt = freeToolChangedAt
    ? new Date(freeToolChangedAt.getTime() + FREE_TOOL_SWITCH_DAYS * DAY_MS)
    : null;

  return fromPlan("free", "free", {
    isComp: false,
    trialEndsAt,
    freeTool,
    freeToolSwitchableAt:
      switchableAt && switchableAt.getTime() > Date.now() ? switchableAt : null,
    hasPaddleCustomer,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  });
}

function fromPlan(
  planKey: PlanKey,
  status: Entitlements["status"],
  extra: Pick<
    Entitlements,
    | "isComp"
    | "trialEndsAt"
    | "freeTool"
    | "freeToolSwitchableAt"
    | "hasPaddleCustomer"
    | "cancelAtPeriodEnd"
    | "currentPeriodEnd"
  >,
): Entitlements {
  const plan = PLANS[planKey];

  // A free user's single tool is whichever one they picked. Before they pick,
  // they have none, which is what forces the choice screen.
  const allowedTools: "all" | ToolKey[] =
    plan.toolAccess === "all" ? "all" : extra.freeTool ? [extra.freeTool] : [];

  const trialDaysLeft = extra.trialEndsAt
    ? Math.max(0, Math.ceil((extra.trialEndsAt.getTime() - Date.now()) / DAY_MS))
    : 0;

  return {
    plan: planKey,
    status,
    siteLimit: plan.siteLimit,
    allowedTools,
    monitoring: plan.monitoring,
    isPaid: planKey !== "free" && planKey !== "trial",
    trialDaysLeft,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export function canUseTool(ent: Entitlements, tool: ToolKey): boolean {
  return ent.allowedTools === "all" || ent.allowedTools.includes(tool);
}

export async function isWithinSiteLimit(
  userId: string,
  ent: Entitlements,
  rootUrl: string,
): Promise<boolean> {
  if (ent.siteLimit === null) return true;

  // Re-running a tool against a site they already have never counts as adding
  // one, otherwise a 1-site user could not re-audit their own site.
  const existing = await db.site.findUnique({
    where: { userId_rootUrl: { userId, rootUrl } },
    select: { id: true },
  });
  if (existing) return true;

  const count = await db.site.count({ where: { userId } });
  return count < ent.siteLimit;
}

// ---------------------------------------------------------------------------
// API guards
// ---------------------------------------------------------------------------

export type BlockedReason = "tool-locked" | "site-limit";

/**
 * 402 rather than 403: the request is well-formed and the caller is who they
 * say they are, the only thing missing is payment. The client keys off
 * `reason` to decide which upgrade prompt to show.
 */
function paymentRequired(reason: BlockedReason, error: string) {
  return NextResponse.json({ error, reason, upgradeUrl: "/pricing" }, { status: 402 });
}

/**
 * Guard for a tool's POST route. Returns a NextResponse to bail out with, or
 * the entitlements if the user is allowed through.
 */
export async function requireToolAccess(
  userId: string,
  tool: ToolKey,
): Promise<Entitlements | NextResponse> {
  const ent = await getEntitlements(userId);

  if (!canUseTool(ent, tool)) {
    const name = PLANS[ent.plan].name;
    return paymentRequired(
      "tool-locked",
      ent.freeTool
        ? `Your ${name} plan includes one tool, and you picked a different one. Upgrade to use all six, or switch your tool in Billing.`
        : `Your trial has ended. Pick the one tool you want to keep on the ${name} plan, or upgrade to use all six.`,
    );
  }

  return ent;
}

export async function requireSiteCapacity(
  userId: string,
  ent: Entitlements,
  rootUrl: string,
): Promise<NextResponse | null> {
  if (await isWithinSiteLimit(userId, ent, rootUrl)) return null;

  const limit = ent.siteLimit;
  return paymentRequired(
    "site-limit",
    `Your plan covers ${limit === 1 ? "1 website" : `${limit} websites`}. Upgrade to add another.`,
  );
}

export const ALL_TOOL_KEYS = TOOL_KEYS;
