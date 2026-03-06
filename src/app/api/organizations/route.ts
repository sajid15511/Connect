import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models";
import { createOrganizationSchema } from "@/lib/validations";
import { withTenantAdmin } from "@/lib/api-helpers";

// GET /api/organizations — tenant admin lists all organizations
export const GET = withTenantAdmin(async () => {
  await connectDB();
  const orgs = await Organization.find({ deletedAt: null }).lean();
  return NextResponse.json(orgs);
});

// POST /api/organizations — tenant admin creates organization
export const POST = withTenantAdmin(async (req) => {
  const body = await req.json();
  const parsed = createOrganizationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const existing = await Organization.findOne({ name: parsed.data.name, deletedAt: null });
  if (existing) {
    return NextResponse.json({ error: "Organization name already taken" }, { status: 409 });
  }

  const org = await Organization.create({ name: parsed.data.name });
  return NextResponse.json(org, { status: 201 });
});
