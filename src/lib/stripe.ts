import Stripe from "stripe";

/**
 * Lazily constructed so the app still builds and the marketing pages still
 * render on a deploy where the Stripe keys have not been set yet. Only the
 * routes that actually talk to Stripe will fail, and they fail loudly.
 */
let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  client = new Stripe(key, {
    // Let the SDK use the API version it was generated against rather than
    // pinning a string here that drifts every time we upgrade the package.
    typescript: true,
    appInfo: { name: "renchit", url: "https://renchit.com" },
  });
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Absolute base URL for Stripe redirect targets. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://renchit.com";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
