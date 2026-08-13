import type { CrawlResult, CrawledPage, FoundIssue } from "./types";

const TITLE_MIN = 15;
const TITLE_MAX = 60;
const META_DESC_MIN = 50;
const META_DESC_MAX = 160;
const THIN_CONTENT_WORDS = 300;
const LARGE_PAGE_BYTES = 2_000_000;
const SLOW_PAGE_MS = 3_000;
const LARGE_IMAGE_BYTES = 300_000;

function issue(partial: Omit<FoundIssue, "pageUrl" | "affectedUrl"> & { pageUrl?: string | null; affectedUrl?: string | null }): FoundIssue {
  return {
    pageUrl: partial.pageUrl ?? null,
    affectedUrl: partial.affectedUrl ?? null,
    ...partial,
  };
}

function checkPage(page: CrawledPage): FoundIssue[] {
  const issues: FoundIssue[] = [];
  const u = page.url;

  if (page.fetchError || (page.statusCode && page.statusCode >= 400)) {
    issues.push(
      issue({
        type: "page-error",
        severity: "critical",
        category: "technical",
        title: page.fetchError ? "Page failed to load" : `Page returns a ${page.statusCode} error`,
        description: page.fetchError
          ? `We couldn't load this page: ${page.fetchError}.`
          : `This page responded with a ${page.statusCode} status code, which means visitors and search engines can't reach it.`,
        fixSteps: "Check that the page exists and the server returns a 200 response. If it's meant to be removed, set up a 301 redirect to a relevant live page instead of leaving it broken.",
        pageUrl: u,
      }),
    );
    return issues;
  }

  if (page.redirectedFrom) {
    issues.push(
      issue({
        type: "redirect",
        severity: "info",
        category: "technical",
        title: "Page was reached through a redirect",
        description: `The URL ${page.redirectedFrom} redirects here. Redirects add extra load time and can dilute link value.`,
        fixSteps: "Where possible, update internal links and sitemaps to point directly at the final URL instead of the redirected one.",
        pageUrl: u,
      }),
    );
  }

  if (!page.title) {
    issues.push(
      issue({
        type: "title-missing",
        severity: "critical",
        category: "meta",
        title: "Missing page title",
        description: "This page has no <title> tag. Titles are one of the strongest ranking signals and the first thing people see in search results.",
        fixSteps: "Add a unique, descriptive <title> tag (50–60 characters) that includes your main keyword near the front.",
        pageUrl: u,
      }),
    );
  } else {
    if (page.titleCount > 1) {
      issues.push(
        issue({
          type: "title-multiple",
          severity: "warning",
          category: "meta",
          title: "Multiple title tags found",
          description: `This page has ${page.titleCount} <title> tags. Browsers and search engines will only use one, and it may not be the one you intend.`,
          fixSteps: "Remove the extra <title> tags so the page has exactly one.",
          pageUrl: u,
        }),
      );
    }
    if (page.title.length > TITLE_MAX) {
      issues.push(
        issue({
          type: "title-too-long",
          severity: "warning",
          category: "meta",
          title: "Title tag is too long",
          description: `The title is ${page.title.length} characters. Search engines typically cut titles off around ${TITLE_MAX} characters, so the end may get truncated in results.`,
          fixSteps: `Shorten the title to under ${TITLE_MAX} characters while keeping your main keyword near the front.`,
          pageUrl: u,
        }),
      );
    } else if (page.title.length < TITLE_MIN) {
      issues.push(
        issue({
          type: "title-too-short",
          severity: "info",
          category: "meta",
          title: "Title tag is quite short",
          description: `The title is only ${page.title.length} characters. A short title may be a missed opportunity to describe the page and include relevant keywords.`,
          fixSteps: `Expand the title to ${TITLE_MIN}–${TITLE_MAX} characters with a clear, descriptive phrase.`,
          pageUrl: u,
        }),
      );
    }
  }

  if (!page.metaDescription) {
    issues.push(
      issue({
        type: "meta-description-missing",
        severity: "warning",
        category: "meta",
        title: "Missing meta description",
        description: "This page has no meta description. Without one, search engines will auto-generate a snippet, which is often less compelling and lowers click-through rate.",
        fixSteps: `Write a unique, compelling meta description (${META_DESC_MIN}–${META_DESC_MAX} characters) that summarizes the page and encourages a click.`,
        pageUrl: u,
      }),
    );
  } else {
    if (page.metaDescriptionCount > 1) {
      issues.push(
        issue({
          type: "meta-description-multiple",
          severity: "info",
          category: "meta",
          title: "Multiple meta description tags found",
          description: `This page has ${page.metaDescriptionCount} meta description tags. Only one will be used.`,
          fixSteps: "Remove the extra meta description tags so the page has exactly one.",
          pageUrl: u,
        }),
      );
    }
    if (page.metaDescription.length > META_DESC_MAX) {
      issues.push(
        issue({
          type: "meta-description-too-long",
          severity: "info",
          category: "meta",
          title: "Meta description is too long",
          description: `The meta description is ${page.metaDescription.length} characters and will likely be truncated in search results.`,
          fixSteps: `Trim it to under ${META_DESC_MAX} characters while keeping the key selling point at the start.`,
          pageUrl: u,
        }),
      );
    } else if (page.metaDescription.length < META_DESC_MIN) {
      issues.push(
        issue({
          type: "meta-description-too-short",
          severity: "info",
          category: "meta",
          title: "Meta description is quite short",
          description: `The meta description is only ${page.metaDescription.length} characters, which may not fully use the available space in search results.`,
          fixSteps: `Expand it to ${META_DESC_MIN}–${META_DESC_MAX} characters with a clear reason to click.`,
          pageUrl: u,
        }),
      );
    }
  }

  if (page.h1s.length === 0) {
    issues.push(
      issue({
        type: "h1-missing",
        severity: "critical",
        category: "content",
        title: "Missing H1 heading",
        description: "This page has no H1 tag. The H1 tells visitors and search engines what the page is about at a glance.",
        fixSteps: "Add one H1 tag near the top of the page containing your primary keyword or topic.",
        pageUrl: u,
      }),
    );
  } else if (page.h1s.length > 1) {
    issues.push(
      issue({
        type: "h1-multiple",
        severity: "warning",
        category: "content",
        title: `${page.h1s.length} H1 headings found`,
        description: "This page has more than one H1 tag, which can dilute the page's topical focus and confuse search engines about the main heading.",
        fixSteps: "Keep a single H1 for the page's main heading, and use H2/H3 tags for subsections.",
        pageUrl: u,
      }),
    );
  }

  if (!page.canonical) {
    issues.push(
      issue({
        type: "canonical-missing",
        severity: "info",
        category: "technical",
        title: "Missing canonical tag",
        description: "This page doesn't specify a canonical URL, which helps search engines understand which version of a page to index when duplicates or URL variants exist.",
        fixSteps: "Add a <link rel=\"canonical\"> tag pointing to the preferred URL for this page's content.",
        pageUrl: u,
      }),
    );
  }

  if (!page.viewport) {
    issues.push(
      issue({
        type: "viewport-missing",
        severity: "warning",
        category: "technical",
        title: "Missing mobile viewport tag",
        description: "This page has no viewport meta tag, which usually means it won't render properly on mobile devices, a major ranking and usability factor.",
        fixSteps: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the page\'s <head>.',
        pageUrl: u,
      }),
    );
  }

  if (page.robotsMeta?.toLowerCase().includes("noindex")) {
    issues.push(
      issue({
        type: "noindex",
        severity: "critical",
        category: "technical",
        title: "Page is set to noindex",
        description: "This page has a noindex directive, which tells search engines not to show it in results at all.",
        fixSteps: "If this page should rank, remove the noindex directive from its robots meta tag.",
        pageUrl: u,
      }),
    );
  }

  if (!page.lang) {
    issues.push(
      issue({
        type: "lang-missing",
        severity: "info",
        category: "technical",
        title: "Missing HTML language attribute",
        description: "The <html> tag has no lang attribute, which helps search engines and screen readers understand the page's language.",
        fixSteps: 'Add a lang attribute to the <html> tag, e.g. <html lang="en">.',
        pageUrl: u,
      }),
    );
  }

  const imagesMissingAlt = page.images.filter((img) => !img.alt || img.alt.trim() === "");
  if (imagesMissingAlt.length > 0) {
    issues.push(
      issue({
        type: "images-missing-alt",
        severity: "warning",
        category: "content",
        title: `${imagesMissingAlt.length} image${imagesMissingAlt.length > 1 ? "s" : ""} missing alt text`,
        description: "Alt text helps search engines understand images and makes your site accessible to visitors using screen readers.",
        fixSteps: "Add descriptive alt text to every meaningful image. Purely decorative images can use alt=\"\".",
        pageUrl: u,
      }),
    );
  }

  if (page.wordCount > 0 && page.wordCount < THIN_CONTENT_WORDS) {
    issues.push(
      issue({
        type: "thin-content",
        severity: "warning",
        category: "content",
        title: "Thin content",
        description: `This page has only about ${page.wordCount} words. Pages with very little content often struggle to rank for competitive terms.`,
        fixSteps: "Expand the page with genuinely useful content: more detail, examples, or answers to related questions your audience is searching for.",
        pageUrl: u,
      }),
    );
  }

  if (page.sizeBytes > LARGE_PAGE_BYTES) {
    issues.push(
      issue({
        type: "large-page",
        severity: "info",
        category: "performance",
        title: "Large page size",
        description: `This page's HTML is ${(page.sizeBytes / 1_000_000).toFixed(1)}MB, which can slow down load times, especially on mobile connections.`,
        fixSteps: "Look for ways to trim unnecessary markup, inline scripts/styles, or embedded content.",
        pageUrl: u,
      }),
    );
  }

  if (page.loadTimeMs > SLOW_PAGE_MS) {
    issues.push(
      issue({
        type: "slow-page",
        severity: "warning",
        category: "performance",
        title: "Slow page load time",
        description: `This page took about ${(page.loadTimeMs / 1000).toFixed(1)}s to respond. Slow pages hurt both rankings and user experience.`,
        fixSteps: "Investigate server response time, and consider caching, image optimization, or a CDN to speed things up.",
        pageUrl: u,
      }),
    );
  }

  return issues;
}

