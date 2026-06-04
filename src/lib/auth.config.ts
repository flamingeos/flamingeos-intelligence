import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Lightweight config — no Prisma, Edge-runtime safe.
// Used by middleware only.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isCron = nextUrl.pathname.startsWith("/api/cron");

      if (isApiAuth) return true;

      if (isCron) {
        // Cron secret check is handled inside the route handler
        return true;
      }

      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (!isLoggedIn && !isAuthPage) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
};
