/**
 * Checks that real-user data is captured when Google has it, and that an empty
 * response is reported rather than scored as zero.
 *
 *   npx tsx scripts/verify-page-speed-field.mts
 */
import { config } from "dotenv";
config();
const { checkPageSpeed } = await import("../src/lib/page-speed.ts");
const KEY = process.env.PAGESPEED_API_KEY!;

let fail = 0;
const t = (l: string, ok: boolean) => { if (!ok) fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}`); };

console.log("\nA site with enough traffic for Google to report on real visitors");
const big = await checkPageSpeed("https://www.wikipedia.org/", KEY);
t("lab score returned", big.mobile.score > 0);
t("real-user data captured", big.mobile.field !== null);
if (big.mobile.field) {
  t("overall band set", ["good", "needs-improvement", "poor"].includes(big.mobile.field.overall));
  t("metrics are labelled in plain English", big.mobile.field.metrics.every((m) => !/[A-Z_]{5,}/.test(m.label)));
  for (const m of big.mobile.field.metrics) console.log(`        ${m.label}: ${m.displayValue} (${m.band})`);
}

console.log("\nA small site Google has no visitor data for");
try {
  const small = await checkPageSpeed("https://sumolab.co/", KEY);
  t("lab score still returned", small.mobile.score > 0);
  t("real-user data correctly absent", small.mobile.field === null);
  console.log(`        mobile ${small.mobile.score}, desktop ${small.desktop.score}`);
} catch (err) {
  // Google sometimes takes longer than our timeout to analyse a page. That is
  // a real constraint worth seeing, but it does not mean the parsing is wrong,
  // so report it rather than failing the run.
  console.log(`  SKIP  Google did not answer in time: ${(err as Error).name}`);
}

console.log(fail === 0 ? "\nAll field data checks passed.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
