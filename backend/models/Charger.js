import mongoose from "mongoose";

const chargerSchema = new mongoose.Schema(
  {
    chargerId: { type: String, required: true, unique: true }, // e.g. CHG0001
    stationId: { type: String, required: true }, // e.g. STA001
    name: { type: String, required: true },
    connectorType: { type: String, required: true }, // CCS2, Type 2, CHAdeMO
    powerKw: { type: Number, required: true }, // e.g. 60 kW, 150 kW, 22 kW
    chargingStandard: { type: String, default: "DC Fast" },
    pricePerKwh: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Reserved", "Maintenance", "Offline"],
      default: "Available",
    },
  },
  { timestamps: true }
);

export const Charger = mongoose.model("Charger", chargerSchema);
