import { Paddle, Environment } from "@paddle/paddle-node-sdk";

/**
 * Lazily constructed so the app still builds and the marketing pages still
 * render on a deploy where the Paddle keys have not been set. Only the routes
 * that actually talk to Paddle will fail, and they fail loudly.
 */
let client: Paddle | null = null;

export function paddle(): Paddle {
  if (client) return client;

  const key = process.env.PADDLE_API_KEY;
  if (!key || key === "PASTE_HERE") {
    throw new Error("PADDLE_API_KEY is not set");
  }

  client = new Paddle(key, {
    environment:
      process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
  });
  return client;
}

export function paddleConfigured(): boolean {
  const key = process.env.PADDLE_API_KEY;
  return Boolean(key) && key !== "PASTE_HERE";
}

/** Absolute base URL, used for checkout return targets. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://renchit.com";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
