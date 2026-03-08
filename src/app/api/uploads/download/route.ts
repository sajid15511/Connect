import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { connectDB } from "@/lib/db";
import { Chat } from "@/models";
import { createPresignedDownloadUrl, parseObjectKey } from "@/lib/r2";

// GET /api/uploads/download?key=...&fileName=...
export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const fileName = searchParams.get("fileName");

  if (!key || !fileName) {
    return NextResponse.json({ error: "key and fileName are required" }, { status: 400 });
  }

  const { organizationId, chatId } = parseObjectKey(key);

  if (!organizationId || !chatId) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  if (organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const chat = await Chat.findOne({
    _id: chatId,
    organizationId: session.user.organizationId,
    participants: session.user.id,
  }).lean();

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const { url, expiresIn } = await createPresignedDownloadUrl({ key, fileName });

  return NextResponse.json({ url, expiresIn });
});
