import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true, unique: true }, // CMP000001
    counterId: { type: String, required: true },
    customerName: { type: String, required: true },
    category: { type: String, enum: ["Charger Problem", "Payment Issue", "Booking Issue", "Station Issue", "Other"], required: true },
    stationId: String,
    stationName: String,
    description: { type: String, required: true },
    status: { type: String, enum: ["Open", "In Review", "Resolved"], default: "Open" },
    resolutionNotes: String,
  },
  { timestamps: true }
);

export const Complaint = mongoose.model("Complaint", complaintSchema);
