import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message, Chat } from "@/models";
import { sendMessageSchema } from "@/lib/validations";
import { withAuth } from "@/lib/api-helpers";

// GET /api/messages?chatId=xxx
export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  }

  await connectDB();

  // Verify user is participant and chat belongs to org
  const chat = await Chat.findOne({
    _id: chatId,
    organizationId: session.user.organizationId,
    participants: session.user.id,
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const messages = await Message.find({ chatId })
    .populate("senderId", "name email")
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  return NextResponse.json(messages);
});

// POST /api/messages — send message (REST fallback, primary path is Socket.IO)
export const POST = withAuth(async (req, session) => {
  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const { chatId, content } = parsed.data;

  const chat = await Chat.findOne({
    _id: chatId,
    organizationId: session.user.organizationId,
    participants: session.user.id,
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const message = await Message.create({
    chatId,
    senderId: session.user.id,
    content,
  });

  const populated = await message.populate("senderId", "name email");
  return NextResponse.json(populated, { status: 201 });
});
