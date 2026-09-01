import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: String, required: true }, // e.g. Admin, CUS0001, OWNER0001
    role: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "STATION_APPROVED", "USER_LOGIN", "BOOKING_CREATED"
    description: { type: String, required: true },
    ipAddress: { type: String, default: "127.0.0.1" },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
