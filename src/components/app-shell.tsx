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
  BellRing,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResultsBell } from "@/components/results-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SIDEBAR_COOKIE = "renchit_sidebar_collapsed";

/**
 * Which groups the user has folded away, as a comma-separated list of
 * headings. Read on the server like the rail width, so a folded group renders
 * folded on the very first paint rather than snapping shut after hydration.
 */
export const SIDEBAR_GROUPS_COOKIE = "renchit_sidebar_closed_groups";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: (p: string) => boolean;
};

/**
 * Grouped by what the person is trying to do, not by how the tools are built.
 *
 * Someone opens the sidebar with a question in mind: is my site broken, what
 * should I write, is any of this working. Those are the three groups. Grouping
 * by mechanism instead would put Page Speed and Search Data together because
 * both call Google, which is true and useless to the reader.
 *
 * A null heading means the items sit at the top with no label, which is right
 * for Dashboard: it is not a category, it is the way back.
 */
const NAV_GROUPS: Array<{ heading: string | null; items: NavItem[] }> = [
  {
    heading: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
    ],
  },
  {
    heading: "Site health",
    items: [
      { href: "/audit", label: "Site Audit", icon: Wrench, match: (p) => p === "/audit" || p.startsWith("/audits") },
      { href: "/speed", label: "Page Speed", icon: Gauge, match: (p) => p.startsWith("/speed") },
      { href: "/local", label: "Local Listing", icon: MapPin, match: (p) => p.startsWith("/local") },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/keywords", label: "Keyword Ideas", icon: Lightbulb, match: (p) => p.startsWith("/keywords") },
      { href: "/grader", label: "Content Grader", icon: FileSearch, match: (p) => p.startsWith("/grader") },
    ],
  },
  {
    heading: "Alerts",
    items: [
      { href: "/alerts", label: "Uptime Alerts", icon: BellRing, match: (p) => p.startsWith("/alerts") },
    ],
  },
  {
    heading: "Traffic",
    items: [
      { href: "/search-console", label: "Search Data", icon: Search, match: (p) => p.startsWith("/search-console") },
    ],
  },
  {
    heading: "Workspace",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban, match: (p) => p.startsWith("/projects") },
    ],
  },
];

export function AppShell({
  children,
  defaultCollapsed = false,
  defaultClosedGroups = [],
  isAdmin = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  defaultClosedGroups?: string[];
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
  const [closedGroups, setClosedGroups] = useState<string[]>(defaultClosedGroups);

  function toggleGroup(heading: string) {
    setClosedGroups((prev) => {
      const next = prev.includes(heading)
        ? prev.filter((h) => h !== heading)
        : [...prev, heading];
      document.cookie = `${SIDEBAR_GROUPS_COOKIE}=${encodeURIComponent(next.join(","))}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  function toggle() {
    setAnimate(true);
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  const railWidth = collapsed ? "lg:w-[68px]" : "lg:w-60";

  // Appended rather than baked into the groups, so a non-admin never receives
  // the item at all, not even hidden in the markup.
  const groups = isAdmin
    ? [
        ...NAV_GROUPS,
        {
          heading: "Admin",
          items: [
            {
              href: "/admin",
              label: "Admin",
              icon: Inbox,
              match: (p: string) => p.startsWith("/admin"),
            },
          ],
        },
      ]
    : NAV_GROUPS;

  // The mobile strip is a horizontal row of icons with no room for headings,
  // so it takes every item in order and ignores the grouping.
  const flatNav = groups.flatMap((g) => g.items);

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
          {session?.user && <ResultsBell />}
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
              <DropdownMenuContent align="end" className="min-w-72 p-1.5">
                <div className="flex items-center gap-3 px-2.5 py-2.5">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={session.user.image ?? undefined} alt="" />
                    <AvatarFallback className="bg-brand-tint text-sm font-semibold text-brand-strong">
                      {session.user.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    {session.user.name && (
                      <p className="text-sm font-semibold text-foreground">
                        {session.user.name}
                      </p>
                    )}
                    {/* No truncation: the whole address is shown, wrapping to
                        a second line rather than being cut off, however long
                        it is. */}
                    <p className="break-all text-xs leading-snug text-muted-foreground">
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
          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
            {groups.map((group, groupIndex) => {
              // A folded group stays folded when the rail is icon-only too,
              // except there is no heading to unfold it with, so icon mode
              // always shows everything.
              const isClosed = !collapsed && group.heading !== null && closedGroups.includes(group.heading);
              return (
              <div key={group.heading ?? "top"} className={groupIndex > 0 ? "mt-3" : ""}>
                {/* Collapsed to icons there is no room for a word, so the
                    heading becomes a rule. Dropping it entirely would run the
                    groups together into one undifferentiated column. */}
                {group.heading &&
                  (collapsed ? (
                    <div className="mx-2 mb-2 h-px bg-shell-border" aria-hidden />
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.heading!)}
                      aria-expanded={!isClosed}
                      className="flex w-full items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-shell-muted/70 transition-colors hover:text-shell-foreground"
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${
                          isClosed ? "-rotate-90" : ""
                        }`}
                        aria-hidden
                      />
                      <span className="truncate">{group.heading}</span>
                    </button>
                  ))}

                <ul className={`flex flex-col gap-0.5 ${isClosed ? "hidden" : ""}`}>
                  {group.items.map((item) => {
                    const active = item.match(pathname);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={`flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-shell-active text-shell-foreground"
                              : "text-shell-muted hover:bg-shell-hover hover:text-shell-foreground"
                          } ${
                            collapsed
                              ? "justify-center px-2.5"
                              : group.heading
                                ? "pl-6 pr-2.5"
                                : "px-2.5"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {collapsed && <span className="sr-only">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              );
            })}
          </div>

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
          {flatNav.map((item) => {
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
