import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models";
import { updateOrganizationSchema } from "@/lib/validations";
import { withTenantAdmin, type AuthSession } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/organizations/[id] — get single org
export const GET = (req: Request, ctx: RouteContext) =>
  withTenantAdmin(async () => {
    const { id } = await ctx.params;
    await connectDB();
    const org = await Organization.findOne({ _id: id, deletedAt: null }).lean();
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    return NextResponse.json(org);
  })(req);

// PUT /api/organizations/[id] — update org
export const PUT = (req: Request, ctx: RouteContext) =>
  withTenantAdmin(async (innerReq: Request) => {
    const { id } = await ctx.params;
    const body = await innerReq.json();
    const parsed = updateOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    await connectDB();

    // Check name uniqueness if changed
    if (parsed.data.name) {
      const existing = await Organization.findOne({
        name: parsed.data.name,
        _id: { $ne: id },
        deletedAt: null,
      });
      if (existing) {
        return NextResponse.json({ error: "Organization name already taken" }, { status: 409 });
      }
    }

    const org = await Organization.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: parsed.data },
      { new: true }
    ).lean();

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(org);
  })(req);

// DELETE /api/organizations/[id] — soft delete org
export const DELETE = (req: Request, ctx: RouteContext) =>
  withTenantAdmin(async () => {
    const { id } = await ctx.params;
    await connectDB();

    const org = await Organization.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    ).lean();

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Organization deleted" });
  })(req);
