import * as cheerio from "cheerio";
import pLimit from "p-limit";
import type { CrawledPage, CrawlResult, LinkCheckResult, LinkRecord } from "./types";

const USER_AGENT = "SumoLabWebWrenchBot/1.0 (+https://sumolab.dev/web-wrench)";
const FETCH_TIMEOUT_MS = 12_000;
const CRAWL_CONCURRENCY = 5;
const LINK_CHECK_CONCURRENCY = 8;
const MAX_LINK_CHECKS = 150;

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, ...(init?.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

type RobotsRules = { disallow: string[] };

async function fetchRobots(origin: string): Promise<RobotsRules> {
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`);
    if (!res.ok) return { disallow: [] };
    const text = await res.text();
    const lines = text.split("\n").map((l) => l.trim());
    let applies = false;
    const disallow: string[] = [];
    for (const line of lines) {
      const [rawKey, ...rest] = line.split(":");
      if (!rawKey) continue;
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        applies = value === "*";
      } else if (key === "disallow" && applies && value) {
        disallow.push(value);
      }
    }
    return { disallow };
  } catch {
    return { disallow: [] };
  }
}

function isDisallowed(pathname: string, rules: RobotsRules): boolean {
  return rules.disallow.some((rule) => pathname.startsWith(rule));
}

function extractPage(url: string, html: string): Omit<
  CrawledPage,
  "statusCode" | "ok" | "redirectedFrom" | "fetchError" | "loadTimeMs" | "sizeBytes" | "url" | "contentType"
> {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  const titleEls = $("title");
  const title = titleEls.first().text().trim() || null;

  const metaDescEls = $('meta[name="description" i]');
  const metaDescription = metaDescEls.first().attr("content")?.trim() || null;

  const h1s = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const canonical = $('link[rel="canonical"]').first().attr("href")?.trim() || null;
  const viewport = $('meta[name="viewport" i]').first().attr("content")?.trim() || null;
  const lang = $("html").first().attr("lang")?.trim() || null;
  const robotsMeta = $('meta[name="robots" i]').first().attr("content")?.trim() || null;

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  const images = $("img")
    .map((_, el) => ({
      src: $(el).attr("src")?.trim() || "",
      alt: $(el).attr("alt") ?? null,
    }))
    .get()
    .filter((img) => img.src);

  const links: LinkRecord[] = $("a[href]")
    .map((_, el) => {
      const href = $(el).attr("href")?.trim() || "";
      const text = $(el).text().trim();
      return { href, text };
    })
    .get()
    .filter((l) => l.href && !l.href.startsWith("mailto:") && !l.href.startsWith("tel:") && !l.href.startsWith("javascript:"))
    .map((l) => {
      let resolved: string | null;
      try {
        resolved = new URL(l.href, url).toString();
      } catch {
        resolved = null;
      }
      return resolved
        ? { href: resolved, text: l.text, isInternal: new URL(resolved).origin === origin }
        : null;
    })
    .filter((l): l is LinkRecord => l !== null);

  return {
    title,
    titleCount: titleEls.length,
    metaDescription,
    metaDescriptionCount: metaDescEls.length,
    h1s,
    h2Count: $("h2").length,
    canonical,
    viewport,
    lang,
    robotsMeta,
    wordCount,
    images,
    links,
  };
}

async function crawlPage(url: string): Promise<CrawledPage> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url);
    const loadTimeMs = Date.now() - start;
    const contentType = res.headers.get("content-type");
    const finalUrl = res.url || url;
    const redirectedFrom = finalUrl !== url ? url : null;

    if (!contentType || !contentType.includes("text/html")) {
      return {
        url: finalUrl,
        statusCode: res.status,
        ok: res.ok,
        redirectedFrom,
        fetchError: null,
        loadTimeMs,
        sizeBytes: Number(res.headers.get("content-length") ?? 0),
        contentType,
        title: null,
        titleCount: 0,
        metaDescription: null,
        metaDescriptionCount: 0,
        h1s: [],
        h2Count: 0,
        canonical: null,
        viewport: null,
        lang: null,
        robotsMeta: null,
        wordCount: 0,
        images: [],
        links: [],
      };
    }

    const html = await res.text();
    const extracted = extractPage(finalUrl, html);

    return {
      url: finalUrl,
      statusCode: res.status,
      ok: res.ok,
      redirectedFrom,
      fetchError: null,
      loadTimeMs,
      sizeBytes: Buffer.byteLength(html, "utf-8"),
      contentType,
      ...extracted,
    };
  } catch (err) {
    return {
      url,
      statusCode: null,
      ok: false,
      redirectedFrom: null,
      fetchError: err instanceof Error ? err.message : "Unknown fetch error",
      loadTimeMs: Date.now() - start,
      sizeBytes: 0,
      contentType: null,
      title: null,
      titleCount: 0,
      metaDescription: null,
      metaDescriptionCount: 0,
      h1s: [],
      h2Count: 0,
      canonical: null,
      viewport: null,
      lang: null,
      robotsMeta: null,
      wordCount: 0,
      images: [],
      links: [],
    };
  }
}

async function checkLink(url: string): Promise<LinkCheckResult> {
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD" });
    if (res.status === 405 || res.status === 501) {
      res = await fetchWithTimeout(url, { method: "GET" });
    }
    return { url, statusCode: res.status, ok: res.ok, error: null };
  } catch (err) {
    return {
      url,
      statusCode: null,
      ok: false,
      error: err instanceof Error ? err.message : "Unknown fetch error",
    };
  }
}

export async function crawlSite(
  rootUrlRaw: string,
  pageLimit: number,
  onProgress?: (crawled: number, total: number, currentUrl: string) => void,
): Promise<CrawlResult> {
  const rootUrl = normalizeUrl(rootUrlRaw);
  if (!rootUrl) throw new Error("Invalid URL");

  const origin = new URL(rootUrl).origin;
  const robots = await fetchRobots(origin);

  const visited = new Set<string>();
  const queue: string[] = [rootUrl];
  const pages: CrawledPage[] = [];
  const limit = pLimit(CRAWL_CONCURRENCY);
  let pageLimitHit = false;

  while (queue.length > 0 && pages.length < pageLimit) {
    const batch = queue.splice(0, Math.min(CRAWL_CONCURRENCY, pageLimit - pages.length));
    const toFetch = batch.filter((u) => !visited.has(u));
    toFetch.forEach((u) => visited.add(u));
    if (toFetch.length === 0) continue;

    const results = await Promise.all(
      toFetch.map((u) => limit(() => crawlPage(u))),
    );

    for (const page of results) {
      pages.push(page);
      onProgress?.(pages.length, pageLimit, page.url);

      for (const link of page.links) {
        if (!link.isInternal) continue;
        const normalized = normalizeUrl(link.href);
        if (!normalized || visited.has(normalized)) continue;
        let pathname = "/";
        try {
          pathname = new URL(normalized).pathname;
        } catch {
          continue;
        }
        if (isDisallowed(pathname, robots)) continue;
        if (visited.size + queue.length >= pageLimit * 3) continue;
        queue.push(normalized);
      }
    }
  }

  if (queue.length > 0) pageLimitHit = true;

  const uniqueLinks = new Map<string, boolean>();
  for (const page of pages) {
    for (const link of page.links) {
      if (!uniqueLinks.has(link.href)) uniqueLinks.set(link.href, link.isInternal);
    }
  }

  const crawledUrls = new Set(pages.map((p) => p.url));
  const linksToCheck = [...uniqueLinks.keys()]
    .filter((url) => !crawledUrls.has(url))
    .slice(0, MAX_LINK_CHECKS);

  const linkLimit = pLimit(LINK_CHECK_CONCURRENCY);
  const checkResults = await Promise.all(
    linksToCheck.map((url) => linkLimit(() => checkLink(url))),
  );

  const linkChecks = new Map<string, LinkCheckResult>();
  for (const page of pages) {
    linkChecks.set(page.url, {
      url: page.url,
      statusCode: page.statusCode,
      ok: page.ok,
      error: page.fetchError,
    });
  }
  for (const result of checkResults) {
    linkChecks.set(result.url, result);
  }

  return { rootUrl, pages, linkChecks, pageLimitHit };
}
