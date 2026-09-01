import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true }, // MT000001
    stationId: { type: String, required: true },
    chargerId: { type: String, required: true },
    ownerCounterId: { type: String, required: true },
    problem: { type: String, required: true },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    status: { type: String, enum: ["Open", "Assigned", "In Progress", "Resolved"], default: "Open" },
    assignedTechnician: { type: String, default: "Unassigned" },
    description: String,
  },
  { timestamps: true }
);

export const Maintenance = mongoose.model("Maintenance", maintenanceSchema);
