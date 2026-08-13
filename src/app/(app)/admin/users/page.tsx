import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getEntitlements } from "@/lib/entitlements";
import { UserRow } from "@/components/admin-users";

export const dynamic = "force-dynamic";

export const metadata = { title: "Users | renchit" };

export default async function AdminUsersPage() {
  const me = await requireAdmin();

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      subscription: { select: { interval: true } },
    },
  });

  // Entitlements rather than the raw subscription row, so what is shown here
  // is exactly what that person actually gets, trials and lapses included.
  const rows = await Promise.all(
    users.map(async (u) => {
      const ent = await getEntitlements(u.id);
      return {
        ...u,
        access: ent.isComp ? "comp" : `${ent.plan}/${ent.status}`,
        isComp: ent.isComp,
      };
    }),
  );

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

      <ul className="mt-8 flex flex-col gap-2">
        {rows.map((u) => (
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
    </main>
  );
}
