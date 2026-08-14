"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Trash2, Mail, CircleCheck, CircleX,
  CircleDashed, Pause, Play,
} from "lucide-react";

type Monitor = {
  id: string;
  url: string;
  enabled: boolean;
  status: string;
  intervalMinutes: number;
  lastCheckedAt: string | null;
  lastResponseMs: number | null;
  lastError: string | null;
};

type Recipient = {
  id: string;
  name: string | null;
  email: string;
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
  initialRecipients,
  events,
}: {
  canMonitor: boolean;
  initialMonitors: Monitor[];
  initialRecipients: Recipient[];
  events: Event[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);

  async function addMonitor() {
    if (!url.trim()) return setError("Enter the address of the site to watch.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not add that site.");
      setUrl("");
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

  async function removeMonitor(id: string) {
    if (!window.confirm("Stop watching this site?")) return;
    await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addRecipient() {
    setAddingPerson(true);
    setPersonError(null);
    try {
      const res = await fetch("/api/alert-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) return setPersonError(data.error ?? "Could not add that contact.");
      setName(""); setEmail("");
      router.refresh();
    } finally {
      setAddingPerson(false);
    }
  }

  async function removeRecipient(id: string) {
    await fetch(`/api/alert-recipients?id=${id}`, { method: "DELETE" });
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
      {/* Sites */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-foreground">Sites we watch</h2>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yoursite.com"
            className="flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
          />
          <button
            type="button"
            onClick={addMonitor}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand-strong px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Watch this site
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-critical">{error}</p>}

        {initialMonitors.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-center text-sm text-muted-foreground">
            Nothing being watched yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {initialMonitors.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5"
              >
                <StatusDot status={m.enabled ? m.status : "paused"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {m.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
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
                  onClick={() => removeMonitor(m.id)}
                  title="Stop watching"
                  className="rounded-xl border border-border p-2 text-muted-foreground hover:border-critical hover:text-critical"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* People */}
      <section className="mt-10">
        <h2 className="text-sm font-bold text-foreground">Who gets told</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Anyone here hears the moment a site goes down, and again when it comes
          back. Nothing in between, so it stays worth reading.
        </p>

        {initialRecipients.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {initialRecipients.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3"
              >
                {/* Without a name the email is the name, so printing it on
                    both lines just says the same thing twice. */}
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {r.name ? (
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {r.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.email}
                      </span>
                    </span>
                  ) : (
                    <span className="truncate text-sm font-semibold text-foreground">
                      {r.email}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRecipient(r.id)}
                  className="rounded-xl border border-border p-2 text-muted-foreground hover:border-critical hover:text-critical"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="them@example.com"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
          />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={addRecipient}
              disabled={addingPerson}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-brand hover:text-brand-strong disabled:opacity-60"
            >
              {addingPerson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add contact
            </button>
            {personError && <p className="text-sm font-semibold text-critical">{personError}</p>}
          </div>
        </div>
      </section>

      {/* History */}
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
                  {e.url.replace(/^https?:\/\//, "")} {e.kind === "down" ? "went down" : "came back"}
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

function StatusDot({ status }: { status: string }) {
  if (status === "up") return <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-label="Up" />;
  if (status === "down") return <CircleX className="h-5 w-5 shrink-0 text-critical" aria-label="Down" />;
  if (status === "paused") return <Pause className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="Paused" />;
  return <CircleDashed className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="Not checked yet" />;
}