export function runChecks(crawl: CrawlResult): FoundIssue[] {
  const issues: FoundIssue[] = [];

  for (const page of crawl.pages) {
    issues.push(...checkPage(page));
  }

  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();
  for (const page of crawl.pages) {
    if (page.title) {
      titleMap.set(page.title, [...(titleMap.get(page.title) ?? []), page.url]);
    }
    if (page.metaDescription) {
      descMap.set(page.metaDescription, [...(descMap.get(page.metaDescription) ?? []), page.url]);
    }
  }

  for (const [title, urls] of titleMap) {
    if (urls.length > 1) {
      for (const u of urls) {
        issues.push(
          issue({
            type: "title-duplicate",
            severity: "warning",
            category: "meta",
            title: "Duplicate title tag",
            description: `The title "${title}" is used on ${urls.length} pages. Duplicate titles make it harder for search engines to tell pages apart.`,
            fixSteps: "Give each page a unique title that reflects its specific content.",
            pageUrl: u,
          }),
        );
      }
    }
  }

  for (const urls of descMap.values()) {
    if (urls.length > 1) {
      for (const u of urls) {
        issues.push(
          issue({
            type: "meta-description-duplicate",
            severity: "info",
            category: "meta",
            title: "Duplicate meta description",
            description: `The same meta description is used on ${urls.length} pages, which reduces its effectiveness for any single page.`,
            fixSteps: "Write a unique meta description for each page.",
            pageUrl: u,
          }),
        );
      }
    }
  }

  for (const page of crawl.pages) {
    for (const image of page.images) {
      const check = crawl.imageChecks.get(image.src);
      if (!check?.bytes || check.bytes <= LARGE_IMAGE_BYTES) continue;

      issues.push(
        issue({
          type: "large-image",
          severity: "warning",
          category: "performance",
          title: "Large image file",
          description: `This image is ${(check.bytes / 1_000_000).toFixed(1)}MB, which can slow down page load, especially on mobile connections.`,
          fixSteps: "Resize and compress this image before re-uploading; most web images don't need to be wider than 1920px.",
          pageUrl: page.url,
          affectedUrl: image.src,
        }),
      );
    }
  }

  for (const page of crawl.pages) {
    for (const link of page.links) {
      const check = crawl.linkChecks.get(link.href);
      if (!check) continue;
      if (!check.ok) {
        // A 403/429 usually means the destination is blocking automated requests
        // (bot protection), not that the page is actually gone; a real visitor's
        // browser would likely load it fine. Report it with lower confidence
        // instead of calling it a confirmed broken link.
        const likelyBotBlock = check.statusCode === 403 || check.statusCode === 429;

        issues.push(
          issue({
            type: likelyBotBlock
              ? "link-check-blocked"
              : link.isInternal
                ? "broken-internal-link"
                : "broken-external-link",
            severity: likelyBotBlock ? "info" : link.isInternal ? "critical" : "warning",
            category: "links",
            title: likelyBotBlock
              ? "Couldn't verify this link"
              : link.isInternal
                ? "Broken internal link"
                : "Broken external link",
            description: likelyBotBlock
              ? `The link to ${link.href} returned ${check.statusCode} when we checked it, which usually means that site blocks automated tools rather than the page being gone. Worth a quick manual click to confirm.`
              : `The link to ${link.href} on this page returned ${check.statusCode ?? "an error"}${check.error ? ` (${check.error})` : ""}.`,
            fixSteps: likelyBotBlock
              ? "Open the link yourself in a browser to confirm it works. No action needed if it loads fine."
              : link.isInternal
                ? "Update the link to point to a working page, or fix/restore the destination page."
                : "Update or remove the link, since the external destination is no longer reachable.",
            pageUrl: page.url,
            affectedUrl: link.href,
          }),
        );
      }
    }
  }

  return issues;
}

export function computeHealthScore(issues: FoundIssue[], pageCount: number): number {
  if (pageCount === 0) return 0;
  const weights: Record<string, number> = { critical: 5, warning: 2, info: 0.5 };
  const penalty = issues.reduce((sum, i) => sum + (weights[i.severity] ?? 1), 0);
  const maxPenalty = pageCount * 12;
  const score = 100 - Math.min(100, (penalty / maxPenalty) * 100);
  return Math.round(Math.max(0, score));
}
