import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/plans";
import { signInEmailHtml, signInEmailText } from "@/lib/auth-email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google,
    /**
     * Magic links, so anyone without a Google account can still sign up.
     *
     * Passwordless on purpose: no password to invent, forget, reset, or for
     * us to store. Proving you can read the inbox is the same thing a
     * password reset proves anyway, with fewer steps and nothing to leak.
     *
     * Signing in by email as an address that already exists as a Google
     * account signs you into that same account rather than making a second
     * one, which is safe because possession of the inbox is proven.
     */
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "renchit <onboarding@resend.dev>",
      name: "Email",
      async sendVerificationRequest({ identifier, url, provider }) {
        const host = new URL(url).host;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: identifier,
            subject: "Your renchit sign-in link",
            html: signInEmailHtml({ url, host }),
            text: signInEmailText({ url, host }),
          }),
        });

        if (!res.ok) {
          // Surfacing the real reason matters here: almost every failure is
          // an unverified sending domain, and a generic error sends you
          // hunting the wrong thing.
          const detail = await res.text().catch(() => "");
          throw new Error(`Resend refused the sign-in email: ${res.status} ${detail}`);
        }
      },
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
    error: "/sign-in",
  },
  callbacks: {
    // The PrismaAdapter only writes tokens when it first links an account, so
    // re-authorizing to add the Search Console scope would otherwise leave the
    // original narrow-scope token in place. Persist the fresh one ourselves.
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !account.access_token) return true;

      // The adapter only writes name and image when it first creates the user,
      // so a photo added or changed in Google later never reaches us. Refresh
      // both on every sign-in, and never overwrite a good value with a blank.
      const picture = typeof profile?.picture === "string" ? profile.picture : null;
      const displayName = typeof profile?.name === "string" ? profile.name : null;
      if (user?.id && (picture || displayName)) {
        await db.user
          .update({
            where: { id: user.id },
            data: {
              ...(picture ? { image: picture } : {}),
              ...(displayName ? { name: displayName } : {}),
            },
          })
          .catch(() => {});
      }

      await db.account
        .updateMany({
          where: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
          data: {
            access_token: account.access_token,
            expires_at: typeof account.expires_at === "number" ? account.expires_at : null,
            scope: account.scope ?? null,
            // Google only returns a refresh_token on first consent (or when
            // prompt=consent forces one), so never clobber a good one with null.
            ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
          },
        })
        .catch(() => {});

      return true;
    },
  },
  events: {
    // Fires exactly once, the moment a brand-new User row is created, i.e.
    // the very first sign-in ever. That first person claims any data created
    // before accounts existed (a one-time migration, not an ongoing rule).
    async createUser({ user }) {
      if (!user.id) return;

      // Every new account gets the full-access trial. Prisma cannot express
      // "now plus 14 days" as a column default, so it is granted here, at the
      // single point where an account comes into existence.
      await db.user.update({
        where: { id: user.id },
        data: { trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) },
      });

      await db.site.updateMany({ where: { userId: null }, data: { userId: user.id } });
      await db.keywordSearch.updateMany({ where: { userId: null }, data: { userId: user.id } });
      await db.contentGrade.updateMany({ where: { userId: null }, data: { userId: user.id } });
    },
  },
});
