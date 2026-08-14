import * as cheerio from "cheerio";
import { fleschReadingEase } from "./readability";

/**
 * On-page grading, following what Yoast and Rank Math actually check.
 *
 * Two of their checks are deliberately left out: passive voice and transition
 * words. Both are contested as ranking factors, and neither can be explained
 * to someone who did not ask for a grammar lesson, which is the whole audience
 * for this tool.
 */

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

const USER_AGENT = "RenchitBot/1.0";
const FETCH_TIMEOUT_MS = 12_000;

const THIN_CONTENT_WORDS = 300;
const IDEAL_CONTENT_WORDS = 600;

// Yoast and Rank Math both treat under 0.5% as too sparse to signal a topic,
// and over 3% as stuffing.
const MIN_KEYWORD_DENSITY = 0.5;
const MAX_KEYWORD_DENSITY = 3;

// Titles are truncated in search results around 60 characters. Rank Math
// accepts 15 to 70; below 30 is usually a wasted opportunity.
const TITLE_MIN = 30;
const TITLE_MAX = 60;

const META_MIN = 120;
const META_MAX = 160;

/** Yoast flags a run of this many words with no subheading to break it up. */
const MAX_WORDS_WITHOUT_SUBHEADING = 300;

/**
 * Small words that a writer will naturally drop into the middle of a keyphrase
 * without changing what the page is about. "Wedding DJ in Gilbert AZ" is the
 * same phrase as "wedding DJ Gilbert AZ" to a reader and to Google.
 */
const FUNCTION_WORDS = [
  "a", "an", "the", "in", "on", "at", "of", "for", "to", "and", "or",
  "with", "from", "by", "near", "your", "our",
];

/**
 * Matches a keyphrase the way Yoast and Rank Math do, rather than as an exact
 * substring.
 *
 * Exact matching sounds stricter and therefore safer, but it is wrong: it
 * fails on ordinary English and tells someone they forgot a keyword they very
 * obviously used. Both tools allow function words between the terms and
 * tolerate simple plurals, so this does too.
 */
function keywordPattern(keyword: string): RegExp {
  const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const terms = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    // Optional trailing s, so "wedding dj" matches "wedding djs".
    .map((w) => `${escape(w)}s?`);

  if (terms.length === 0) return /(?!)/;

  const filler = `(?:\\s+(?:${FUNCTION_WORDS.join("|")}))*\\s+`;
  return new RegExp(`\\b${terms.join(filler)}\\b`, "gi");
}

function includesKeyword(haystack: string, keyword: string): boolean {
  if (!keyword) return false;
  return keywordPattern(keyword).test(haystack);
}

function countOccurrences(haystack: string, keyword: string): number {
  if (!keyword) return 0;
  return haystack.match(keywordPattern(keyword))?.length ?? 0;
}

function check(partial: GradeCheck): GradeCheck {
  return partial;
}

