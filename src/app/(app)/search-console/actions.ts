"use server";

import { signIn } from "@/lib/auth";
import { SEARCH_CONSOLE_SCOPE } from "@/lib/google-token";

/**
 * Incremental authorization: the normal sign-in only asks for profile/email,
 * so nobody sees a Search Console permission prompt until they actually opt
 * into this tool. access_type=offline + prompt=consent are both required for
 * Google to hand back a refresh token.
 */
export async function connectSearchConsole() {
  await signIn(
    "google",
    { redirectTo: "/search-console" },
    {
      scope: `openid email profile ${SEARCH_CONSOLE_SCOPE}`,
      access_type: "offline",
      prompt: "consent",
    },
  );
}
