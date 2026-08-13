import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getEntitlements } from "@/lib/entitlements";
import { UserRow } from "@/components/admin-users";
import { FilterChips } from "@/components/admin-stat";

export const dynamic = "force-dynamic";

export const metadata = { title: "Users | renchit" };

const FILTERS = ["all", "paying", "comped", "trial", "free", "admins"] as const;
type Filter = (typeof FILTERS)[number];

const LABELS: Record<Filter, string> = {
  all: "All",
  paying: "Paying",
  comped: "Comped",
  trial: "On trial",
  free: "Free",
  admins: "Admins",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const me = await requireAdmin();
  const { filter: raw } = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as Filter)
    : "all";

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
    },
  });

  // Entitlements rather than the raw subscription row, so what is shown is
  // exactly what that person actually gets, trials and lapses included.
  const rows = await Promise.all(
    users.map(async (u) => {
      const ent = await getEntitlements(u.id);
      return {
        ...u,
        access: ent.isComp ? "comp" : `${ent.plan}/${ent.status}`,
        isComp: ent.isComp,
        // "Paying" deliberately excludes comps: they have paid access without
        // having paid, and counting them as revenue would be a lie.
        isPaying: ent.isPaid && !ent.isComp,
        isTrial: ent.plan === "trial",
        isFree: ent.plan === "free",
        isAdmin: u.role === "owner" || u.role === "admin",
      };
    }),
  );

  const matches = (r: (typeof rows)[number], f: Filter) =>
    f === "all" ||
    (f === "paying" && r.isPaying) ||
    (f === "comped" && r.isComp) ||
    (f === "trial" && r.isTrial) ||
    (f === "free" && r.isFree) ||
    (f === "admins" && r.isAdmin);

  const visible = rows.filter((r) => matches(r, filter));
  const owners = rows.filter((r) => r.role === "owner").length;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-24 pt-8 sm:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {rows.length} account{rows.length === 1 ? "" : "s"}.{" "}
        {me.role === "owner"
          ? "You can change roles and complimentary access."
          : "Only an owner can change roles."}
      </p>

      <FilterChips
        basePath="/admin/users"
        active={filter}
        options={FILTERS.map((f) => ({
          key: f,
          label: LABELS[f],
          count: rows.filter((r) => matches(r, f)).length,
        }))}
      />

      {visible.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          No accounts match that filter.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {visible.map((u) => (
            <UserRow
              key={u.id}
              id={u.id}
              email={u.email ?? "(no email)"}
              name={u.name}
              image={u.image}
              role={u.role}
              access={u.access}
              isComp={u.isComp}
              joined={u.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              isSelf={u.id === me.id}
              callerIsOwner={me.role === "owner"}
              // Surfaced so the UI can explain why the control is disabled,
              // rather than letting someone click into a server-side refusal.
              isLastOwner={u.role === "owner" && owners <= 1}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
