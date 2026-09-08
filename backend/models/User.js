import mongoose from "mongoose";

const vehicleSubSchema = new mongoose.Schema(
  {
    id: { type: String },
    number: { type: String, default: "" },
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    type: { type: String, default: "Electric SUV" },
    vehicleType: { type: String, default: "Electric SUV" },
    batteryCapacity: { type: Number, default: 40.5 },
    batteryPercentage: { type: Number, default: 65 },
    connectorType: { type: String, default: "CCS2" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    counterId: { type: String, required: true, unique: true }, // e.g. CUS0001
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: false, default: "" },
    password: { type: String, required: false },
    googleId: { type: String, default: null },
    profileImage: { type: String, default: null },
    authProvider: { type: String, default: "password" },
    role: { type: String, enum: ["CUSTOMER", "STATION_OWNER", "ADMIN"], default: "CUSTOMER" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Suspended", "Pending"], default: "Active" },
    vehicles: [vehicleSubSchema],
    chargingPreference: {
      type: { type: String, default: "DC Fast Charging" },
      connector: { type: String, default: "CCS" },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
