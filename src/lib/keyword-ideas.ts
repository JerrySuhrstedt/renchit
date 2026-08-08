import pLimit from "p-limit";

export type IdeaCategory = "question" | "comparison" | "alphabetical";

export type GeneratedIdea = {
  phrase: string;
  category: IdeaCategory;
};

const FETCH_TIMEOUT_MS = 6_000;
const CONCURRENCY = 6;

const QUESTION_PREFIXES = [
  "who",
  "what",
  "why",
  "how",
  "when",
  "where",
  "is",
  "can",
  "will",
  "does",
];

const COMPARISON_MODIFIERS = ["vs", "for", "without", "near me", "like", "or"];

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

type QueryPlan = { query: string; category: IdeaCategory };

function buildQueryPlan(seed: string): QueryPlan[] {
  const plans: QueryPlan[] = [];

  for (const prefix of QUESTION_PREFIXES) {
    plans.push({ query: `${prefix} ${seed}`, category: "question" });
  }
  for (const modifier of COMPARISON_MODIFIERS) {
    plans.push({ query: `${seed} ${modifier}`, category: "comparison" });
  }
  for (const letter of ALPHABET) {
    plans.push({ query: `${seed} ${letter}`, category: "alphabetical" });
  }

  return plans;
}

async function fetchSuggestions(query: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function generateKeywordIdeas(seed: string): Promise<GeneratedIdea[]> {
  const plan = buildQueryPlan(seed);
  const limit = pLimit(CONCURRENCY);

  const results = await Promise.all(
    plan.map((p) =>
      limit(async () => ({
        category: p.category,
        suggestions: await fetchSuggestions(p.query),
      })),
    ),
  );

  const seedLower = seed.trim().toLowerCase();
  const categoryPriority: Record<IdeaCategory, number> = {
    question: 0,
    comparison: 1,
    alphabetical: 2,
  };

  const bestByPhrase = new Map<string, GeneratedIdea>();

  for (const { category, suggestions } of results) {
    for (const raw of suggestions) {
      const phrase = raw.trim();
      if (!phrase) continue;
      const key = phrase.toLowerCase();
      if (key === seedLower) continue;

      const existing = bestByPhrase.get(key);
      if (!existing || categoryPriority[category] < categoryPriority[existing.category]) {
        bestByPhrase.set(key, { phrase, category });
      }
    }
  }

  return [...bestByPhrase.values()].sort((a, b) => a.phrase.localeCompare(b.phrase));
}
