import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * Chrome for the public legal pages. Deliberately not the marketing
 * LandingHeader — that one's nav is same-page anchors (#tools, #faq) which
 * point at nothing here.
 */
export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo />
          <Link
            href="/"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-12 sm:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </p>

        <div className="mt-10 flex flex-col gap-8">{children}</div>

        <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>
            SumoLab LLC · Chandler, Arizona ·{" "}
            <a
              href="https://sumolab.co"
              className="font-medium text-brand-strong hover:underline"
            >
              sumolab.co
            </a>
          </p>
          <p className="mt-2">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </p>
        </footer>
      </main>
    </>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-foreground">{heading}</h2>
      <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
