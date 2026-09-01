import mongoose from "mongoose";

const chargingSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true }, // e.g. SES000001
    bookingId: { type: String, required: true }, // e.g. BK000001
    counterId: { type: String, required: true }, // CUS0001
    stationId: { type: String, required: true }, // STA001
    chargerId: { type: String, required: true }, // CHG0001
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    batteryStart: Number,
    batteryCurrent: Number,
    batteryTarget: Number,
    energyConsumedKwh: { type: Number, default: 0 },
    currentPowerKw: { type: Number, default: 45 },
    currentCost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Charging", "Paused", "Completed", "Terminated"],
      default: "Charging",
    },
  },
  { timestamps: true }
);

export const ChargingSession = mongoose.model("ChargingSession", chargingSessionSchema);
