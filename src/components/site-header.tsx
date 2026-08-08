"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";

const TOOLS = [
  { href: "/", label: "Site Audit", match: (path: string) => path === "/" || path.startsWith("/audits") },
  { href: "/keywords", label: "Keyword Ideas", match: (path: string) => path.startsWith("/keywords") },
  { href: "/grader", label: "Content Grader", match: (path: string) => path.startsWith("/grader") },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0 sm:px-8">
        <Logo />
        <nav className="scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 sm:mx-0">
          {TOOLS.map((tool) => {
            const active = tool.match(pathname);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
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
