export type GradeCategoryDTO = "title" | "headings" | "content" | "keywords" | "links";

export type GradeCheckDTO = {
  key: string;
  category: GradeCategoryDTO;
  severity: "critical" | "warning" | "info";
  passed: boolean;
  title: string;
  description: string;
};

export type ContentGradeDTO = {
  id: string;
  url: string;
  targetKeyword: string;
  status: "running" | "completed" | "failed";
  errorMessage: string | null;
  score: number | null;
  wordCount: number | null;
  checks: GradeCheckDTO[];
  createdAt: string;
};

export const GRADE_CATEGORY_META: Record<GradeCategoryDTO, { label: string }> = {
  title: { label: "Title & Meta" },
  headings: { label: "Headings" },
  content: { label: "Content" },
  keywords: { label: "Keyword usage" },
  links: { label: "Links" },
};
