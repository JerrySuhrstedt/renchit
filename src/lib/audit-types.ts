export type IssueDTO = {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  category: "technical" | "content" | "meta" | "links" | "performance";
  title: string;
  description: string;
  fixSteps: string;
  affectedUrl: string | null;
  status: "open" | "resolved" | "ignored";
  pageId: string | null;
};

export type PageDTO = {
  id: string;
  url: string;
  statusCode: number | null;
  title: string | null;
  wordCount: number;
  loadTimeMs: number;
};

export type AuditDTO = {
  id: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  pageLimit: number;
  pagesCrawled: number;
  healthScore: number | null;
  errorMessage: string | null;
  site: { id: string; rootUrl: string; name: string | null };
  pages: PageDTO[];
  issues: IssueDTO[];
};
