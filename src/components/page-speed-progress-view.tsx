"use client";

import { hostnameOf } from "@/lib/format";
import { SpeedSpinner } from "@/components/speed-spinner";

export function PageSpeedProgressView({ url }: { url: string }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 px-5 py-24 text-center">
      <SpeedSpinner />

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Testing {hostnameOf(url)}
        </h1>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Running Google&apos;s real PageSpeed test on mobile and desktop…
        </p>
      </div>

      <p className="max-w-sm text-balance text-sm text-muted-foreground">
        This runs on our servers, so you can close this tab or go do something
        else. We will put a mark on the bell at the top when it is ready.
      </p>
    </div>
  );
}
