import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { Inbox, Users, AlertTriangle, Ticket } from "lucide-react";
import { AdminStat } from "@/components/admin-stat";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin | renchit" };

/** Kept out of the component body: the purity rule rejects clock reads there. */
function sevenDaysAgo(): Date {
  return new Date(Date.now() - 7 * 86_400_000);
}

export default async function AdminHomePage() {
  const me = await requireAdmin();

  const since = sevenDaysAgo();
  const [newFeedback, totalUsers, admins, paying, comped, failures] = await Promise.all([
    db.feedback.count({ where: { status: "new" } }),
    db.user.count(),
    db.user.count({ where: { role: { in: ["owner", "admin"] } } }),
    db.subscription.count({
      where: { interval: { not: "comp" }, status: { in: ["active", "past_due"] } },
    }),
    db.subscription.count({ where: { interval: "comp" } }),
    Promise.all([
      db.audit.count({ where: { status: "failed", startedAt: { gte: since } } }),
      db.contentGrade.count({ where: { status: "failed", createdAt: { gte: since } } }),
      db.localListing.count({ where: { status: "failed", createdAt: { gte: since } } }),
      db.pageSpeedCheck.count({ where: { status: "failed", createdAt: { gte: since } } }),
      db.searchConsoleReport.count({ where: { status: "failed", createdAt: { gte: since } } }),
    ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-24 pt-8 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Admin</h1>
        <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-strong">
          {me.role}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as {me.email}. Only owners and admins can see this.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <AdminStat
          label="New reports"
          value={newFeedback}
          href="/admin/feedback?view=new"
          tone={newFeedback > 0 ? "brand" : "plain"}
        />
        <AdminStat
          label="Tool failures, 7 days"
          value={failures}
          href="/admin/feedback?view=failures"
          tone={failures > 0 ? "warning" : "plain"}
        />
        <AdminStat label="Accounts" value={totalUsers} href="/admin/users" />
        <AdminStat
          label="Paying"
          value={paying}
          href="/admin/users?filter=paying"
          sub={`${comped} comped, ${admins} admin`}
        />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Card
          href="/admin/feedback"
          icon={Inbox}
          title="Feedback"
          body="What people reported, and what failed without anyone reporting it."
        />
        <Card
          href="/admin/users"
          icon={Users}
          title="Users"
          body="Roles, complimentary access, and what plan everyone is on."
        />
        <Card
          href="/admin/discounts"
          icon={Ticket}
          title="Discount codes"
          body="Generate shared or single-use codes that work at checkout."
        />
      </div>

      {me.role !== "owner" && (
        <p className="mt-6 flex items-start gap-2 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          You are an admin, not an owner. You can see everything here and manage
          complimentary access, but only an owner can change roles.
        </p>
      )}
    </main>
  );
}

function Card({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: typeof Inbox;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-brand"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon className="h-4 w-4 text-brand-strong" aria-hidden />
        {title}
      </span>
      <span className="text-sm text-muted-foreground">{body}</span>
    </Link>
  );
}
