import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, required: true, unique: true },
    targetRole: { type: String, enum: ["CUSTOMER", "STATION_OWNER", "ADMIN", "ALL"], default: "ALL" },
    counterId: { type: String }, // specific user if set
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "Booking Confirmed",
        "Booking Cancelled",
        "Charging Started",
        "Charging Completed",
        "Payment Successful",
        "Station Status",
        "Owner Approval",
        "System Alert",
      ],
      default: "System Alert",
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
