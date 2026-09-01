import mongoose from "mongoose";

const stationSchema = new mongoose.Schema(
  {
    stationId: { type: String, required: true, unique: true }, // e.g. STA001
    ownerCounterId: { type: String, required: true }, // e.g. OWNER0001
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    contactNumber: { type: String, default: "" },
    openingHours: { type: String, default: "24/7 Open" },
    status: {
      type: String,
      enum: ["Pending Approval", "Approved", "Rejected", "Suspended", "Offline"],
      default: "Approved",
    },
    amenities: [String],
    image: String,
    rating: { type: Number, default: 4.8 },
  },
  { timestamps: true }
);

export const Station = mongoose.model("Station", stationSchema);
