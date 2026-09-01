import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    disputeId: { type: String, required: true, unique: true, index: true }, // DISPUTE000001
    paymentId: { type: String, required: true, index: true },
    bookingId: { type: String, required: true },
    counterId: { type: String, required: true },
    reason: { type: String, required: true },
    evidence: { type: String },
    status: {
      type: String,
      enum: ["OPEN", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESOLVED"],
      default: "OPEN"
    },
    adminNotes: { type: String }
  },
  { timestamps: true }
);

export const Dispute = mongoose.model("Dispute", disputeSchema);
