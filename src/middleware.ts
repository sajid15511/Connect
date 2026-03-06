import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth routes)
     * - login / register pages
     * - _next/static, _next/image, favicon.ico, public files
     */
    "/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)",
  ],
};
