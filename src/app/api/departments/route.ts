import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Department } from "@/models";
import { createDepartmentSchema } from "@/lib/validations";
import { withAdmin, withAuth } from "@/lib/api-helpers";

// GET /api/departments — list departments
export const GET = withAuth(async (_req, session) => {
  await connectDB();
  const departments = await Department.find({
    organizationId: session.user.organizationId,
  }).lean();

  return NextResponse.json(departments);
});

// POST /api/departments — admin creates department
export const POST = withAdmin(async (req, session) => {
  const body = await req.json();
  const parsed = createDepartmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const existing = await Department.findOne({
    name: parsed.data.name,
    organizationId: session.user.organizationId,
  });

  if (existing) {
    return NextResponse.json({ error: "Department already exists" }, { status: 409 });
  }

  const department = await Department.create({
    name: parsed.data.name,
    organizationId: session.user.organizationId,
  });

  return NextResponse.json(department, { status: 201 });
});
