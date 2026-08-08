export type IdeaCategoryDTO = "question" | "comparison" | "alphabetical";

export type KeywordIdeaDTO = {
  id: string;
  phrase: string;
  category: IdeaCategoryDTO;
  saved: boolean;
};

export type KeywordSearchDTO = {
  id: string;
  seed: string;
  status: "running" | "completed" | "failed";
  createdAt: string;
  ideas: KeywordIdeaDTO[];
};

export const IDEA_CATEGORY_META: Record<IdeaCategoryDTO, { label: string }> = {
  question: { label: "Questions people ask" },
  comparison: { label: "Comparisons & modifiers" },
  alphabetical: { label: "More ideas, A–Z" },
};
