import mongoose, { Schema, Document, Types } from "mongoose";

export type ChatType = "direct" | "group";

export interface IChat extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  participants: Types.ObjectId[];
  type: ChatType;
  name?: string;
  createdAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    type: { type: String, enum: ["direct", "group"], default: "direct" },
    name: { type: String, trim: true },
  },
  { timestamps: true }
);

ChatSchema.index({ participants: 1, organizationId: 1 });

export const Chat =
  mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);
