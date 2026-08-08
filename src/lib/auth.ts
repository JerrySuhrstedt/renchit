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
  events: {
    // Fires exactly once, the moment a brand-new User row is created — i.e.
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
