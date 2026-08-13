import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

/**
 * Roles, in order of privilege.
 *
 * owner  full access, and the only role that can change other people's roles
 * admin  can see and act on everything except role changes
 * user   no admin access at all
 *
 * Stored on User rather than in an env allowlist so roles can be granted from
 * the UI without a redeploy, and so who is an admin is a fact in the database
 * that survives environment changes.
 */
export type Role = "owner" | "admin" | "user";

export function isRole(value: unknown): value is Role {
  return value === "owner" || value === "admin" || value === "user";
}

export function rankOf(role: string): number {
  if (role === "owner") return 2;
  if (role === "admin") return 1;
  return 0;
}

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: Role;
};

/** Current user's role, or null when signed out. */
export async function currentRole(): Promise<Role | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const row = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return isRole(row?.role) ? row.role : "user";
}

export async function isAdmin(): Promise<boolean> {
  const role = await currentRole();
  return role === "owner" || role === "admin";
}

/**
 * Page guard. Redirects rather than 403s, so a non-admin who guesses the URL
 * simply lands on their dashboard and learns nothing about what exists.
 */
export async function requireAdmin(minimum: Role = "admin"): Promise<AdminUser> {
  const sessionUser = await requireUser();
  const row = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, image: true, role: true },
  });

  const role: Role = isRole(row?.role) ? row.role : "user";
  if (rankOf(role) < rankOf(minimum)) {
    redirect("/dashboard");
  }

  return { id: row!.id, email: row!.email, name: row!.name, image: row!.image, role };
}

/** API guard. Returns the caller when allowed, otherwise null. */
export async function adminForApi(minimum: Role = "admin"): Promise<AdminUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const row = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, image: true, role: true },
  });
  if (!row) return null;

  const role: Role = isRole(row.role) ? row.role : "user";
  if (rankOf(role) < rankOf(minimum)) return null;

  return { id: row.id, email: row.email, name: row.name, image: row.image, role };
}

/** How many owners exist. Used to refuse demoting the last one. */
export async function ownerCount(): Promise<number> {
  return db.user.count({ where: { role: "owner" } });
}
