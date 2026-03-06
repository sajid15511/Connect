import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, Department } from "@/models";
import { updateEmployeeSchema } from "@/lib/validations";
import { withAdmin, type AuthSession } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/users/[id] — admin updates user
export const PUT = (req: Request, ctx: RouteContext) =>
  withAdmin(async (innerReq: Request, session: AuthSession) => {
    const { id } = await ctx.params;
    const body = await innerReq.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({
      _id: id,
      organizationId: session.user.organizationId,
      deletedAt: null,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.email) {
      // Check email uniqueness
      const exists = await User.findOne({
        email: parsed.data.email,
        organizationId: session.user.organizationId,
        _id: { $ne: id },
        deletedAt: null,
      });
      if (exists) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      updateData.email = parsed.data.email;
    }
    if (parsed.data.password) {
      updateData.password = await bcrypt.hash(parsed.data.password, 12);
    }
    if (parsed.data.departmentId !== undefined) {
      if (parsed.data.departmentId) {
        const dept = await Department.findOne({
          _id: parsed.data.departmentId,
          organizationId: session.user.organizationId,
        });
        if (!dept) {
          return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }
        updateData.departmentId = parsed.data.departmentId;
      } else {
        updateData.departmentId = null;
      }
    }
    if (parsed.data.role) updateData.role = parsed.data.role;

    const updated = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .select("-password")
      .populate("departmentId", "name")
      .lean();

    return NextResponse.json(updated);
  })(req);

// DELETE /api/users/[id] — admin soft-deletes user
export const DELETE = (req: Request, ctx: RouteContext) =>
  withAdmin(async (_innerReq: Request, session: AuthSession) => {
    const { id } = await ctx.params;
    await connectDB();

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: id,
        organizationId: session.user.organizationId,
        deletedAt: null,
      },
      { $set: { deletedAt: new Date() } },
      { new: true }
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted" });
  })(req);
