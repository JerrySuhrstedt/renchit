import Link from "next/link";
import { Logo } from "@/components/logo";

const NAV_LINKS = [
  { href: "#tools", label: "Tools" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          href="/sign-in"
          className="shrink-0 whitespace-nowrap rounded-full bg-brand-strong px-3.5 py-2 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90 sm:px-5 sm:text-sm"
        >
          Get Started Free
        </Link>
      </div>
    </header>
  );
}
