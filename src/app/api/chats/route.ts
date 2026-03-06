import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Chat, User } from "@/models";
import { createChatSchema } from "@/lib/validations";
import { withAuth } from "@/lib/api-helpers";

// GET /api/chats — list user's chats
export const GET = withAuth(async (_req, session) => {
  await connectDB();
  const chats = await Chat.find({
    organizationId: session.user.organizationId,
    participants: session.user.id,
  })
    .populate("participants", "name email")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json(chats);
});

// POST /api/chats — create or get chat
export const POST = withAuth(async (req, session) => {
  const body = await req.json();
  const parsed = createChatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const { participantIds, type, name } = parsed.data;
  const allParticipants = [...new Set([session.user.id, ...participantIds])];

  // Verify all participants belong to same org
  const validUsers = await User.find({
    _id: { $in: allParticipants },
    organizationId: session.user.organizationId,
  }).countDocuments();

  if (validUsers !== allParticipants.length) {
    return NextResponse.json({ error: "Invalid participants" }, { status: 400 });
  }

  // For direct chats, check if one already exists between these two users
  if (type === "direct" && allParticipants.length === 2) {
    const existing = await Chat.findOne({
      organizationId: session.user.organizationId,
      type: "direct",
      participants: { $all: allParticipants, $size: 2 },
    }).populate("participants", "name email");

    if (existing) {
      return NextResponse.json(existing);
    }
  }

  const chat = await Chat.create({
    organizationId: session.user.organizationId,
    participants: allParticipants,
    type,
    name: type === "group" ? name : undefined,
  });

  const populated = await chat.populate("participants", "name email");
  return NextResponse.json(populated, { status: 201 });
});
