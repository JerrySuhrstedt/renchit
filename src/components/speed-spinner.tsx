/**
 * A spinner that actually spins.
 *
 * The lucide Gauge icon was used here before, but its needle and arc sit
 * off-centre inside the icon's box, so rotating it orbits the centre rather
 * than turning on the spot. Everything below is drawn concentrically around
 * 50,50, which is the whole point: it cannot wobble.
 *
 * Two arcs at different radii, turning opposite ways at different speeds, so
 * the motion stays interesting for the thirty seconds or so a test takes.
 */
export function SpeedSpinner({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-20 w-20 items-center justify-center ${className}`}>
      <span
        className="absolute inset-0 -z-10 animate-pulse rounded-full bg-brand-tint blur-xl"
        aria-hidden
      />

      <svg viewBox="0 0 100 100" className="relative h-full w-full" role="status" aria-label="Running the test">
        {/* Full track, so the arcs read as moving along something */}
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="8" />

        {/* Outer arc, clockwise. 90 of 276 circumference is a quarter turn. */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="var(--brand-strong)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="70 207"
          className="origin-center animate-spin motion-reduce:animate-none"
          style={{ animationDuration: "1.4s" }}
        />

        {/* Inner arc, anticlockwise and slower, for a bit of depth */}
        <circle
          cx="50"
          cy="50"
          r="28"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="44 132"
          className="origin-center animate-spin opacity-70 motion-reduce:animate-none"
          style={{ animationDuration: "2.2s", animationDirection: "reverse" }}
        />

        {/* Centre dot: gives the eye a fixed point, which is what makes the
            rotation read as steady rather than drifting. */}
        <circle cx="50" cy="50" r="6" fill="var(--brand-strong)" className="animate-pulse" />
      </svg>
    </span>
  );
}
