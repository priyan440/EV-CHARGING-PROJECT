import mongoose from "mongoose";

const technicianSchema = new mongoose.Schema(
  {
    techCounterId: { type: String, required: true, unique: true, index: true }, // TECH0001
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    specialization: { type: String, default: "DC Fast Charger Repair" },
    assignedTickets: [{ type: String }],
    status: { type: String, enum: ["ACTIVE", "ON_FIELD", "INACTIVE"], default: "ACTIVE" }
  },
  { timestamps: true }
);

export const Technician = mongoose.model("Technician", technicianSchema);
