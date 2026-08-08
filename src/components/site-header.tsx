"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";

const TOOLS = [
  { href: "/", label: "Site Audit", match: (path: string) => path === "/" || path.startsWith("/audits") },
  { href: "/keywords", label: "Keyword Ideas", match: (path: string) => path.startsWith("/keywords") },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {TOOLS.map((tool) => {
            const active = tool.match(pathname);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand-strong text-brand-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tool.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
