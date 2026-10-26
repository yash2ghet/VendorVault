import mongoose, { Schema, Document, Types } from "mongoose";
import { VendorStatus, VerificationStatus, ComplianceDocument } from "@/types";

export interface IVendor extends Document {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: VendorStatus;
  verificationStatus: VerificationStatus;
  complianceDocuments: ComplianceDocument[];
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceDocSchema = new Schema<ComplianceDocument>(
  {
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const VendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    companyName: { type: String, required: true },
    gstNumber: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: "India" },
    status: {
      type: String,
      enum: Object.values(VendorStatus),
      default: VendorStatus.ACTIVE,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
    complianceDocuments: [ComplianceDocSchema],
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Vendor =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);
