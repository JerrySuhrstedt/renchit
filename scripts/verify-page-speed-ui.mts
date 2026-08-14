/**
 * Checks the Page Speed list and score colours.
 *
 *   npx tsx scripts/verify-page-speed-ui.mts
 *
 * Seeds completed checks, reads the rendered page, and deletes them again.
 * Score numbers count up on the client, so the assertions are structural:
 * server rendering can prove both platforms are present, not what the dial
 * settles on.
 */
import { config } from "dotenv"; config();
import { randomBytes } from "node:crypto";
const { db } = await import("../src/lib/db.ts");
let fail = 0;
const t = (l: string, ok: boolean) => { if (!ok) fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}`); };

const { pageSpeedBand } = await import("../src/lib/format.ts");
console.log("\nGoogle's colour bands");
t("90 is good/green",  pageSpeedBand(90).color === "var(--psi-good)" && pageSpeedBand(90).label === "Good");
t("100 is good",       pageSpeedBand(100).color === "var(--psi-good)");
t("89 is average",     pageSpeedBand(89).color === "var(--psi-average)");
t("50 is average",     pageSpeedBand(50).color === "var(--psi-average)");
t("49 is poor/red",    pageSpeedBand(49).color === "var(--psi-poor)");
t("0 is poor",         pageSpeedBand(0).color === "var(--psi-poor)");
t("no brand colours leak in", ![90,50,0].some(n => pageSpeedBand(n).color.includes("brand")));

const { CELEBRATE_AT } = await import("../src/lib/celebrate.ts");
t("confetti threshold matches Google's cutoff", CELEBRATE_AT === 90);

const owner = await db.user.findFirstOrThrow({ where: { role: "owner" }, select: { id: true } });
const token = randomBytes(32).toString("hex");
await db.session.create({ data: { sessionToken: token, userId: owner.id, expires: new Date(Date.now() + 3_600_000) } });
const cookie = `authjs.session-token=${token}`;
const site = await db.site.findFirst({ where: { userId: owner.id } });
const made: string[] = [];

async function seed(mobile: number | null, desktop: number | null) {
  const c = await db.pageSpeedCheck.create({
    data: {
      userId: owner.id, siteId: site?.id, url: "https://example.com/", status: "completed",
      mobileScore: mobile, desktopScore: desktop,
      mobileJson: mobile === null ? null : JSON.stringify({ score: mobile, vitals: [], opportunities: [] }),
      desktopJson: desktop === null ? null : JSON.stringify({ score: desktop, vitals: [], opportunities: [] }),
    },
  });
  made.push(c.id);
  return c.id;
}

try {
  await seed(95, 99);   // celebrates
  await seed(56, 78);   // does not
  await seed(72, null); // missing desktop

  const html = await (await fetch("http://localhost:3000/speed", { headers: { cookie } })).text();
  console.log("\nPast tests row");
  // The dial counts up from zero on the client, so the server HTML holds 0
  // rather than the score. Assert on structure, which is what server rendering
  // can actually prove.
  const mobiles = (html.match(/>Mobile</g) ?? []).length;
  const desktops = (html.match(/>Desktop</g) ?? []).length;
  const completed = await db.pageSpeedCheck.count({ where: { userId: owner.id, status: "completed" } });
  t(`a Mobile label on every completed row (${mobiles} of ${completed})`, mobiles === completed);
  t(`a Desktop label on every completed row (${desktops} of ${completed})`, desktops === completed);
  t("both platforms shown, never just one", mobiles === desktops);
  t("missing desktop shows a dash, not a gap", html.includes("–") || html.includes("&ndash;"));
  t("no longer says 'Mobile score ·'", !html.includes("Mobile score ·"));
} finally {
  for (const id of made) await db.pageSpeedCheck.delete({ where: { id } }).catch(() => {});
  await db.session.delete({ where: { sessionToken: token } }).catch(() => {});
  console.log(`\n  cleaned up ${made.length} seeded checks`);
}
console.log(fail === 0 ? "\nAll page speed checks passed.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
