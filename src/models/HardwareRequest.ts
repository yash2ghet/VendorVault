import mongoose, { Schema, models, model } from "mongoose";

const HardwareRequestSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    assetType: {
      type: String,
      required: true,
    },
    modelPreference: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED_BY_MANAGER",
        "PROCURED_BY_ADMIN",
        "REJECTED",
      ],
      default: "PENDING",
    },
    managerFeedback: {
      type: String,
      default: "",
    },
    editCount: { type: Number, default: 0 },
    lastEditedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default models.HardwareRequest ||
  model("HardwareRequest", HardwareRequestSchema);