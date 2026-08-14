/**
 * Flesch Reading Ease, which is the score Yoast actually reports.
 *
 * Average sentence length alone was a rough stand-in: it cannot tell "the cat
 * sat on the mat" from "the recalcitrant feline positioned itself", which are
 * the same length and nothing like the same difficulty. Flesch weighs syllable
 * count too, which is what catches that.
 */

/**
 * Syllables, approximated by counting vowel groups.
 *
 * There is no exact way to do this without a pronunciation dictionary, and
 * Flesch is tolerant of small errors because it averages across a whole page.
 * The adjustments below are the usual ones: silent trailing e, and never
 * returning zero.
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;

  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export type Readability = {
  score: number;
  /** Plain English, because "Flesch 62" means nothing to most people. */
  label: string;
  /** Yoast treats 60 and above as acceptable. */
  ok: boolean;
};

export function fleschReadingEase(text: string): Readability {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));

  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, label: "not enough text to judge", ok: false };
  }

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const raw =
    206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, label: labelFor(score), ok: score >= 60 };
}

function labelFor(score: number): string {
  if (score >= 90) return "very easy, around a 5th grade reading level";
  if (score >= 80) return "easy, around a 6th grade reading level";
  if (score >= 70) return "fairly easy to read";
  if (score >= 60) return "plain English, easy for most people";
  if (score >= 50) return "a bit heavy going";
  if (score >= 30) return "difficult, closer to academic writing";
  return "very hard to read";
}
