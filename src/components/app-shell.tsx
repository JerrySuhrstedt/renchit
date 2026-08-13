"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Wrench,
  Lightbulb,
  FileSearch,
  MapPin,
  Gauge,
  Search,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  CreditCard,
  Inbox,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SIDEBAR_COOKIE = "renchit_sidebar_collapsed";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
  { href: "/audit", label: "Site Audit", icon: Wrench, match: (p: string) => p === "/audit" || p.startsWith("/audits") },
  { href: "/keywords", label: "Keyword Ideas", icon: Lightbulb, match: (p: string) => p.startsWith("/keywords") },
  { href: "/grader", label: "Content Grader", icon: FileSearch, match: (p: string) => p.startsWith("/grader") },
  { href: "/local", label: "Local Listing", icon: MapPin, match: (p: string) => p.startsWith("/local") },
  { href: "/speed", label: "Page Speed", icon: Gauge, match: (p: string) => p.startsWith("/speed") },
  { href: "/search-console", label: "Search Data", icon: Search, match: (p: string) => p.startsWith("/search-console") },
  { href: "/projects", label: "Projects", icon: FolderKanban, match: (p: string) => p.startsWith("/projects") },
];

export function AppShell({
  children,
  defaultCollapsed = false,
  isAdmin = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  // Seeded from a cookie the server already read, so the rail renders at the
  // right width on first paint, with no post-hydration snap and no effect.
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  // Suppress the width transition until the user actually toggles, otherwise
  // a collapsed rail animates open on every page load.
  const [animate, setAnimate] = useState(false);

  function toggle() {
    setAnimate(true);
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  const railWidth = collapsed ? "lg:w-[68px]" : "lg:w-60";

  // Appended rather than added to NAV, so a non-admin never receives the item
  // at all, not even hidden in the markup.
  const nav = isAdmin
    ? [
        ...NAV,
        {
          href: "/admin",
          label: "Admin",
          icon: Inbox,
          match: (p: string) => p.startsWith("/admin"),
        },
      ]
    : NAV;

  return (
    <div className="min-h-dvh bg-shell">
      {/* Top bar: dark, full width, meeting the sidebar in the corner */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-shell px-4">
        <Link
          href="/dashboard"
          className={`flex shrink-0 items-center transition-all ${collapsed ? "lg:w-[52px]" : "lg:w-[208px]"}`}
        >
          <Image
            src="/brand/renchit-logo-white.svg"
            alt="renchit"
            width={549}
            height={118}
            className={collapsed ? "h-5 w-auto lg:hidden" : "h-5 w-auto"}
            priority
          />
          {collapsed && (
            <span className="hidden h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-extrabold text-brand-foreground lg:flex">
              r
            </span>
          )}
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none ring-brand focus-visible:ring-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-brand-tint text-xs font-semibold text-brand-strong">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center gap-3 px-2 py-1.5">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.user.image ?? undefined} alt="" />
                    <AvatarFallback className="bg-brand-tint text-sm font-semibold text-brand-strong">
                      {session.user.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    {session.user.name && (
                      <p className="truncate text-sm font-semibold text-foreground">
                        {session.user.name}
                      </p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/profile" />}>
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/billing" />}>
                  <CreditCard className="h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ redirectTo: "/sign-in" })}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar: horizontal scroller on small screens, fixed rail on lg+ */}
        <nav
          aria-label="Tools"
          className={`sticky top-14 z-30 hidden h-[calc(100dvh-3.5rem)] shrink-0 flex-col bg-shell pb-3 lg:flex ${railWidth} ${animate ? "transition-[width] duration-200" : ""}`}
        >
          <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
            {nav.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-shell-active text-shell-foreground"
                        : "text-shell-muted hover:bg-shell-hover hover:text-shell-foreground"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {collapsed && <span className="sr-only">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="px-3">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand navigation" : "Collapse navigation"}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-shell-muted transition-colors hover:bg-shell-hover hover:text-shell-foreground ${
                collapsed ? "justify-center" : ""
              }`}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" aria-hidden />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" aria-hidden />
              )}
              {!collapsed && <span>Collapse</span>}
              <span className="sr-only">
                {collapsed ? "Expand navigation" : "Collapse navigation"}
              </span>
            </button>
          </div>
        </nav>

        {/* Mobile tool strip */}
        <nav
          aria-label="Tools"
          className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto bg-shell px-3 py-2 lg:hidden"
        >
          {nav.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-shell-active text-shell-foreground"
                    : "text-shell-muted hover:text-shell-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 rounded-tl-2xl bg-background pb-24 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
