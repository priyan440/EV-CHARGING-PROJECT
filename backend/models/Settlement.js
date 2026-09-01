import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    settlementId: { type: String, required: true, unique: true, index: true }, // SET000001
    ownerCounterId: { type: String, required: true, index: true },
    grossRevenue: { type: Number, required: true },
    platformCommission: { type: Number, required: true },
    taxesDeducted: { type: Number, required: true },
    refundsDeducted: { type: Number, required: true },
    netPayout: { type: Number, required: true },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PAID", "FAILED"],
      default: "PENDING"
    },
    isSimulation: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Settlement = mongoose.model("Settlement", settlementSchema);
