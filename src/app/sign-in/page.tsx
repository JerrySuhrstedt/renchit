import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/audit");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-5 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/brand/sumolab-mark-orange.svg"
          alt=""
          width={48}
          height={46}
          className="h-12 w-auto"
        />
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-extrabold tracking-tight text-foreground">
            SumoLab
          </span>
          <span className="text-xl font-extrabold tracking-tight text-brand-strong">
            Web Wrench
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Sign in to get started
        </h1>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          Your audits, keyword research, and content grades are saved to your
          account so you can pick up where you left off.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/audit" });
        }}
      >
        <button
          type="submit"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground shadow-[0_1px_2px_rgba(36,28,21,0.04),0_12px_32px_-16px_rgba(36,28,21,0.18)] transition-colors hover:border-brand/40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.89c2.27-2.09 3.57-5.17 3.57-8.81z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.89-3.01c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.92H1.29v3.1C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.31 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.6H1.29A11.96 11.96 0 000 12c0 1.93.46 3.76 1.29 5.4l4.02-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.78c1.76 0 3.34.61 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l4.02 3.1c.94-2.82 3.58-4.92 6.69-4.92z"
            />
          </svg>
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
