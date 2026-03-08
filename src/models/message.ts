import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessageAttachment {
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  content?: string;
  attachments: IMessageAttachment[];
  createdAt: Date;
}

const MessageAttachmentSchema = new Schema<IMessageAttachment>(
  {
    key: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, default: "" },
    attachments: { type: [MessageAttachmentSchema], default: [] },
  },
  { timestamps: true }
);

MessageSchema.index({ chatId: 1, createdAt: -1 });

export const Message =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
