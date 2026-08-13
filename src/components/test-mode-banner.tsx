import { FlaskConical } from "lucide-react";

/**
 * Shown wherever someone could try to pay while Paddle is pointed at sandbox.
 *
 * The site is publicly reachable, so without this a real visitor would enter a
 * real card, watch it fail for no stated reason, and quietly conclude the
 * product is broken. Renders nothing once PADDLE_ENV is production, so there
 * is no switch to remember to flip at launch.
 */
export function TestModeBanner() {
  if (process.env.PADDLE_ENV === "production") return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8">
      <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-tint px-5 py-4">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div className="text-sm">
          <p className="font-bold text-foreground">
            Payments are in test mode right now.
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Nothing is charged and real cards will not work. If you are helping
            us test, use card <span className="font-mono font-semibold">4242 4242 4242 4242</span>{" "}
            with any name, any future expiry, and any CVV. Otherwise, check back
            shortly and billing will be open properly.
          </p>
        </div>
      </div>
    </div>
  );
}
