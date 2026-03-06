import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  organizationId: Types.ObjectId;
  createdAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ name: 1, organizationId: 1 }, { unique: true });

export const Department =
  mongoose.models.Department ||
  mongoose.model<IDepartment>("Department", DepartmentSchema);
