import api from "./api";

export const paymentService = {
  // Create Razorpay test order
  createOrder: async (orderData) => {
    try {
      const res = await api.post("/payments/create-order", orderData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Verify payment and record in MySQL
  verifyPayment: async (paymentData) => {
    try {
      const res = await api.post("/payments/verify", paymentData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Get payments history
  getPayments: async (params = {}) => {
    try {
      const res = await api.get("/payments", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Request refund
  requestRefund: async (refundData) => {
    try {
      const res = await api.post("/payments/refund", refundData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
};

export default paymentService;
