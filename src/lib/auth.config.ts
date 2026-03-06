import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth configuration.
 * This file must NOT import any Node.js modules (bcryptjs, mongoose, etc.)
 * so it can be used in the Next.js middleware (Edge Runtime).
 *
 * The `authorize` callback lives in auth.ts (server-only).
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      organizationId: string; // empty string for tenant_admin
      role: string;
    };
  }

  interface User {
    organizationId: string; // empty string for tenant_admin
    role: string;
  }
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [], // Populated in auth.ts with Credentials provider
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");

      if (isAuthPage) {
        // Redirect logged-in users away from auth pages
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.organizationId = user.organizationId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.organizationId = token.organizationId as string;
      session.user.role = token.role as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
