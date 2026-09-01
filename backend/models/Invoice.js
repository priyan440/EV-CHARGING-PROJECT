import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, required: true, unique: true, index: true }, // INV000001
    bookingId: { type: String, required: true, index: true },
    paymentId: { type: String },
    counterId: { type: String, required: true },
    customerName: { type: String, required: true },
    stationId: { type: String, required: true },
    stationName: { type: String, required: true },
    chargerId: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    energyConsumedKwh: { type: Number, required: true },
    chargingRate: { type: Number, required: true },
    chargingCost: { type: Number, required: true },
    serviceFee: { type: Number, default: 20 },
    parkingFee: { type: Number, default: 0 },
    taxAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentStatus: { type: String, default: "Paid" }
  },
  { timestamps: true }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);
