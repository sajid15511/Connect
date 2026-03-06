import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Organization, User } from "@/models";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    await connectDB();

    const { name, email, password, organizationName } = parsed.data;

    // Check if org already exists
    const existingOrg = await Organization.findOne({ name: organizationName });
    if (existingOrg) {
      return NextResponse.json({ error: "Organization name already taken" }, { status: 409 });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create org
    const org = await Organization.create({ name: organizationName });

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      organizationId: org._id,
      role: "admin",
    });

    return NextResponse.json(
      {
        user: { id: user._id, name: user.name, email: user.email, organizationId: org._id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
