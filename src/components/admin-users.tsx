"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Gift, ShieldCheck } from "lucide-react";

const ROLE_STYLE: Record<string, string> = {
  owner: "bg-brand-strong text-brand-foreground",
  admin: "bg-brand-tint text-brand-strong",
  user: "bg-secondary text-muted-foreground",
};

export function UserRow({
  id,
  email,
  name,
  image,
  role: initialRole,
  access,
  isComp: initialComp,
  joined,
  isSelf,
  callerIsOwner,
  isLastOwner,
}: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  access: string;
  isComp: boolean;
  joined: string;
  isSelf: boolean;
  callerIsOwner: boolean;
  isLastOwner: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(initialRole);
  const [comp, setComp] = useState(initialComp);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That did not work.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(next: string) {
    const prev = role;
    setRole(next);
    if (!(await patch({ role: next }, "role"))) setRole(prev);
  }

  async function toggleComp() {
    const next = !comp;
    setComp(next);
    if (!(await patch({ comp: next }, "comp"))) setComp(!next);
  }

  return (
    <li className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand-strong">
            {(name ?? email)[0]?.toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
            <span className="truncate">{name ?? email}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ROLE_STYLE[role] ?? ROLE_STYLE.user}`}>
              {role}
            </span>
            {comp && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2 py-0.5 text-xs font-bold text-success">
                <Gift className="h-3 w-3" aria-hidden />
                comped
              </span>
            )}
            {isSelf && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {email} · {access} · joined {joined}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleComp}
            disabled={busy !== null}
            title={comp ? "Remove complimentary access" : "Give free access to everything"}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              comp
                ? "border-success/40 bg-success-tint text-success"
                : "border-border text-muted-foreground hover:border-brand hover:text-brand-strong"
            }`}
          >
            {busy === "comp" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Gift className="h-3.5 w-3.5" />
            )}
            {comp ? "Comped" : "Comp"}
          </button>

          {callerIsOwner && (
            <select
              value={role}
              onChange={(e) => changeRole(e.target.value)}
              disabled={busy !== null || isLastOwner}
              title={
                isLastOwner
                  ? "This is the last owner. Promote someone else before changing it."
                  : "Change role"
              }
              className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-brand disabled:opacity-50"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
          )}
        </div>
      </div>

      {isLastOwner && callerIsOwner && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          Last owner. Promote someone else before changing this, or nobody can
          administer the site.
        </p>
      )}

      {error && <p className="mt-2 text-sm font-semibold text-critical">{error}</p>}
    </li>
  );
}
