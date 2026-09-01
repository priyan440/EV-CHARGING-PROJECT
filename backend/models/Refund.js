import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    refundId: { type: String, required: true, unique: true, index: true }, // e.g. RFD000001
    paymentId: { type: String, required: true, index: true },
    bookingId: { type: String, required: true, index: true },
    counterId: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    refundPercentage: { type: Number, required: true },
    razorpayRefundId: { type: String },
    status: {
      type: String,
      enum: ["REQUESTED", "PROCESSING", "PROCESSED", "FAILED"],
      default: "REQUESTED"
    }
  },
  { timestamps: true }
);

export const Refund = mongoose.model("Refund", refundSchema);
