import mongoose from "mongoose";

const stationOwnerSchema = new mongoose.Schema(
  {
    counterId: { type: String, required: true, unique: true }, // e.g. OWNER0001
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ownerName: { type: String, required: true },
    businessName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    businessAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    gstNumber: { type: String, default: "" },
    businessRegNumber: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending Approval", "Approved", "Rejected", "Suspended"],
      default: "Pending Approval",
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
  },
  { timestamps: true }
);

export const StationOwner = mongoose.model("StationOwner", stationOwnerSchema);
