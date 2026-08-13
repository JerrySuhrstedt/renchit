import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { EmailSignInForm } from "@/components/email-sign-in-form";
import { GoogleMark } from "@/components/google-mark";

const ERRORS: Record<string, string> = {
  Configuration:
    "Email sign-in is not finished being set up yet. Please use Google for now, or email info@sumolab.co.",
  AccessDenied: "That sign-in was declined. Try again, or use a different account.",
  Verification: "That link has already been used or has expired. Request a new one below.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const { error, next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/dashboard";
  const message = error ? (ERRORS[error] ?? "Something went wrong. Please try again.") : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-5 py-16">
      <Logo />

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Sign in to get started
        </h1>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          Every tool free for 14 days, no credit card. Your audits and saved
          work stay on your account.
        </p>
      </div>

      {message && (
        <p className="max-w-sm rounded-2xl border border-critical/40 bg-critical-tint px-5 py-3 text-center text-sm font-semibold text-critical">
          {message}
        </p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-4">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground shadow-[0_1px_2px_rgba(36,28,21,0.04),0_12px_32px_-16px_rgba(36,28,21,0.18)] transition-colors hover:border-brand/40"
          >
            <GoogleMark />
            Continue with Google
          </button>
        </form>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <EmailSignInForm redirectTo={redirectTo} />
      </div>

      <p className="max-w-sm text-balance text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <a href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </main>
  );
}
