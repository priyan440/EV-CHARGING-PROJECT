import mongoose from "mongoose";

const queueSchema = new mongoose.Schema(
  {
    queueId: { type: String, required: true, unique: true, index: true }, // QUEUE000001
    stationId: { type: String, required: true, index: true },
    counterId: { type: String, required: true },
    customerName: { type: String, required: true },
    connectorType: { type: String, required: true },
    position: { type: Number, required: true },
    estimatedWaitMins: { type: Number, default: 15 },
    status: {
      type: String,
      enum: ["WAITING", "NOTIFIED", "ASSIGNED", "EXPIRED", "CANCELLED"],
      default: "WAITING"
    }
  },
  { timestamps: true }
);

export const Queue = mongoose.model("Queue", queueSchema);
