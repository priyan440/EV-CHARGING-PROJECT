import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    status: { type: String, enum: ["RECEIVED", "PROCESSED", "IGNORED", "FAILED"], default: "RECEIVED" },
    payload: { type: Object }
  },
  { timestamps: true }
);

export const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);
