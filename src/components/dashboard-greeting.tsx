"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Nothing to subscribe to — the value never changes after hydration. This is
// just React's hydration-safe way to ask "am I on the client yet?", which
// avoids the cascading re-render an effect would cause.
const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * The greeting and date are computed client-side on purpose: the server runs
 * in UTC, so a server-rendered greeting would tell someone in Arizona "good
 * morning" at dinnertime.
 */
export function DashboardGreeting({ name }: { name: string | null }) {
  const isClient = useSyncExternalStore(noopSubscribe, onClient, onServer);
  const now = isClient ? new Date() : null;

  return (
    <div>
      {now && (
        <p className="text-sm text-muted-foreground">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {now ? greetingFor(now.getHours()) : "Welcome back"}
        {name ? `, ${name.split(" ")[0]}` : ""}
      </h1>
    </div>
  );
}
