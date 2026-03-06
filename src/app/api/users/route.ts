import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, Department } from "@/models";
import { createEmployeeSchema } from "@/lib/validations";
import { withAdmin, withAuth } from "@/lib/api-helpers";

// GET /api/users — list active users in same org
export const GET = withAuth(async (_req, session) => {
  await connectDB();
  const users = await User.find({
    organizationId: session.user.organizationId,
    deletedAt: null,
  })
    .select("-password")
    .populate("departmentId", "name")
    .lean();

  return NextResponse.json(users);
});

// POST /api/users — admin creates employee
export const POST = withAdmin(async (req, session) => {
  const body = await req.json();
  const parsed = createEmployeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const { name, email, password, departmentId, role } = parsed.data;

  // Verify department belongs to org
  if (departmentId) {
    const dept = await Department.findOne({
      _id: departmentId,
      organizationId: session.user.organizationId,
    });
    if (!dept) {
      return NextResponse.json({ error: "Department not found in your organization" }, { status: 404 });
    }
  }

  const exists = await User.findOne({
    email,
    organizationId: session.user.organizationId,
    deletedAt: null,
  });
  if (exists) {
    return NextResponse.json({ error: "User already exists in this organization" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    organizationId: session.user.organizationId,
    departmentId: departmentId || undefined,
    role,
  });

  return NextResponse.json(
    { _id: user._id, name: user.name, email: user.email, role: user.role },
    { status: 201 }
  );
});
