import { randomInt } from "node:crypto";

/**
 * Discount code generation and the rules around it.
 *
 * Codes live in Paddle, not our database, because Paddle is the merchant of
 * record and applies the discount at checkout. Anything we stored locally
 * would be decoration.
 */

/**
 * No 0/O, no 1/I/L. People read these off screenshots, retype them from a
 * phone, and read them aloud, and every ambiguous character becomes a support
 * email about a code that "does not work".
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const MAX_BATCH = 200;
export const DEFAULT_EXPIRY_DAYS = 30;

/** Paddle enforces ^[a-zA-Z0-9]{1,32}$ on codes: no hyphens, no spaces. */
const MAX_CODE_LENGTH = 32;
const MAX_PREFIX_LENGTH = 12;

/**
 * Uses crypto randomness rather than Math.random. These are effectively
 * bearer tokens for money off, and a predictable sequence is guessable.
 */
export function generateCode(prefix = "", length = 8): string {
  let body = "";
  for (let i = 0; i < length; i++) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  // No separator: Paddle rejects anything that is not alphanumeric, so a
  // hyphen between prefix and body fails validation outright.
  const clean = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MAX_PREFIX_LENGTH);
  return `${clean}${body}`.slice(0, MAX_CODE_LENGTH);
}

export function generateBatch(count: number, prefix = "", length = 8): string[] {
  const seen = new Set<string>();
  // Collisions are vanishingly unlikely at this alphabet and length, but a
  // duplicate would mean two people sharing one redemption, so check anyway.
  while (seen.size < count) seen.add(generateCode(prefix, length));
  return [...seen];
}

export type DiscountKind = "percentage" | "flat";

export type NewDiscount = {
  kind: DiscountKind;
  /** Percent (1 to 100) for percentage, dollars for flat. */
  value: number;
  description: string;
  prefix: string;
  /** How many distinct codes to mint. */
  quantity: number;
  /** Redemptions allowed per code. null means unlimited. */
  usageLimit: number | null;
  expiresInDays: number | null;
  /** Whether the discount repeats on renewals or applies once. */
  recur: boolean;
  maximumRecurringIntervals: number | null;
  /** Paddle price ids this is valid for. Empty means everything. */
  restrictTo: string[];
};

export type ValidationError = { field: string; message: string };

export function validate(input: NewDiscount): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.kind === "percentage") {
    if (!(input.value > 0 && input.value <= 100)) {
      errors.push({ field: "value", message: "A percentage must be between 1 and 100." });
    }
  } else if (!(input.value > 0)) {
    errors.push({ field: "value", message: "Enter an amount greater than zero." });
  }

  if (!input.description.trim()) {
    errors.push({ field: "description", message: "Give it a name so you know what it was for." });
  }
  if (!(input.quantity >= 1 && input.quantity <= MAX_BATCH)) {
    errors.push({ field: "quantity", message: `Between 1 and ${MAX_BATCH} codes at a time.` });
  }
  if (input.usageLimit !== null && input.usageLimit < 1) {
    errors.push({ field: "usageLimit", message: "A usage limit must be at least 1." });
  }
  if (input.expiresInDays !== null && input.expiresInDays < 1) {
    errors.push({ field: "expiresInDays", message: "Expiry must be at least a day away." });
  }
  if (input.recur && input.maximumRecurringIntervals !== null && input.maximumRecurringIntervals < 1) {
    errors.push({ field: "maximumRecurringIntervals", message: "Must repeat at least once." });
  }

  return errors;
}

/**
 * Things that are legal but usually a mistake. Surfaced as warnings rather
 * than blocks, because occasionally you do mean it.
 */
export function warnings(input: NewDiscount): string[] {
  const out: string[] = [];

  if (input.kind === "percentage" && input.value === 100) {
    out.push("100% off makes this free. Anyone with the code pays nothing.");
  } else if (input.kind === "percentage" && input.value > 50) {
    out.push(`${input.value}% off is steep. Double-check that is what you meant.`);
  }

  if (input.expiresInDays === null) {
    out.push(
      "No expiry date. Codes that never die turn up on coupon sites years later, so set one unless you have a reason not to.",
    );
  }

  if (input.usageLimit === null && input.quantity === 1) {
    out.push(
      "One shared code with unlimited uses. If it leaks, everybody gets the discount. Consider a usage cap or a batch of single-use codes.",
    );
  }

  if (input.recur && input.maximumRecurringIntervals === null) {
    out.push(
      "This repeats on every renewal forever, so the customer keeps the discount for the life of the subscription.",
    );
  }

  return out;
}

/** Paddle wants percentages as a plain number and flat amounts in minor units. */
export function toPaddleAmount(kind: DiscountKind, value: number): string {
  return kind === "percentage" ? String(value) : String(Math.round(value * 100));
}

export function expiryFromDays(days: number | null): string | null {
  if (days === null) return null;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}
