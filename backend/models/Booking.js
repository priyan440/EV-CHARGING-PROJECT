import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true }, // e.g. BK000001
    invoiceId: { type: String }, // e.g. INV000001
    counterId: { type: String, required: true, index: true }, // Customer CUS0001
    customerName: { type: String, required: true },
    stationId: { type: String, required: true, index: true }, // STA001
    stationName: { type: String, required: true },
    chargerId: { type: String, required: true, index: true }, // CHG0001
    connectorType: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    vehicleModel: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: String, required: true },
    currentBattery: { type: Number, required: true },
    targetBattery: { type: Number, required: true },
    estimatedKwh: { type: Number, required: true },
    chargingCost: { type: Number, required: true },
    serviceFee: { type: Number, default: 20 },
    tax: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    totalAmount: { type: Number, required: true },
    
    // Hold Reservation & Check-in Token
    reservationExpiresAt: { type: Date },
    qrToken: { type: String },
    checkedInAt: { type: Date },

    // Production Booking Statuses
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PAYMENT_PENDING",
        "CONFIRMED",
        "ARRIVED",
        "CHECKED_IN",
        "CHARGING",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
        "NO_SHOW"
      ],
      default: "PAYMENT_PENDING"
    },
    paymentStatus: {
      type: String,
      enum: ["INITIATED", "PENDING", "CAPTURED", "FAILED", "REFUNDED", "EXPIRED"],
      default: "PENDING"
    },
    paymentMethod: { type: String, default: "Razorpay" }
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
