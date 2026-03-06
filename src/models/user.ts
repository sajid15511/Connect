import mongoose, { Schema, Document, Types } from "mongoose";

export type UserRole = "tenant_admin" | "admin" | "employee";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  organizationId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  role: UserRole;
  deletedAt?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    role: { type: String, enum: ["tenant_admin", "admin", "employee"], default: "employee" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1, organizationId: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { role: "tenant_admin" } });

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
