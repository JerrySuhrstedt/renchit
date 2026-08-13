"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Star } from "lucide-react";
import {
  IDEA_CATEGORY_META,
  type IdeaCategoryDTO,
  type KeywordIdeaDTO,
  type KeywordSearchDTO,
} from "@/lib/keyword-types";

const CATEGORY_ORDER: IdeaCategoryDTO[] = [
  "question",
  "comparison",
  "alphabetical",
];

export function KeywordResultsView({ search }: { search: KeywordSearchDTO }) {
  const [ideas, setIdeas] = useState<KeywordIdeaDTO[]>(search.ideas);
  const [filter, setFilter] = useState<"all" | "saved">("all");
  const [copied, setCopied] = useState(false);

  function toggleSaved(id: string, saved: boolean) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, saved } : i)));
    fetch(`/api/keyword-ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved }),
    }).catch(() => {
      setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, saved: !saved } : i)));
    });
  }

  const savedIdeas = ideas.filter((i) => i.saved);
  const savedCount = savedIdeas.length;
  const visibleIdeas = filter === "saved" ? ideas.filter((i) => i.saved) : ideas;

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: visibleIdeas.filter((i) => i.category === category),
      })).filter((g) => g.items.length > 0),
    [visibleIdeas],
  );

  async function copySaved() {
    const text = ideas
      .filter((i) => i.saved)
      .map((i) => i.phrase)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8">
      <Link
        href="/keywords"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All searches
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card px-6 py-8 text-center sm:px-10">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {search.seed}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ideas.length} real search phrase{ideas.length === 1 ? "" : "s"}{" "}
              found · click any idea to save it
            </p>
          </div>

          <div className="mt-8 flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
              All ({ideas.length})
            </FilterTab>
            <FilterTab active={filter === "saved"} onClick={() => setFilter("saved")}>
              Saved ({savedCount})
            </FilterTab>
          </div>

          <div className="mt-6 flex flex-col gap-8">
            {groups.length === 0 && (
              <p className="rounded-3xl border border-dashed border-border bg-card/60 px-8 py-14 text-center text-sm text-muted-foreground">
                {filter === "saved"
                  ? "Nothing saved yet. Click any idea below to star it."
                  : "No ideas found for this search."}
              </p>
            )}
            {groups.map((group) => (
              <div key={group.category} className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    {IDEA_CATEGORY_META[group.category].label}
                  </h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {group.items.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((idea) => (
                    <button
                      key={idea.id}
                      type="button"
                      onClick={() => toggleSaved(idea.id, !idea.saved)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                        idea.saved
                          ? "border-brand bg-brand-tint text-brand-strong"
                          : "border-border bg-card text-foreground hover:border-brand/40"
                      }`}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${idea.saved ? "fill-brand-strong text-brand-strong" : "text-muted-foreground/50"}`}
                      />
                      {idea.phrase}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground">
              Your list {savedCount > 0 && `(${savedCount})`}
            </h2>
            {savedCount > 0 && (
              <button
                type="button"
                onClick={copySaved}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand-strong"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
            )}
          </div>

          {savedCount === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Click any idea to add it here.
            </p>
          ) : (
            <ul className="mt-3 flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
              {savedIdeas.map((idea) => (
                <li
                  key={idea.id}
                  className="truncate rounded-lg px-2 py-1.5 text-sm text-foreground/90 odd:bg-secondary/50"
                >
                  {idea.phrase}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-brand-strong text-brand-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
