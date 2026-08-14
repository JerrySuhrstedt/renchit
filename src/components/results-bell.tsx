"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";

type Item = {
  id: string;
  href: string;
  tool: string;
  target: string;
  score: number | null;
  at: string | null;
};

/**
 * Tells the user their results are ready.
 *
 * Audits run on the server, so people are told they can close the tab. That
 * promise is only worth anything if something tells them when to come back,
 * which is what this is.
 */
const POLL_MS = 15_000;

export function ResultsBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setItems(data.items ?? []);
        setRunning(data.running ?? 0);
      } catch {
        // A failed poll is not worth surfacing. The next one will do.
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    // Opening the panel is what "seen" means, so clear the badge then.
    if (next && items.length > 0) {
      await fetch("/api/notifications", { method: "POST" }).catch(() => {});
    }
  }

  const badge = items.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={
          badge > 0 ? `${badge} finished result${badge === 1 ? "" : "s"}` : "Results"
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-shell-muted transition-colors hover:bg-shell-hover hover:text-shell-foreground"
      >
        {running > 0 ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
        ) : (
          <Bell className="h-[18px] w-[18px]" aria-hidden />
        )}
        {badge > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-brand-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away layer, so the panel closes like a menu should */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border bg-popover p-2 shadow-xl">
            {running > 0 && (
              <p className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                {running} still running. You can close this tab, it keeps going.
              </p>
            )}

            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {running > 0 ? "Nothing finished yet." : "No new results."}
              </p>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => (
                  <li key={`${item.tool}-${item.id}`}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {item.tool}
                          {item.score !== null && ` · ${item.score}`}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.target.replace(/^https?:\/\//, "")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
