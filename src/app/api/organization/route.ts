import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models";
import { withAuth } from "@/lib/api-helpers";

// GET /api/organization — get current user's org
export const GET = withAuth(async (_req, session) => {
  await connectDB();
  const org = await Organization.findById(session.user.organizationId).lean();
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  return NextResponse.json(org);
});
