import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { connectDB } from "@/lib/db";
import { createUploadUrlSchema } from "@/lib/validations";
import { Chat } from "@/models";
import { buildR2ObjectKey, createPresignedUploadUrl } from "@/lib/r2";

// POST /api/uploads/presign
export const POST = withAuth(async (req, session) => {
  const body = await req.json();
  const parsed = createUploadUrlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const { chatId, fileName, contentType, size } = parsed.data;

  const chat = await Chat.findOne({
    _id: chatId,
    organizationId: session.user.organizationId,
    participants: session.user.id,
  }).lean();

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const key = buildR2ObjectKey({
    organizationId: session.user.organizationId,
    chatId,
    fileName,
  });

  const { uploadUrl, expiresIn } = await createPresignedUploadUrl({
    key,
    contentType,
  });

  return NextResponse.json({
    uploadUrl,
    expiresIn,
    attachment: {
      key,
      fileName,
      mimeType: contentType,
      size,
    },
  });
});
