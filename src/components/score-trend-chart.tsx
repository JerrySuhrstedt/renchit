"use client";

import { useId, useState } from "react";

export type TrendPoint = { label: string; value: number };

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 30;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
// Health scores are a fixed 0-100 scale, so anchor the axis there rather than
// to the data range; a jump from 71 to 74 shouldn't fill the whole chart.
const Y_MIN = 0;
const Y_MAX = 100;
const GRID_LINES = [0, 50, 100];

export function ScoreTrendChart({
  points,
  ariaLabel,
}: {
  points: TrendPoint[];
  ariaLabel: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) =>
    points.length === 1
      ? PAD_LEFT + plotWidth / 2
      : PAD_LEFT + (i / (points.length - 1)) * plotWidth;
  const y = (v: number) =>
    PAD_TOP + plotHeight - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * plotHeight;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const areaPath = `${linePath} L ${x(points.length - 1)} ${PAD_TOP + plotHeight} L ${x(0)} ${PAD_TOP + plotHeight} Z`;

  const active = hover !== null ? points[hover] : null;

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={ariaLabel}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {GRID_LINES.map((v) => (
            <g key={v}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={y(v) + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                style={{ fontSize: 11 }}
              >
                {v}
              </text>
            </g>
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => (
            <g key={`${p.label}-${i}`}>
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={hover === i ? 6 : 4}
                fill="var(--brand)"
                stroke="var(--card)"
                strokeWidth={2}
              />
              {/* Hit target wider than the mark so hovering is forgiving */}
              <rect
                x={x(i) - plotWidth / Math.max(points.length, 2) / 2}
                y={PAD_TOP}
                width={plotWidth / Math.max(points.length, 2)}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          ))}

          {points.map((p, i) => {
            // Label only the ends; a date under every point turns to mush.
            if (points.length > 2 && i !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={`label-${i}`}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                className="fill-muted-foreground"
                style={{ fontSize: 11 }}
              >
                {p.label}
              </text>
            );
          })}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${(x(hover!) / WIDTH) * 100}%`,
              top: `${(y(active.value) / HEIGHT) * 100}%`,
            }}
          >
            <span className="font-bold text-foreground">{active.value}</span>
            <span className="text-muted-foreground"> · {active.label}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
