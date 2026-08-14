import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getEntitlements } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";
import { AlertsManager } from "@/components/alerts-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Alerts | renchit" };

export default async function AlertsPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user.id);
  const canMonitor = PLANS[ent.plan].monitoring !== "none";

  const [monitors, recipients, events] = await Promise.all([
    db.monitor.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.alertRecipient.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.alertEvent.findMany({
      where: { monitor: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { monitor: { select: { url: true } } },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-24 pt-8 sm:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Alerts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We check your site every few minutes and tell the people you choose the
        moment it stops responding.
      </p>

      <AlertsManager
        canMonitor={canMonitor}
        initialMonitors={monitors.map((m) => ({
          id: m.id,
          url: m.url,
          enabled: m.enabled,
          status: m.status,
          intervalMinutes: m.intervalMinutes,
          lastCheckedAt: m.lastCheckedAt?.toISOString() ?? null,
          lastResponseMs: m.lastResponseMs,
          lastError: m.lastError,
        }))}
        initialRecipients={recipients
          // Alerts are email only, so a contact with no address has nothing to
          // show. Older phone-only rows, if any, simply drop out of the list.
          .filter((r): r is typeof r & { email: string } => Boolean(r.email))
          .map((r) => ({ id: r.id, name: r.name, email: r.email }))}
        events={events.map((e) => ({
          id: e.id,
          kind: e.kind,
          url: e.monitor.url,
          notified: e.notified,
          downtimeMinutes: e.downtimeMinutes,
          at: e.createdAt.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        }))}
      />
    </main>
  );
}
