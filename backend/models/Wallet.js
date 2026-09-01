import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
  txnId: { type: String, required: true },
  type: { type: String, enum: ["CREDIT", "DEBIT", "REFUND", "BONUS"], required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  date: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema(
  {
    counterId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 850 },
    transactions: [walletTransactionSchema]
  },
  { timestamps: true }
);

export const Wallet = mongoose.model("Wallet", walletSchema);
