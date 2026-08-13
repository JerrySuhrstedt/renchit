/**
 * One source of truth for pricing, tools, and limits.
 *
 * The marketing page renders from this file and the API routes gate from it,
 * so the two can never drift. If a number here is wrong it is wrong in exactly
 * one place. Never hardcode a price or a limit anywhere else.
 */

export const TRIAL_DAYS = 14;

/** How long a free user must wait before swapping their one tool. */
export const FREE_TOOL_SWITCH_DAYS = 30;

/** Founding Member lifetime deal closes once this many have sold. */
export const LIFETIME_SEATS = 100;

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const TOOL_KEYS = [
  "audit",
  "keywords",
  "grader",
  "local",
  "speed",
  "search-console",
] as const;

export type ToolKey = (typeof TOOL_KEYS)[number];

export type Tool = {
  key: ToolKey;
  name: string;
  href: string;
  /** Shown when a free user is choosing which single tool to keep. */
  blurb: string;
};

export const TOOLS: Tool[] = [
  {
    key: "audit",
    name: "Site Audit",
    href: "/audit",
    blurb: "Crawls up to 50 pages and lists what is broken, in plain English.",
  },
  {
    key: "keywords",
    name: "Keyword Ideas",
    href: "/keywords",
    blurb: "Real phrases people type into Google, pulled from live autocomplete.",
  },
  {
    key: "grader",
    name: "Content Grader",
    href: "/grader",
    blurb: "Scores one page against one keyword across 13 on-page checks.",
  },
  {
    key: "local",
    name: "Local Listing",
    href: "/local",
    blurb: "Checks your name, address, and phone are consistent for local search.",
  },
  {
    key: "speed",
    name: "Page Speed",
    href: "/speed",
    blurb: "Real mobile and desktop scores straight from Google.",
  },
  {
    key: "search-console",
    name: "Search Data",
    href: "/search-console",
    blurb: "Clicks, impressions, and near-miss keywords from Google Search Console.",
  },
];

export function toolName(key: string): string {
  return TOOLS.find((t) => t.key === key)?.name ?? key;
}

