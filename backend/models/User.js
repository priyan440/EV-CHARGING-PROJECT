import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    counterId: { type: String, required: true, unique: true }, // e.g. CUS0001
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["CUSTOMER", "STATION_OWNER", "ADMIN"], default: "CUSTOMER" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Suspended", "Pending"], default: "Active" },
    vehicles: [
      {
        number: String,
        brand: String,
        model: String,
        type: String,
        batteryCapacity: Number,
        batteryPercentage: Number,
        connectorType: String,
        isPrimary: Boolean,
      },
    ],
    chargingPreference: {
      type: { type: String, default: "DC Fast Charging" },
      connector: { type: String, default: "CCS" },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
