import type { NextAuthConfig } from "next-auth";

// Lightweight config — no Prisma, no providers, Edge-runtime safe.
// Used by middleware only. Providers are defined in auth.ts (Node.js only).
export const authConfig: NextAuthConfig = {
  providers: [],
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