export function isToolKey(value: unknown): value is ToolKey {
  return typeof value === "string" && (TOOL_KEYS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/**
 * "trial" is not a purchasable plan, it is the state every new account starts
 * in for TRIAL_DAYS. It is listed here so entitlement lookups can treat it
 * like any other plan instead of special-casing it at every call site.
 */
export type PlanKey = "trial" | "free" | "starter" | "pro" | "agency" | "lifetime";

export type Monitoring = "none" | "weekly" | "daily";

export type Plan = {
  key: PlanKey;
  name: string;
  blurb: string;
  /** null means unlimited. */
  siteLimit: number | null;
  /** "all", or the number of tools the user may pick and use. */
  toolAccess: "all" | number;
  monitoring: Monitoring;
  support: string;
  /** Dollars. null for plans that are not sold directly. */
  monthly: number | null;
  annual: number | null;
  /** One-time price in dollars, for the lifetime deal. */
  once: number | null;
  /** Whether this plan appears as a card on /pricing. */
  purchasable: boolean;
};

export const PLANS: Record<PlanKey, Plan> = {
  trial: {
    key: "trial",
    name: "Free trial",
    blurb: "Everything unlocked for 14 days.",
    siteLimit: 1,
    toolAccess: "all",
    monitoring: "weekly",
    support: "Email support",
    monthly: null,
    annual: null,
    once: null,
    purchasable: false,
  },
  free: {
    key: "free",
    name: "Free",
    blurb: "Keep one tool, forever.",
    siteLimit: 1,
    toolAccess: 1,
    monitoring: "none",
    support: "Community support",
    monthly: 0,
    annual: 0,
    once: null,
    purchasable: true,
  },
  starter: {
    key: "starter",
    name: "Starter",
    blurb: "For one site you actually care about.",
    siteLimit: 1,
    toolAccess: "all",
    monitoring: "weekly",
    support: "Email support",
    monthly: 9,
    annual: 90,
    once: null,
    purchasable: true,
  },
  pro: {
    key: "pro",
    name: "Pro",
    blurb: "For a handful of sites at once.",
    siteLimit: 5,
    toolAccess: "all",
    monitoring: "weekly",
    support: "Email support",
    monthly: 19,
    annual: 190,
    once: null,
    purchasable: true,
  },
  agency: {
    key: "agency",
    name: "Agency",
    blurb: "For people managing client sites.",
    siteLimit: null,
    toolAccess: "all",
    monitoring: "daily",
    support: "Priority support",
    monthly: 39,
    annual: 390,
    once: null,
    purchasable: true,
  },
  lifetime: {
    key: "lifetime",
    name: "Founding Member",
    blurb: "Pay once. Never pay again.",
    siteLimit: 5,
    toolAccess: "all",
    monitoring: "weekly",
    support: "Priority support",
    monthly: null,
    annual: null,
    once: 199,
    purchasable: true,
  },
};

/** Order the cards appear on /pricing. */
export const PRICING_ORDER: PlanKey[] = ["free", "starter", "pro", "agency"];

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && value in PLANS;
}

// ---------------------------------------------------------------------------
// Stripe price ids
// ---------------------------------------------------------------------------

export type BillingInterval = "month" | "year" | "once";

/**
 * Price ids live in env rather than in code because they differ between
 * Stripe test and live mode. `scripts/stripe-seed.ts` creates the prices and
 * prints these exact lines ready to paste.
 */
const PRICE_ENV: Record<string, string | undefined> = {
  "starter:month": process.env.STRIPE_PRICE_STARTER_MONTHLY,
  "starter:year": process.env.STRIPE_PRICE_STARTER_ANNUAL,
  "pro:month": process.env.STRIPE_PRICE_PRO_MONTHLY,
  "pro:year": process.env.STRIPE_PRICE_PRO_ANNUAL,
  "agency:month": process.env.STRIPE_PRICE_AGENCY_MONTHLY,
  "agency:year": process.env.STRIPE_PRICE_AGENCY_ANNUAL,
  "lifetime:once": process.env.STRIPE_PRICE_LIFETIME,
};

export function priceIdFor(plan: PlanKey, interval: BillingInterval): string | null {
  return PRICE_ENV[`${plan}:${interval}`] ?? null;
}

/** Reverse lookup, used by the webhook to name the plan a price belongs to. */
export function planFromPriceId(
  priceId: string,
): { plan: PlanKey; interval: BillingInterval } | null {
  for (const [combo, id] of Object.entries(PRICE_ENV)) {
    if (id && id === priceId) {
      const [plan, interval] = combo.split(":");
      if (isPlanKey(plan)) return { plan, interval: interval as BillingInterval };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Feature list shown on every pricing card
// ---------------------------------------------------------------------------

/**
 * Every tool is in every paid plan; the plans differ on how many sites you
 * manage and how often we re-check them for you. So each card spells out the
 * whole list rather than "Everything in Starter, plus...", because for a lot
 * of visitors pricing is the first page they open.
 */
export const ALL_FEATURES = [
  "Site Audit: up to 50 pages per crawl",
  "~20 SEO and technical checks, explained plainly",
  "Large image finder with one-click optimizing",
  "Keyword and content ideas from real Google data",
  "Content Grader: 13 on-page checks",
  "Local Listing Checker for business info",
  "Page Speed: real mobile and desktop scores",
  "Google Search Console connection",
  "Projects that group everything by website",
  "Full saved history, always accessible",
];

export function siteLimitLabel(plan: Plan): string {
  if (plan.siteLimit === null) return "Unlimited websites";
  return plan.siteLimit === 1 ? "1 website" : `${plan.siteLimit} websites`;
}

export function toolAccessLabel(plan: Plan): string {
  if (plan.toolAccess === "all") return "All 6 tools";
  return plan.toolAccess === 1 ? "Any 1 tool, your choice" : `Any ${plan.toolAccess} tools`;
}

export function monitoringLabel(monitoring: Monitoring): string {
  if (monitoring === "daily") return "Daily monitoring and alerts";
  if (monitoring === "weekly") return "Weekly monitoring and alerts";
  return "No automatic monitoring";
}
