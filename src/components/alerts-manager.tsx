"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Trash2, Mail, CircleCheck, CircleX,
  CircleDashed, Pause, Play, X, TriangleAlert,
} from "lucide-react";

type Recipient = {
  id: string;
  name: string | null;
  email: string;
};

type Monitor = {
  id: string;
  url: string;
  enabled: boolean;
  status: string;
  intervalMinutes: number;
  lastCheckedAt: string | null;
  lastResponseMs: number | null;
  lastError: string | null;
  recipients: Recipient[];
};

type Event = {
  id: string;
  kind: string;
  url: string;
  notified: number;
  downtimeMinutes: number | null;
  at: string;
};

export function AlertsManager({
  canMonitor,
  initialMonitors,
  events,
}: {
  canMonitor: boolean;
  initialMonitors: Monitor[];
  events: Event[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addMonitor() {
    if (!url.trim()) return setError("Enter the address of the site to watch.");
    if (!email.trim()) return setError("Enter who should be emailed if it goes down.");

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not add that site.");
      setUrl("");
      setEmail("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleMonitor(m: Monitor) {
    await fetch(`/api/monitors/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !m.enabled }),
    });
    router.refresh();
  }

  async function removeMonitor(m: Monitor) {
    const host = hostOf(m.url);
    if (!window.confirm(`Stop watching ${host}? Nobody will be told if it goes down.`)) return;
    await fetch(`/api/monitors/${m.id}`, { method: "DELETE" });
    router.refresh();
  }

  if (!canMonitor) {
    return (
      <div className="mt-8 rounded-3xl border border-border bg-card px-6 py-8 text-center sm:px-8">
        <h2 className="text-lg font-bold text-foreground">Alerts are on the paid plans</h2>
        <p className="mx-auto mt-2 max-w-md text-balance text-sm text-muted-foreground">
          We check your site every few minutes and email you the moment it goes
          down, then again when it comes back. Nobody has to remember to look.
        </p>
        <Link
          href="/pricing"
          className="mt-5 inline-flex items-center justify-center rounded-2xl bg-brand-strong px-6 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90"
        >
          See plans
        </Link>
      </div>
    );
  }

  return (
    <>
      <section className="mt-8">
        <h2 className="text-sm font-bold text-foreground">Watch a site</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each site has its own list of people. Whoever looks after the shop
          site does not get woken up about a different one.
        </p>

        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-muted-foreground">Website</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yoursite.com"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-muted-foreground">
                Who to email if it goes down
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="them@example.com"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addMonitor}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand-strong px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Watch this site
            </button>
            {error && <p className="text-sm font-semibold text-critical">{error}</p>}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-foreground">Sites we watch</h2>

        {initialMonitors.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-center text-sm text-muted-foreground">
            Nothing being watched yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {initialMonitors.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-card px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusDot status={m.enabled ? m.status : "paused"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {hostOf(m.url)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {!m.enabled
                        ? "Paused"
                        : m.lastCheckedAt
                          ? `Checked every ${m.intervalMinutes} min${m.lastResponseMs ? ` · responded in ${m.lastResponseMs} ms` : ""}`
                          : "Waiting for the first check"}
                      {m.enabled && m.status === "down" && m.lastError ? ` · ${m.lastError}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMonitor(m)}
                    title={m.enabled ? "Pause" : "Resume"}
                    className="rounded-xl border border-border p-2 text-muted-foreground hover:border-brand hover:text-brand-strong"
                  >
                    {m.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMonitor(m)}
                    title="Stop watching"
                    className="rounded-xl border border-border p-2 text-muted-foreground hover:border-critical hover:text-critical"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <RecipientList monitor={m} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold text-foreground">Recent alerts</h2>
        {events.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
            Nothing has gone wrong yet, which is the idea.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 text-sm"
              >
                {e.kind === "down" ? (
                  <CircleX className="h-4 w-4 shrink-0 text-critical" aria-hidden />
                ) : (
                  <CircleCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {hostOf(e.url)} {e.kind === "down" ? "went down" : "came back"}
                  {e.downtimeMinutes ? ` after ${e.downtimeMinutes} min` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {e.notified} sent · {e.at}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** The people told about one specific site. */
function RecipientList({ monitor }: { monitor: Monitor }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!email.trim()) return setError("Enter an email address.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/alert-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), monitorId: monitor.id }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not add that contact.");
      setEmail("");
      setAdding(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    const res = await fetch(`/api/alert-recipients?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      return setError(data.error ?? "Could not remove that contact.");
    }
    router.refresh();
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Sites added before contacts were required can still have nobody on
          them. Being checked with nobody to tell looks like monitoring and
          is not, so it says so rather than sitting there quietly empty. */}
      {monitor.recipients.length === 0 && (
        <p className="mb-2 flex items-start gap-2 rounded-xl bg-warning-tint px-3 py-2 text-xs font-semibold text-warning">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          Nobody is being told if this site goes down. Add someone below.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Told if this goes down
        </span>
        {monitor.recipients.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-2.5 pr-1.5 text-xs"
          >
            <Mail className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="max-w-[16rem] truncate text-foreground">{r.email}</span>
            <button
              type="button"
              onClick={() => remove(r.id)}
              title={`Remove ${r.email}`}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-critical-tint hover:text-critical"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {adding ? (
          <span className="inline-flex items-center gap-1.5">
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="them@example.com"
              className="w-52 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
            />
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="rounded-full bg-brand-strong px-3 py-1 text-xs font-semibold text-brand-foreground disabled:opacity-60"
            >
              {busy ? "Adding" : "Add"}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand-strong"
          >
            <Plus className="h-3 w-3" />
            Add person
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-critical">{error}</p>}
    </div>
  );
}

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function StatusDot({ status }: { status: string }) {
  if (status === "up") return <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-label="Up" />;
  if (status === "down") return <CircleX className="h-5 w-5 shrink-0 text-critical" aria-label="Down" />;
  if (status === "paused") return <Pause className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="Paused" />;
  return <CircleDashed className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="Not checked yet" />;
}
