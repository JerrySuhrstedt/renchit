import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

/**
 * Who can see the admin pages.
 *
 * An env var rather than a database role, because with a handful of admins a
 * role table is machinery without a payoff, and an allowlist cannot be
 * escalated into by anything that goes wrong in the app itself.
 */
function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "jerry@sumolab.co";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** Redirects non-admins to the dashboard rather than showing a 403. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }
  return user;
}
