/**
 * Checks the grader against Yoast and Rank Math behaviour.
 *
 *   npx tsx scripts/verify-content-grader.mts
 *
 * Uses a fixture served locally so the expected answers are known exactly,
 * rather than asserting against a live page that can change under us.
 */
import { createServer } from "node:http";
const { gradeContent } = await import("../src/lib/content-grader.ts");

let fail = 0;
const t = (l: string, ok: boolean) => { if (!ok) fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}`); };

const PAGE = `<!doctype html><html><head>
<title>Wedding DJ Gilbert AZ | Book Your Date</title>
<meta name="description" content="Looking for a wedding DJ in Gilbert AZ? We play weddings across the East Valley with a planning session, backup gear, and a written timeline included.">
<style>.hero{color:red}</style>
</head><body>
<nav>Home About Services Contact Blog Pricing Gallery Reviews</nav>
<script>const spam="wedding dj wedding dj wedding dj"; function boot(){return 1;}</script>
<main>
<h1>Wedding DJ Gilbert AZ</h1>
<p>Hiring a wedding DJ in Gilbert AZ should be the easy part of planning. We handle the music, the microphones, and the timeline so you can enjoy the night.</p>
<h2>What is included</h2>
<p>Every booking includes a planning call, a written run sheet, backup equipment, and setup before guests arrive. We arrive early and we stay late.</p>
<img src="/dj.jpg" alt="Wedding DJ Gilbert AZ at a reception">
<img src="/lights.jpg" alt="">
<p>Read our <a href="/reviews">reviews</a> or see <a href="/pricing">pricing</a>. We are listed on <a href="https://theknot.com">The Knot</a>.</p>
</main>
<footer>Copyright 2026 Privacy Terms Sitemap Careers</footer>
</body></html>`;

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(PAGE);
});
await new Promise<void>((r) => server.listen(4599, r));

try {
  const g = await gradeContent("http://localhost:4599/wedding-dj-gilbert-az", "wedding dj gilbert az");
  const by = Object.fromEntries(g.checks.map((c) => [c.key, c]));

  // The second image deliberately has empty alt, and the alt below is phrased
  // so the keyphrase survives intact. An alt like "DJ setup at a Gilbert
  // reception" would correctly fail: the phrase is broken by real words, and
  // matching through those would make the check meaningless.
  console.log("\nContent extraction");
  t("script source is not counted as copy", !/function boot/.test(JSON.stringify(g.checks)));
  t(`word count is content only, not nav and footer (${g.wordCount})`, g.wordCount > 40 && g.wordCount < 130);

  console.log("\nChecks Yoast and Rank Math both run");
  const expect: Array<[string, boolean, string]> = [
    ["title-has-keyword", true, "keyword in title"],
    ["title-length", true, "title length in range"],
    ["meta-has-keyword", true, "keyword in meta description"],
    ["meta-length", true, "meta description length in range"],
    ["h1-present-single", true, "exactly one H1"],
    ["h1-has-keyword", true, "keyword in H1"],
    ["url-has-keyword", true, "keyword in URL"],
    ["keyword-in-intro", true, "keyword in opening paragraph"],
    ["internal-links", true, "has internal links"],
    ["external-links", true, "has an outbound link"],
    ["images-have-alt", false, "flags the image with empty alt"],
    ["image-alt-keyword", true, "keyword appears in an alt"],
  ];
  for (const [key, want, label] of expect) {
    const c = by[key];
    t(`${label}${c ? "" : "  (MISSING CHECK)"}`, Boolean(c) && c.passed === want);
  }

  console.log("\nDensity has a floor as well as a ceiling");
  t("density check exists", Boolean(by["keyword-density"]));
  console.log(`        ${by["keyword-density"]?.description}`);

  console.log("\nReadability uses Flesch, not just sentence length");
  t("reports a 0-100 reading ease score", /\d+ out of 100/.test(by["readability"]?.description ?? ""));
  console.log(`        ${by["readability"]?.description}`);

  console.log(`\n  total checks: ${g.checks.length}   score: ${g.score}`);
  t("at least 18 checks, up from 12", g.checks.length >= 18);
} finally {
  server.close();
}

console.log(fail === 0 ? "\nAll content grader checks passed.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
