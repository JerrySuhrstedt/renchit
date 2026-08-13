"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check, Ticket, AlertTriangle } from "lucide-react";

type Discount = {
  id: string;
  code: string | null;
  description: string;
  status: string;
  type: string;
  amount: string;
  usageLimit: number | null;
  timesUsed: number;
  recur: boolean;
  expiresAt: string | null;
};

type PlanOption = { key: string; name: string; priceIds: string[] };

/**
 * Two shapes cover almost every real campaign, so the form leads with the
 * choice between them rather than making you infer it from a quantity field.
 *
 * A shared code is one string everybody types. A batch is N unique codes, each
 * good once. The batch is how you get "one use per person": Paddle's usage
 * limit is a total cap across everyone, not per customer, so handing each
 * person their own single-use code is the only way to actually enforce it.
 */
type Mode = "shared" | "unique";

export function DiscountManager({
  initial,
  planOptions,
}: {
  initial: Discount[];
  planOptions: PlanOption[];
}) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("shared");
  const [kind, setKind] = useState<"percentage" | "flat">("percentage");
  const [value, setValue] = useState("20");
  const [description, setDescription] = useState("");
  const [prefix, setPrefix] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [recur, setRecur] = useState(false);
  const [restrictTo, setRestrictTo] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const numericValue = Number(value) || 0;
  const localWarnings: string[] = [];
  if (kind === "percentage" && numericValue === 100) {
    localWarnings.push("100% off means they pay nothing at all.");
  } else if (kind === "percentage" && numericValue > 50) {
    localWarnings.push(`${numericValue}% off is steep. Sure?`);
  }
  if (!expiresInDays) {
    localWarnings.push("No expiry. Codes that never die resurface on coupon sites.");
  }
  if (mode === "shared" && !usageLimit) {
    localWarnings.push("Unlimited uses on a shared code. If it leaks, everyone gets it.");
  }

  async function create() {
    setBusy(true);
    setError(null);
    setJustCreated([]);
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          value: numericValue,
          description,
          prefix,
          quantity: mode === "unique" ? Number(quantity) || 1 : 1,
          // A unique batch is single-use by definition. A shared code uses
          // whatever cap you typed, or none.
          usageLimit: mode === "unique" ? 1 : usageLimit ? Number(usageLimit) : null,
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
          recur,
          maximumRecurringIntervals: null,
          restrictTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create that code.");
        return;
      }
      setJustCreated(data.created.map((c: { code: string }) => c.code));
      if (data.failed?.length > 0) {
        setError(`${data.failed.length} of ${data.created.length + data.failed.length} failed.`);
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "archived" | "active") {
    await fetch(`/api/admin/discounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  function copyAll() {
    navigator.clipboard.writeText(justCreated.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Create */}
      <div className="mt-8 rounded-3xl border border-border bg-card px-6 py-6 sm:px-8">
        <h2 className="text-sm font-bold text-foreground">Create codes</h2>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <ModeCard
            active={mode === "shared"}
            onClick={() => setMode("shared")}
            title="One shared code"
            body="A single code everyone types. Good for a launch or a newsletter."
          />
          <ModeCard
            active={mode === "unique"}
            onClick={() => setMode("unique")}
            title="Unique single-use codes"
            body="A batch, each good once. This is how you limit it to one per person."
          />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Discount">
            <div className="flex gap-2">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as "percentage" | "flat")}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
              >
                <option value="percentage">Percent off</option>
                <option value="flat">Dollars off</option>
              </select>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min={1}
                className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
              />
              <span className="self-center text-sm text-muted-foreground">
                {kind === "percentage" ? "%" : "USD"}
              </span>
            </div>
          </Field>

          <Field label="Name it, for your own records">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Launch week"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
            />
          </Field>

          <Field label="Code prefix, optional">
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="LAUNCH"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm uppercase text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus:border-brand"
            />
          </Field>

          {mode === "unique" ? (
            <Field label="How many codes">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
                max={200}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
              />
            </Field>
          ) : (
            <Field label="Total uses, blank for unlimited">
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                min={1}
                placeholder="Unlimited"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
              />
            </Field>
          )}

          <Field label="Expires in, days">
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              min={1}
              placeholder="Never"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
            />
          </Field>

          <Field label="Applies to">
            <div className="flex flex-wrap gap-1.5">
              <Chip active={restrictTo.length === 0} onClick={() => setRestrictTo([])}>
                All plans
              </Chip>
              {planOptions.map((p) => {
                const on = p.priceIds.every((id) => restrictTo.includes(id));
                return (
                  <Chip
                    key={p.key}
                    active={on}
                    onClick={() =>
                      setRestrictTo((prev) =>
                        on
                          ? prev.filter((id) => !p.priceIds.includes(id))
                          : [...prev, ...p.priceIds],
                      )
                    }
                  >
                    {p.name}
                  </Chip>
                );
              })}
            </div>
          </Field>
        </div>

        <label className="mt-4 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={recur}
            onChange={(e) => setRecur(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--brand-strong)]"
          />
          <span className="text-muted-foreground">
            Apply to every renewal, not just the first payment.{" "}
            <span className="text-foreground">
              They keep the discount for as long as they stay subscribed.
            </span>
          </span>
        </label>

        {localWarnings.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5">
            {localWarnings.map((w) => (
              <li key={w} className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mt-4 text-sm font-semibold text-critical">{error}</p>}

        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-strong px-6 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          {mode === "unique" ? `Create ${quantity || 0} codes` : "Create code"}
        </button>
      </div>

      {/* Just created */}
      {justCreated.length > 0 && (
        <div className="mt-6 rounded-3xl border border-success/40 bg-success-tint px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground">
              Created {justCreated.length} code{justCreated.length === 1 ? "" : "s"}
            </h2>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy all"}
            </button>
          </div>
          <pre className="mt-3 max-h-52 overflow-y-auto whitespace-pre-wrap break-all font-mono text-sm text-foreground">
            {justCreated.join("\n")}
          </pre>
        </div>
      )}

      {/* Existing */}
      <h2 className="mt-10 text-sm font-bold text-foreground">
        All codes ({initial.length})
      </h2>
      {initial.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          No codes yet.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {initial.map((d) => (
            <li
              key={d.id}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-5 py-3 ${
                d.status === "archived" ? "border-border opacity-60" : "border-border"
              }`}
            >
              <code className="font-mono text-sm font-bold text-foreground">{d.code}</code>
              <span className="text-sm text-muted-foreground">
                {d.type === "percentage" ? `${d.amount}% off` : `$${Number(d.amount) / 100} off`}
                {d.recur ? ", every renewal" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                used {d.timesUsed}
                {d.usageLimit ? ` of ${d.usageLimit}` : ""}
              </span>
              {d.expiresAt && (
                <span className="text-xs text-muted-foreground">
                  expires {new Date(d.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    d.status === "active"
                      ? "bg-success-tint text-success"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {d.status}
                </span>
                <button
                  type="button"
                  onClick={() => setStatus(d.id, d.status === "active" ? "archived" : "active")}
                  className="rounded-xl border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand-strong"
                >
                  {d.status === "active" ? "Archive" : "Restore"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-colors ${
        active ? "border-brand bg-brand-tint" : "border-border hover:border-brand"
      }`}
    >
      <span className="text-sm font-bold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{body}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-brand-strong text-brand-foreground"
          : "border border-border text-muted-foreground hover:border-brand hover:text-brand-strong"
      }`}
    >
      {children}
    </button>
  );
}
