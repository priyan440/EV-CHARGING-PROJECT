import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    description: { type: String },
    discountType: { type: String, enum: ["FLAT", "PERCENTAGE"], default: "FLAT" },
    discountValue: { type: Number, required: true },
    minBookingAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Coupon = mongoose.model("Coupon", couponSchema);
