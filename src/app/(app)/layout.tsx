import { cookies } from "next/headers";
import { AppShell, SIDEBAR_COOKIE } from "@/components/app-shell";
import { FeedbackWidget } from "@/components/feedback-widget";
import { isAdmin } from "@/lib/admin";

/**
 * Wraps every signed-in tool page. Living in a route group means the shell is
 * a real layout; the sidebar keeps its state across navigation instead of
 * remounting on each page. Reading the collapse preference here (rather than
 * from localStorage on the client) means the rail renders at the correct
 * width on the very first paint.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const collapsed = store.get(SIDEBAR_COOKIE)?.value === "1";
  const admin = await isAdmin();

  return (
    <AppShell defaultCollapsed={collapsed} isAdmin={admin}>
      {children}
      <FeedbackWidget />
    </AppShell>
  );
}
