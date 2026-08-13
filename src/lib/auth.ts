import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [Google],
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    // The PrismaAdapter only writes tokens when it first links an account, so
    // re-authorizing to add the Search Console scope would otherwise leave the
    // original narrow-scope token in place. Persist the fresh one ourselves.
    async signIn({ account }) {
      if (account?.provider !== "google" || !account.access_token) return true;

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
      await db.site.updateMany({ where: { userId: null }, data: { userId: user.id } });
      await db.keywordSearch.updateMany({ where: { userId: null }, data: { userId: user.id } });
      await db.contentGrade.updateMany({ where: { userId: null }, data: { userId: user.id } });
    },
  },
});
