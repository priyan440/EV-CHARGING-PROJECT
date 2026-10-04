import api from "./api";

export const walletService = {
  // Fetch live wallet balance and transaction ledger from MySQL
  getWallet: async () => {
    try {
      const res = await api.get("/wallet");
      return res.data;
    } catch (err) {
      console.error("getWallet error:", err);
      return { success: false, data: { balance: 0, transactions: [] } };
    }
  },

  // Top up wallet balance via Razorpay or simulated credit in MySQL
  topUpWallet: async (amount, description = "Wallet Top-Up via Razorpay Test Mode") => {
    try {
      const res = await api.post("/wallet/topup", { amount, description });
      return res.data;
    } catch (err) {
      console.error("topUpWallet error:", err);
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Pay for booking via EV Customer Wallet (atomically decrements MySQL balance and inserts payment)
  payWithWallet: async (paymentData) => {
    try {
      const res = await api.post("/wallet/pay", paymentData);
      return res.data;
    } catch (err) {
      console.error("payWithWallet error:", err);
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Wallet payment deduction failed.",
      };
    }
  },
};

export default walletService;
