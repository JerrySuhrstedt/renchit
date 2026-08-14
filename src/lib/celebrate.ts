/**
 * The confetti burst for a good PageSpeed score.
 *
 * Threshold matches Google's own "good" cutoff, so the ring turning green and
 * the confetti firing are the same moment rather than two unrelated rules.
 */
export const CELEBRATE_AT = 90;

/**
 * Anyone who has asked their operating system to reduce motion has asked for
 * a reason, and flying particles are a well-known vestibular trigger. They get
 * the result without the animation.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Google's PageSpeed green, plus our brand, so it feels like our app. */
const COLORS = ["#0cce6b", "#fc5434", "#ffa400", "#ffffff"];

export async function celebrate(): Promise<void> {
  if (prefersReducedMotion()) return;

  // Imported on demand so the library is not in the bundle for the many page
  // loads that never score 90.
  const confetti = (await import("canvas-confetti")).default;

  const base = {
    colors: COLORS,
    disableForReducedMotion: true,
    zIndex: 60,
  };

  // Two angled bursts from the lower corners, which reads as celebration
  // rather than as something falling on the content.
  confetti({ ...base, particleCount: 60, spread: 60, angle: 60, origin: { x: 0, y: 0.7 } });
  confetti({ ...base, particleCount: 60, spread: 60, angle: 120, origin: { x: 1, y: 0.7 } });

  setTimeout(() => {
    confetti({ ...base, particleCount: 40, spread: 100, origin: { x: 0.5, y: 0.5 } });
  }, 220);
}
