import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  deletedAt?: Date;
  createdAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Organization =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
