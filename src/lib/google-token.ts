import { db } from "./db";

export const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
// Refresh a little early so a token can't expire mid-request.
const EXPIRY_SKEW_SECONDS = 60;

export type GoogleTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "not-connected" | "scope-missing" | "refresh-failed" };

/**
 * Returns a usable Google access token for this user, refreshing it first if
 * it has expired. NextAuth stores the tokens on the Account row; it does not
 * refresh them for us, so this is where that happens.
 */
export async function getSearchConsoleAccessToken(userId: string): Promise<GoogleTokenResult> {
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });

  if (!account?.access_token) return { ok: false, reason: "not-connected" };
  if (!account.scope?.includes(SEARCH_CONSOLE_SCOPE)) {
    return { ok: false, reason: "scope-missing" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const stillValid =
    account.expires_at !== null && account.expires_at - EXPIRY_SKEW_SECONDS > nowSeconds;
  if (stillValid) return { ok: true, accessToken: account.access_token };

  if (!account.refresh_token) return { ok: false, reason: "refresh-failed" };

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return { ok: false, reason: "refresh-failed" };

  let refreshed: { access_token?: string; expires_in?: number; refresh_token?: string };
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: account.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return { ok: false, reason: "refresh-failed" };
    refreshed = await res.json();
  } catch {
    return { ok: false, reason: "refresh-failed" };
  }

  if (!refreshed.access_token) return { ok: false, reason: "refresh-failed" };

  await db.account.update({
    where: { id: account.id },
    data: {
      access_token: refreshed.access_token,
      expires_at: refreshed.expires_in
        ? Math.floor(Date.now() / 1000) + refreshed.expires_in
        : null,
      // Google usually omits refresh_token on refresh, so keep the existing one.
      refresh_token: refreshed.refresh_token ?? account.refresh_token,
    },
  });

  return { ok: true, accessToken: refreshed.access_token };
}

export async function hasSearchConsoleScope(userId: string): Promise<boolean> {
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
    select: { scope: true },
  });
  return Boolean(account?.scope?.includes(SEARCH_CONSOLE_SCOPE));
}
