export type LinkRecord = {
  href: string;
  text: string;
  isInternal: boolean;
};

export type CrawledPage = {
  url: string;
  statusCode: number | null;
  ok: boolean;
  redirectedFrom: string | null;
  fetchError: string | null;
  loadTimeMs: number;
  sizeBytes: number;
  contentType: string | null;

  title: string | null;
  titleCount: number;
  metaDescription: string | null;
  metaDescriptionCount: number;
  h1s: string[];
  h2Count: number;
  canonical: string | null;
  viewport: string | null;
  lang: string | null;
  robotsMeta: string | null;

  wordCount: number;
  images: { src: string; alt: string | null }[];
  links: LinkRecord[];
};

export type LinkCheckResult = {
  url: string;
  statusCode: number | null;
  ok: boolean;
  error: string | null;
};

export type CrawlResult = {
  rootUrl: string;
  pages: CrawledPage[];
  linkChecks: Map<string, LinkCheckResult>;
  pageLimitHit: boolean;
};

export type IssueSeverity = "critical" | "warning" | "info";
export type IssueCategory =
  | "technical"
  | "content"
  | "meta"
  | "links"
  | "performance";

export type FoundIssue = {
  type: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  fixSteps: string;
  affectedUrl: string | null;
  pageUrl: string | null;
};
