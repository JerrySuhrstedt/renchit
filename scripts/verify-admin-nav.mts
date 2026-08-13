/**
 * Confirms the Admin nav item is absent from what a standard user actually
 * receives, rather than merely hidden with CSS.
 *
 *   npx tsx scripts/verify-admin-nav.mts
 *
 * Mints a real database session for each role, fetches a signed-in page with
 * that cookie, and inspects the HTML that comes back. The owner case is
 * included deliberately: without it, a test that finds nothing proves nothing,
 * because a broken selector would also find nothing.
 */
import { config } from "dotenv";
config();
import { randomBytes } from "node:crypto";

const BASE = process.env.ADMIN_TEST_URL ?? "http://localhost:3000";
const { db } = await import("../src/lib/db.ts");

let fail = 0;
const t = (label: string, ok: boolean) => {
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
};

/** Signs in as a user by creating a real session row, then cleans it up. */
async function fetchAs(userId: string, path: string) {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: { sessionToken: token, userId, expires: new Date(Date.now() + 3_600_000) },
  });
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { cookie: `authjs.session-token=${token}` },
      redirect: "manual",
    });
    return { status: res.status, html: await res.text() };
  } finally {
    await db.session.delete({ where: { sessionToken: token } }).catch(() => {});
  }
}

const owner = await db.user.findFirstOrThrow({
  where: { role: "owner" },
  select: { id: true, email: true },
});
const standard = await db.user.findFirstOrThrow({
  where: { role: "user", email: { not: null } },
  select: { id: true, email: true },
});

console.log(`\nOwner   : ${owner.email}`);
console.log(`Standard: ${standard.email}\n`);

console.log("Standard user");
const asUser = await fetchAs(standard.id, "/dashboard");
t("dashboard loads normally", asUser.status === 200);
t('no href="/admin" anywhere in the HTML', !asUser.html.includes('href="/admin"'));
t('no "Admin" label in the markup', !/>\s*Admin\s*</.test(asUser.html));
t(
  "no admin route mentioned at all",
  !asUser.html.includes("/admin/users") && !asUser.html.includes("/admin/feedback"),
);

for (const path of ["/admin", "/admin/users", "/admin/feedback"]) {
  const res = await fetchAs(standard.id, path);
  t(`${path} redirects them away`, res.status === 307 || res.status === 302);
}

console.log("\nOwner (proves the checks above can detect the link when present)");
const asOwner = await fetchAs(owner.id, "/dashboard");
t("dashboard loads normally", asOwner.status === 200);
t('href="/admin" IS present', asOwner.html.includes('href="/admin"'));
t('"Admin" label IS present', /> ?Admin ?</.test(asOwner.html));

for (const path of ["/admin", "/admin/users", "/admin/feedback"]) {
  const res = await fetchAs(owner.id, path);
  t(`${path} loads for the owner`, res.status === 200);
}

console.log(fail === 0 ? "\nAll admin nav checks passed.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
