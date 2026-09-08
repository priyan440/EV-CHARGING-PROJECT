import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true, index: true }, // e.g. PAY000001
    bookingId: { type: String, required: true, index: true }, // BK000001
    counterId: { type: String, required: true, index: true }, // Customer CUS0001
    invoiceId: { type: String, required: true }, // e.g. INV000001
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    platformFee: { type: Number, default: 20 },
    ownerAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: "UPI" }, // UPI, Card, NetBanking, Wallet
    transactionId: { type: String },
    
    // Razorpay Integration Metadata
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    paymentAttemptNumber: { type: Number, default: 1 },

    // Granular Payment States
    status: {
      type: String,
      enum: [
        "INITIATED",
        "PENDING",
        "AUTHORIZED",
        "CAPTURED",
        "SUCCESS",
        "Success",
        "FAILED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
        "CANCELLED",
        "DISPUTED"
      ],
      default: "CAPTURED"
    },
    
    failureReason: { type: String },
    metadata: { type: Object }
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
