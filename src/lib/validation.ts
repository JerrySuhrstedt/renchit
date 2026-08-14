export function normalizeAuditUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL must use http or https");
  }
  return url.origin;
}

/**
 * Deliberately loose. The only address that is genuinely proven valid is one
 * that received mail, so this catches typos and pasted junk without turning
 * away real addresses for looking unusual.
 */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
