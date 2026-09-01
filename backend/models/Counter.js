import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "CUS", "OWNER", "STA", "CHG", "BK", "SES", "PAY", "INV", "MT", "CMP"
  seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model("Counter", counterSchema);
