import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { MailCheck } from "lucide-react";

export const metadata = { title: "Check your email | renchit" };

export default async function CheckEmailPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-5 py-16">
      <Logo />

      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-border bg-card px-7 py-9 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
          <MailCheck className="h-7 w-7 text-brand-strong" aria-hidden />
        </div>

        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="text-balance text-sm text-muted-foreground">
          We sent you a sign-in link. Click it and you are straight in, no
          password needed. It works once and expires in 24 hours.
        </p>

        <p className="text-balance text-xs text-muted-foreground">
          Nothing after a minute or two? Check your spam folder. Some mail
          providers hold the first message from a new sender.
        </p>

        <Link
          href="/sign-in"
          className="mt-1 text-sm font-semibold text-brand-strong hover:underline"
        >
          Use a different email
        </Link>
      </div>
    </main>
  );
}
