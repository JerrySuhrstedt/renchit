import * as cheerio from "cheerio";

export type GradeCategory = "title" | "headings" | "content" | "keywords" | "links";

export type GradeCheck = {
  key: string;
  category: GradeCategory;
  severity: "critical" | "warning" | "info";
  passed: boolean;
  title: string;
  description: string;
};

export type GradeResult = {
  url: string;
  targetKeyword: string;
  wordCount: number;
  checks: GradeCheck[];
  score: number;
};

const USER_AGENT = "SumoLabWebWrenchBot/1.0 (+https://sumolab.dev/web-wrench)";
const FETCH_TIMEOUT_MS = 12_000;
const THIN_CONTENT_WORDS = 300;
const IDEAL_CONTENT_WORDS = 600;
const MAX_KEYWORD_DENSITY = 3;

function includesKeyword(haystack: string, keyword: string): boolean {
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}

function countOccurrences(haystack: string, keyword: string): number {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = haystack.toLowerCase().match(new RegExp(escaped.toLowerCase(), "g"));
  return matches?.length ?? 0;
}

function check(partial: GradeCheck): GradeCheck {
  return partial;
}

export async function gradeContent(rawUrl: string, targetKeyword: string): Promise<GradeResult> {
  const url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).toString();
  const keyword = targetKeyword.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      throw new Error(`Page responded with ${res.status}`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description" i]').first().attr("content")?.trim() ?? "";
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get();
  const subheadings = $("h2, h3").map((_, el) => $(el).text().trim()).get();
  const images = $("img")
    .map((_, el) => ({ alt: $(el).attr("alt")?.trim() ?? "" }))
    .get();
  const linkCount = $("a[href]").length;

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const words = bodyText ? bodyText.split(" ") : [];
  const wordCount = words.length;
  const sentences = bodyText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;

  const pathname = new URL(url).pathname.toLowerCase();
  const slugFriendly = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => pathname.includes(word));

  const keywordOccurrences = countOccurrences(bodyText, keyword);
  const density = wordCount > 0 ? (keywordOccurrences / wordCount) * 100 : 0;

  const checks: GradeCheck[] = [
    check({
      key: "title-has-keyword",
      category: "title",
      severity: "critical",
      passed: includesKeyword(title, keyword),
      title: "Target keyword appears in the title",
      description: includesKeyword(title, keyword)
        ? "Your title tag includes the target keyword."
        : `Your title "${title || "(missing)"}" doesn't include "${keyword}". Search engines weigh the title heavily — work it in naturally.`,
    }),
    check({
      key: "title-keyword-early",
      category: "title",
      severity: "info",
      passed: includesKeyword(title.slice(0, Math.ceil(title.length / 2)), keyword),
      title: "Keyword appears near the start of the title",
      description: includesKeyword(title.slice(0, Math.ceil(title.length / 2)), keyword)
        ? "The keyword shows up in the first half of your title, which reads best in search results."
        : "Try moving the keyword closer to the front of the title — search engines and readers weight the beginning more.",
    }),
    check({
      key: "meta-has-keyword",
      category: "title",
      severity: "warning",
      passed: includesKeyword(metaDescription, keyword),
      title: "Target keyword appears in the meta description",
      description: metaDescription
        ? includesKeyword(metaDescription, keyword)
          ? "Your meta description includes the target keyword."
          : `Your meta description doesn't mention "${keyword}". Including it can improve click-through from search results.`
        : "This page has no meta description at all — add one that includes your target keyword.",
    }),
    check({
      key: "h1-present-single",
      category: "headings",
      severity: "critical",
      passed: h1s.length === 1,
      title: "Page has exactly one H1 heading",
      description:
        h1s.length === 0
          ? "This page has no H1 tag — add one describing what the page is about."
          : h1s.length === 1
            ? "This page has a single, clear H1 heading."
            : `This page has ${h1s.length} H1 tags. Keep it to one for a clear topical focus.`,
    }),
    check({
      key: "h1-has-keyword",
      category: "headings",
      severity: "critical",
      passed: h1s.some((h) => includesKeyword(h, keyword)),
      title: "Target keyword appears in the H1",
      description: h1s.some((h) => includesKeyword(h, keyword))
        ? "Your H1 includes the target keyword."
        : "None of your H1 heading(s) mention the target keyword — this is one of the strongest on-page signals you can give.",
    }),
    check({
      key: "subheading-has-keyword",
      category: "headings",
      severity: "warning",
      passed: subheadings.some((h) => includesKeyword(h, keyword)),
      title: "Keyword (or a variation) appears in a subheading",
      description: subheadings.some((h) => includesKeyword(h, keyword))
        ? "At least one H2/H3 reinforces the target keyword."
        : "None of your H2/H3 subheadings mention the keyword or a natural variation of it — this helps reinforce the page's topic as readers scan.",
    }),
    check({
      key: "url-has-keyword",
      category: "keywords",
      severity: "info",
      passed: slugFriendly,
      title: "URL includes the target keyword",
      description: slugFriendly
        ? "Your URL slug reflects the target keyword."
        : `The URL path "${pathname}" doesn't clearly include "${keyword}" — a descriptive URL can be a small extra signal.`,
    }),
    check({
      key: "keyword-density",
      category: "keywords",
      severity: keywordOccurrences === 0 ? "critical" : "warning",
      passed: keywordOccurrences > 0 && density <= MAX_KEYWORD_DENSITY,
      title: "Keyword usage in the body reads naturally",
      description:
        keywordOccurrences === 0
          ? `The phrase "${keyword}" doesn't appear anywhere in the page content — it should show up naturally a few times.`
          : density > MAX_KEYWORD_DENSITY
            ? `"${keyword}" appears ${keywordOccurrences} time${keywordOccurrences === 1 ? "" : "s"} (${density.toFixed(1)}% of all words) — that's dense enough to look like keyword stuffing. Aim for it to read naturally instead.`
            : `"${keyword}" appears ${keywordOccurrences} time${keywordOccurrences === 1 ? "" : "s"} in the content, which reads naturally.`,
    }),
    check({
      key: "content-length",
      category: "content",
      severity: wordCount < THIN_CONTENT_WORDS ? "critical" : "info",
      passed: wordCount >= THIN_CONTENT_WORDS,
      title: "Page has enough content to be useful",
      description:
        wordCount < THIN_CONTENT_WORDS
          ? `This page has about ${wordCount} words. Thin pages (under ${THIN_CONTENT_WORDS}) often struggle to rank for competitive terms — add genuinely useful detail.`
          : wordCount < IDEAL_CONTENT_WORDS
            ? `This page has about ${wordCount} words — enough to be useful, though more depth (${IDEAL_CONTENT_WORDS}+ words) often performs better for competitive topics.`
            : `This page has about ${wordCount} words, which is a solid amount of content.`,
    }),
    check({
      key: "readability",
      category: "content",
      severity: "info",
      passed: avgWordsPerSentence <= 25,
      title: "Sentences are easy to read",
      description:
        avgWordsPerSentence <= 25
          ? `Average sentence length is about ${avgWordsPerSentence.toFixed(0)} words — easy to read.`
          : `Average sentence length is about ${avgWordsPerSentence.toFixed(0)} words, which is on the long side. Shorter sentences are generally easier to scan.`,
    }),
    check({
      key: "images-have-alt",
      category: "content",
      severity: "warning",
      passed: images.length === 0 || images.some((img) => img.alt.length > 0),
      title: "Images have descriptive alt text",
      description:
        images.length === 0
          ? "This page has no images to check."
          : images.some((img) => img.alt.length > 0)
            ? `${images.filter((img) => img.alt.length > 0).length} of ${images.length} image(s) have alt text.`
            : `None of this page's ${images.length} image(s) have alt text — add descriptions for accessibility and image search.`,
    }),
    check({
      key: "has-links",
      category: "links",
      severity: "info",
      passed: linkCount > 0,
      title: "Page links to other content",
      description:
        linkCount > 0
          ? `This page has ${linkCount} link(s) to other pages.`
          : "This page has no links at all — linking to related pages (yours or authoritative outside sources) gives readers and search engines somewhere to go next.",
    }),
  ];

  const weights: Record<GradeCheck["severity"], number> = { critical: 3, warning: 2, info: 1 };
  const maxPoints = checks.reduce((sum, c) => sum + weights[c.severity], 0);
  const earnedPoints = checks.reduce((sum, c) => sum + (c.passed ? weights[c.severity] : 0), 0);
  const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  return { url, targetKeyword: keyword, wordCount, checks, score };
}
