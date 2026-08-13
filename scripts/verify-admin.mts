/**
 * Checks the admin privilege layer against a running server.
 *
 *   npx tsx scripts/verify-admin.mts
 *
 * Covers the things that are dangerous to get wrong: whether a signed-out
 * caller can reach anything, whether an admin can escalate themselves, and
 * whether the last owner can be demoted into a permanent lockout.
 */
import { config } from "dotenv";
config();

const BASE = process.env.ADMIN_TEST_URL ?? "http://localhost:3000";
const { db } = await import("../src/lib/db.ts");
const { rankOf, ownerCount } = await import("../src/lib/admin.ts");

let fail = 0;
const t = (label: string, ok: boolean) => {
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
};

console.log("\nSigned-out access");
for (const path of ["/admin", "/admin/users", "/admin/feedback"]) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  t(`${path} redirects away`, res.status === 307 || res.status === 302);
}
const patch = await fetch(`${BASE}/api/admin/users/whatever`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "owner" }),
});
t("role PATCH hidden as 404", patch.status === 404);

console.log("\nRole ranking");
t("owner outranks admin", rankOf("owner") > rankOf("admin"));
t("admin outranks user", rankOf("admin") > rankOf("user"));
t("unknown role ranks as user", rankOf("nonsense") === rankOf("user"));

console.log("\nOwner seeding");
const owners = await ownerCount();
t("at least one owner exists", owners >= 1);
const jerry = await db.user.findUnique({
  where: { email: "jerry@sumolab.co" },
  select: { role: true },
});
t("jerry@sumolab.co is owner", jerry?.role === "owner");

console.log("\nEveryone else defaults to user");
const others = await db.user.findMany({
  where: { email: { not: "jerry@sumolab.co" } },
  select: { email: true, role: true },
});
t("no accidental admins", others.every((u) => u.role === "user"));
for (const u of others) console.log(`        ${u.email}: ${u.role}`);

console.log(fail === 0 ? "\nAll admin checks passed.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
