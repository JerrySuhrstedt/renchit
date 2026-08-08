"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TOOLS = [
  { href: "/", label: "Site Audit", match: (path: string) => path === "/" || path.startsWith("/audits") },
  { href: "/keywords", label: "Keyword Ideas", match: (path: string) => path.startsWith("/keywords") },
  { href: "/grader", label: "Content Grader", match: (path: string) => path.startsWith("/grader") },
  { href: "/projects", label: "Projects", match: (path: string) => path.startsWith("/projects") },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none ring-brand focus-visible:ring-2 sm:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-brand-tint text-xs font-semibold text-brand-strong">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="truncate">
                  {session.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectTo: "/sign-in" })}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
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

          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden shrink-0 rounded-full outline-none ring-brand focus-visible:ring-2 sm:block">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session.user.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-brand-tint text-sm font-semibold text-brand-strong">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="truncate">
                  {session.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectTo: "/sign-in" })}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
