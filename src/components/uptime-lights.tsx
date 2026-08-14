import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";

/**
 * The traffic light on the dashboard: one signal per site being watched.
 *
 * Green is up, red is down, and amber is the state that earns its place here:
 * we genuinely do not know. A monitor keeps its last status in the database
 * forever, so a green lamp would stay green even if the scheduler stopped
 * calling us hours ago. Anything past its schedule goes amber instead. A
 * confident wrong green is worse than an honest "no reading".
 *
 * A dark signal means checking is paused, which is what an unlit traffic light
 * means on a real road too.
 */

export type LampState = "up" | "down" | "unknown" | "paused";

export type UptimeLight = {
  id: string;
  host: string;
  /** Resolved on the server, staleness already accounted for. */
  state: LampState;
  detail: string;
};

const LABELS: Record<LampState, string> = {
  up: "Up",
  down: "Down",
  unknown: "No reading",
  paused: "Paused",
};

const TEXT_TONE: Record<LampState, string> = {
  up: "text-success",
  down: "text-critical",
  unknown: "text-warning",
  paused: "text-muted-foreground",
};

export function UptimeLights({ lights }: { lights: UptimeLight[] }) {
  const anyDown = lights.some((l) => l.state === "down");

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Is my site up?</h2>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline"
        >
          Alerts <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {lights.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background/60 px-6 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint">
            <Bell className="h-5 w-5 text-brand-strong" aria-hidden />
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">
            Nothing being watched yet. We can check your site every few minutes
            and email you the moment it stops responding.
          </p>
          <Link
            href="/alerts"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-strong px-5 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong/90"
          >
            Watch my site <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {lights.map((light) => (
              <li
                key={light.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-background/50 p-4"
              >
                <TrafficLight state={light.state} host={light.host} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {light.host}
                  </p>
                  {/* Colour alone is never the status. The word says it too. */}
                  <p className={`text-sm font-bold ${TEXT_TONE[light.state]}`}>
                    {LABELS[light.state]}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {light.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {anyDown && (
            <p className="mt-3 text-sm font-semibold text-critical">
              We have emailed everyone on your alert list.
            </p>
          )}

          <Legend />
        </>
      )}
    </section>
  );
}

/**
 * The signal itself. Three lamps in a housing, one lit, the rest dark, which
 * is what makes it readable at a glance: the position of the lit lamp carries
 * the meaning even before the colour does.
 */
function TrafficLight({ state, host }: { state: LampState; host: string }) {
  return (
    <div
      role="img"
      aria-label={`${host}: ${LABELS[state]}`}
      className="flex shrink-0 flex-col gap-1.5 rounded-xl border border-lamp-housing-edge bg-lamp-housing p-1.5 shadow-sm"
    >
      <Lamp color="red" lit={state === "down"} />
      <Lamp color="amber" lit={state === "unknown"} />
      <Lamp color="green" lit={state === "up"} />
    </div>
  );
}

const LAMP_COLOR = {
  red: { on: "bg-lamp-red", glow: "shadow-[0_0_10px_2px_var(--lamp-red)]" },
  amber: { on: "bg-lamp-amber", glow: "shadow-[0_0_10px_2px_var(--lamp-amber)]" },
  green: { on: "bg-lamp-green", glow: "shadow-[0_0_10px_2px_var(--lamp-green)]" },
} as const;

function Lamp({ color, lit }: { color: keyof typeof LAMP_COLOR; lit: boolean }) {
  const c = LAMP_COLOR[color];
  return (
    <span
      aria-hidden
      className={
        lit
          ? `h-4 w-4 rounded-full ${c.on} ${c.glow}`
          : // Unlit lamps keep a trace of their own colour, the way a real
            // lens does when it is not illuminated. Fully grey reads as broken.
            `h-4 w-4 rounded-full bg-lamp-off ${c.on} opacity-15`
      }
    />
  );
}

function Legend() {
  const items = [
    { color: "green", label: "Up", meaning: "Answering normally" },
    { color: "red", label: "Down", meaning: "Not answering, we have emailed you" },
    { color: "amber", label: "No reading", meaning: "Last check is out of date" },
    { color: "off", label: "Paused", meaning: "You turned checking off" },
  ] as const;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        What the lights mean
      </p>
      <ul className="mt-2.5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-xs">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-lamp-housing-edge bg-lamp-housing">
              {item.color === "off" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-lamp-off" aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full ${LAMP_COLOR[item.color].on}`}
                />
              )}
            </span>
            <span className="font-bold text-foreground">{item.label}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {item.meaning}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
