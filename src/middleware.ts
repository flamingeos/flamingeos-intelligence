import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Uses the lightweight Edge-safe config — no Prisma, no Node.js APIs
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
