"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import type { BillingInterval, PlanKey } from "@/lib/plans";

/**
 * Browser-side checkout.
 *
 * Paddle opens an overlay in the page rather than redirecting away, which is
 * why this needs a public client token as well as the server key. The
 * transaction itself is still created server side, so the userId attached to
 * the purchase is one we stamped and can trust.
 */

let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddle(): Promise<Paddle | undefined> {
  if (paddlePromise) return paddlePromise;

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token || token === "PASTE_HERE") {
    return Promise.reject(new Error("Paddle client token is not configured"));
  }

  paddlePromise = initializePaddle({
    token,
    environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
  });
  return paddlePromise;
}

export type CheckoutOutcome =
  | { ok: true }
  | { ok: false; reason: "signed-out" }
  | { ok: false; reason: "error"; message: string };

export async function startCheckout(
  plan: PlanKey,
  interval: BillingInterval,
): Promise<CheckoutOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/paddle/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    });
  } catch {
    return { ok: false, reason: "error", message: "Could not reach the server. Please try again." };
  }

  if (res.status === 401) return { ok: false, reason: "signed-out" };

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      reason: "error",
      message: data.error ?? "Could not start checkout. Please try again.",
    };
  }

  try {
    const paddle = await getPaddle();
    if (!paddle) throw new Error("Paddle failed to load");
    paddle.Checkout.open({
      transactionId: data.transactionId,
      settings: {
        // Paddle's overlay closes on success and leaves the page as it was, so
        // send them somewhere that reflects the purchase they just made.
        successUrl: `${window.location.origin}/billing?checkout=success`,
      },
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Checkout failed to open.",
    };
  }
}
