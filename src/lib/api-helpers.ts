import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    organizationId: string;
    role: string;
  };
};

/**
 * Wraps an API handler with authentication and org scoping.
 * Injects the session so every handler has guaranteed access.
 */
export function withAuth(
  handler: (req: Request, session: AuthSession) => Promise<NextResponse>
) {
  return async (req: Request) => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, session as AuthSession);
  };
}

/**
 * Wraps an API handler requiring organization admin role.
 */
export function withAdmin(
  handler: (req: Request, session: AuthSession) => Promise<NextResponse>
) {
  return withAuth(async (req, session) => {
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, session);
  });
}

/**
 * Wraps an API handler requiring tenant_admin role.
 */
export function withTenantAdmin(
  handler: (req: Request, session: AuthSession) => Promise<NextResponse>
) {
  return withAuth(async (req, session) => {
    if (session.user.role !== "tenant_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, session);
  });
}