export async function gradeContent(rawUrl: string, targetKeyword: string): Promise<GradeResult> {
  const url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).toString();
  const keyword = targetKeyword.trim();
  const origin = new URL(url).origin;

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

  // Structural checks read the whole document, because a title, an H1, or a
  // canonical can legitimately live outside the content area.
  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description" i]').first().attr("content")?.trim() ?? "";
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get();

  /**
   * Text analysis reads the content area only.
   *
   * Previously this used the whole body, which counted JavaScript source, CSS,
   * navigation, and footers as page copy. That inflated word count and diluted
   * keyword density, so a script-heavy page looked longer and less focused
   * than it is. Yoast and Rank Math analyse the post content, not the theme.
   */
  $("script, style, noscript, iframe, svg, template").remove();
  const contentRoot = $("main").length
    ? $("main").first()
    : $("article").length
      ? $("article").first()
      : ($("nav, header, footer, aside").remove(), $("body"));

  const bodyText = contentRoot.text().replace(/\s+/g, " ").trim();
  const words = bodyText ? bodyText.split(" ").filter(Boolean) : [];
  const wordCount = words.length;

  const paragraphs = contentRoot
    .find("p")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const firstParagraph = paragraphs[0] ?? bodyText.slice(0, 400);

  const subheadings = contentRoot.find("h2, h3").map((_, el) => $(el).text().trim()).get();
  const images = contentRoot
    .find("img")
    .map((_, el) => ({ alt: $(el).attr("alt")?.trim() ?? "" }))
    .get();

  // Internal and external links are separate signals in both tools, so they
  // cannot be counted together.
  let internalLinks = 0;
  let externalLinks = 0;
  contentRoot.find("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const resolved = new URL(href, url);
      if (resolved.origin === origin) internalLinks += 1;
      else externalLinks += 1;
    } catch {
      // A malformed href is not a link we can categorise.
    }
  });

  const readability = fleschReadingEase(bodyText);

  const pathname = new URL(url).pathname.toLowerCase();
  const slugFriendly = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => pathname.includes(word));

  const keywordOccurrences = countOccurrences(bodyText, keyword);
  const density = wordCount > 0 ? (keywordOccurrences / wordCount) * 100 : 0;

  const keywordInIntro = includesKeyword(firstParagraph, keyword);
  const altWithKeyword = images.filter((i) => includesKeyword(i.alt, keyword)).length;
  const altPresent = images.filter((i) => i.alt.length > 0).length;

  // The longest stretch of copy with no subheading breaking it up.
  const longestRun = longestUnbrokenRun(contentRoot, $);

  const titleLengthOk = title.length >= TITLE_MIN && title.length <= TITLE_MAX;
  const metaLengthOk = metaDescription.length >= META_MIN && metaDescription.length <= META_MAX;

  const checks: GradeCheck[] = [
    check({
      key: "title-has-keyword",
      category: "title",
      severity: "critical",
      passed: includesKeyword(title, keyword),
      title: "Target keyword appears in the title",
      description: includesKeyword(title, keyword)
        ? "Your title tag includes the target keyword."
        : `Your title "${title || "(missing)"}" doesn't include "${keyword}". Search engines weigh the title heavily, so work it in naturally.`,
    }),
    check({
      key: "title-keyword-early",
      category: "title",
      severity: "info",
      passed: includesKeyword(title.slice(0, Math.ceil(title.length / 2)), keyword),
      title: "Keyword appears near the start of the title",
      description: includesKeyword(title.slice(0, Math.ceil(title.length / 2)), keyword)
        ? "The keyword shows up in the first half of your title, which reads best in search results."
        : "Try moving the keyword closer to the front of the title. Search engines and readers weight the beginning more.",
    }),
    check({
      key: "title-length",
      category: "title",
      severity: "warning",
      passed: titleLengthOk,
      title: "Title is a good length for search results",
      description: !title
        ? "This page has no title tag at all. It is the single most important thing on the page."
        : title.length > TITLE_MAX
          ? `Your title is ${title.length} characters. Google usually cuts titles off around ${TITLE_MAX}, so the end will not be seen.`
          : title.length < TITLE_MIN
            ? `Your title is only ${title.length} characters. There is room to say more about what the page offers.`
            : `Your title is ${title.length} characters, which fits in search results.`,
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
        : "This page has no meta description at all. Add one that includes your target keyword.",
    }),
    check({
      key: "meta-length",
      category: "title",
      severity: "info",
      passed: metaLengthOk,
      title: "Meta description is a good length",
      description: !metaDescription
        ? "No meta description, so Google will invent one from your page text. Writing it yourself is better."
        : metaDescription.length > META_MAX
          ? `Your description is ${metaDescription.length} characters and will be cut off around ${META_MAX}.`
          : metaDescription.length < META_MIN
            ? `Your description is ${metaDescription.length} characters. Around ${META_MIN} to ${META_MAX} gives you the most space to sell the click.`
            : `Your description is ${metaDescription.length} characters, which uses the space well.`,
    }),
    check({
      key: "h1-present-single",
      category: "headings",
      severity: "critical",
      passed: h1s.length === 1,
      title: "Page has exactly one H1 heading",
      description:
        h1s.length === 0
          ? "This page has no H1 tag. Add one describing what the page is about."
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
        : "None of your H1 heading(s) mention the target keyword. This is one of the strongest on-page signals you can give.",
    }),
    check({
      key: "subheading-has-keyword",
      category: "headings",
      severity: "warning",
      passed: subheadings.some((h) => includesKeyword(h, keyword)),
      title: "Keyword appears in a subheading",
      description: subheadings.some((h) => includesKeyword(h, keyword))
        ? "At least one H2/H3 reinforces the target keyword."
        : "None of your H2/H3 subheadings mention the keyword or a natural variation of it. This helps reinforce the page's topic as readers scan.",
    }),
    check({
      key: "subheading-distribution",
      category: "headings",
      severity: "info",
      passed: longestRun <= MAX_WORDS_WITHOUT_SUBHEADING,
      title: "Long sections are broken up with subheadings",
      description:
        longestRun <= MAX_WORDS_WITHOUT_SUBHEADING
          ? "Your content is broken into readable sections."
          : `There is a stretch of about ${longestRun} words with no subheading. Readers skim, so add an H2 or H3 every ${MAX_WORDS_WITHOUT_SUBHEADING} words or so.`,
    }),
    check({
      key: "url-has-keyword",
      category: "keywords",
      severity: "info",
      passed: slugFriendly,
      title: "URL includes the target keyword",
      description: slugFriendly
        ? "Your URL slug reflects the target keyword."
        : `The URL path "${pathname}" doesn't clearly include "${keyword}". A descriptive URL can be a small extra signal.`,
    }),
    check({
      key: "keyword-in-intro",
      category: "keywords",
      severity: "warning",
      passed: keywordInIntro,
      title: "Keyword appears in the opening paragraph",
      description: keywordInIntro
        ? "Your opening paragraph mentions the target keyword, which tells readers and search engines immediately what the page is about."
        : `Your opening paragraph doesn't mention "${keyword}". Both readers and search engines weight the first thing you say most heavily.`,
    }),
    check({
      key: "keyword-density",
      category: "keywords",
      severity: keywordOccurrences === 0 ? "critical" : "warning",
      passed:
        keywordOccurrences > 0 && density >= MIN_KEYWORD_DENSITY && density <= MAX_KEYWORD_DENSITY,
      title: "Keyword is used often enough, but not too often",
      description:
        keywordOccurrences === 0
          ? `The phrase "${keyword}" doesn't appear anywhere in the page content. It should show up naturally a few times.`
          : density > MAX_KEYWORD_DENSITY
            ? `"${keyword}" appears ${keywordOccurrences} times (${density.toFixed(1)}% of all words). That's dense enough to look like keyword stuffing.`
            : density < MIN_KEYWORD_DENSITY
              ? `"${keyword}" appears only ${keywordOccurrences} time${keywordOccurrences === 1 ? "" : "s"} in ${wordCount} words (${density.toFixed(1)}%). Work it in a few more times so the page's topic is unmistakable.`
              : `"${keyword}" appears ${keywordOccurrences} times (${density.toFixed(1)}%), which reads naturally.`,
    }),
    check({
      key: "content-length",
      category: "content",
      severity: wordCount < THIN_CONTENT_WORDS ? "critical" : "info",
      passed: wordCount >= THIN_CONTENT_WORDS,
      title: "Page has enough content to be useful",
      description:
        wordCount < THIN_CONTENT_WORDS
          ? `This page has about ${wordCount} words. Thin pages (under ${THIN_CONTENT_WORDS}) often struggle to rank for competitive terms. Add genuinely useful detail.`
          : wordCount < IDEAL_CONTENT_WORDS
            ? `This page has about ${wordCount} words, enough to be useful, though more depth (${IDEAL_CONTENT_WORDS}+ words) often performs better for competitive topics.`
            : `This page has about ${wordCount} words, which is a solid amount of content.`,
    }),
    check({
      key: "readability",
      category: "content",
      severity: "info",
      passed: readability.ok,
      title: "Writing is easy to read",
      description: `Reading ease scores ${readability.score} out of 100, which is ${readability.label}.${
        readability.ok
          ? ""
          : " Shorter sentences and simpler words will help. Aim for 60 or above."
      }`,
    }),
    check({
      key: "images-have-alt",
      category: "content",
      severity: "warning",
      passed: images.length === 0 || altPresent === images.length,
      title: "Every image has alt text",
      description:
        images.length === 0
          ? "This page has no images to check. A relevant image or two usually helps."
          : altPresent === images.length
            ? `All ${images.length} image(s) have alt text.`
            : `${images.length - altPresent} of ${images.length} image(s) are missing alt text. Screen readers and image search both rely on it.`,
    }),
    check({
      key: "image-alt-keyword",
      category: "keywords",
      severity: "info",
      passed: images.length === 0 || altWithKeyword > 0,
      title: "An image mentions the keyword in its alt text",
      description:
        images.length === 0
          ? "No images on this page."
          : altWithKeyword > 0
            ? `${altWithKeyword} image(s) reference the keyword in their alt text.`
            : `None of your image alt text mentions "${keyword}". One relevant mention helps, as long as it genuinely describes the image.`,
    }),
    check({
      key: "internal-links",
      category: "links",
      severity: "warning",
      passed: internalLinks > 0,
      title: "Page links to other pages on your site",
      description:
        internalLinks > 0
          ? `This page links to ${internalLinks} other page(s) on your site, which helps visitors and search engines find them.`
          : "This page doesn't link anywhere else on your own site. Internal links spread authority around and keep readers moving.",
    }),
    check({
      key: "external-links",
      category: "links",
      severity: "info",
      passed: externalLinks > 0,
      title: "Page links out to a useful source",
      description:
        externalLinks > 0
          ? `This page links out to ${externalLinks} other site(s).`
          : "This page doesn't link out anywhere. Citing a genuinely useful source is a small credibility signal, and both Yoast and Rank Math look for it.",
    }),
  ];

  const weights: Record<GradeCheck["severity"], number> = { critical: 3, warning: 2, info: 1 };
  const maxPoints = checks.reduce((sum, c) => sum + weights[c.severity], 0);
  const earnedPoints = checks.reduce((sum, c) => sum + (c.passed ? weights[c.severity] : 0), 0);
  const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  return { url, targetKeyword: keyword, wordCount, checks, score };
}

/**
 * The longest stretch of words not interrupted by a subheading.
 *
 * Walks the content in document order rather than measuring between heading
 * elements, so text nested inside sections and divs is still counted against
 * the run it visually belongs to.
 */
function longestUnbrokenRun(
  root: ReturnType<cheerio.CheerioAPI>,
  $: cheerio.CheerioAPI,
): number {
  let longest = 0;
  let current = 0;

  root.find("h2, h3, p, li").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (tag === "h2" || tag === "h3") {
      longest = Math.max(longest, current);
      current = 0;
      return;
    }
    current += $(el).text().split(/\s+/).filter(Boolean).length;
  });

  return Math.max(longest, current);
}
