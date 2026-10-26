import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "@/types";

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  phone?: string;
  role: UserRole;
  vendorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
    phone: { type: String },
    // for SUPPLIER users: the Vendor record this login belongs to
    vendorId: { type: String },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STAFF,
    },
  },
  {
    timestamps: true,
    // Better Auth stores users in the "user" collection. Without this, Mongoose reads a separate,
    // empty "users" collection (the admin Users page showed nobody).
    collection: "user",
  }
);

// In development Next.js hot-reloads this file, but Mongoose keeps the OLD compiled model in memory, so
// changing the schema/collection does nothing until a full restart (the admin Users page kept listing the
// stale `users` collection). If the cached model points at the wrong collection, drop it and rebuild.
if (mongoose.models.User && mongoose.models.User.collection.collectionName !== "user") {
  mongoose.deleteModel("User");
}

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
