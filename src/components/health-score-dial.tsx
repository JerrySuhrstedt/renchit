"use client";

import { useEffect, useRef, useState } from "react";
import { scoreBand } from "@/lib/format";

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function HealthScoreDial({
  score,
  size = "lg",
}: {
  score: number;
  size?: "lg" | "sm";
}) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 1400;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutExpo(t);
      setDisplayed(Math.round(eased * score));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const band = scoreBand(score);
  const dimension = size === "lg" ? 200 : 64;
  const stroke = size === "lg" ? 16 : 7;
  const radius = dimension / 2 - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayed / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: dimension, height: dimension }}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="-rotate-90"
      >
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={band.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke 0.3s ease" }}
        />
      </svg>
      {size === "lg" ? (
        <div className="absolute flex flex-col items-center">
          <span className="text-5xl font-extrabold tabular-nums tracking-tight text-foreground">
            {displayed}
          </span>
          <span
            className="mt-1 text-sm font-semibold"
            style={{ color: band.color }}
          >
            {band.label}
          </span>
        </div>
      ) : (
        <span className="absolute text-base font-bold tabular-nums text-foreground">
          {displayed}
        </span>
      )}
    </div>
  );
}
