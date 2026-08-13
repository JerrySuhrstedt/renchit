"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Mail } from "lucide-react";

/**
 * Email sign-in. One field, no password.
 *
 * Errors are surfaced here rather than by bouncing to an error page, because
 * the most common failure by far is a sending domain that is not verified
 * yet, and being told that on the spot beats a redirect that loses what you
 * typed.
 */
export function EmailSignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await signIn("resend", {
        email: trimmed,
        redirect: false,
        redirectTo,
      });

      if (res?.error) {
        setError(
          "We could not send that email just now. Please try Google, or email support@renchit.com.",
        );
        return;
      }

      router.push("/sign-in/check-email");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="email" className="sr-only">
        Email address
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourcompany.com"
        className="w-full rounded-2xl border border-border bg-card px-5 py-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
      />

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-strong px-6 py-3.5 text-base font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Mail className="h-5 w-5" aria-hidden />
            Email me a sign-in link
          </>
        )}
      </button>

      {error && <p className="text-sm font-semibold text-critical">{error}</p>}

      <p className="text-center text-xs text-muted-foreground">
        No password to create or remember.
      </p>
    </form>
  );
}
