import api from "./api";

export const bookingService = {
  // Create a new booking in MySQL
  createBooking: async (bookingData) => {
    try {
      const res = await api.post("/bookings", bookingData);
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.message || "Failed to create booking",
      };
    }
  },

  // Get bookings (filtered by user/station/admin on backend)
  getBookings: async (params = {}) => {
    try {
      const res = await api.get("/bookings", { params });
      return res.data;
    } catch (err) {
      console.warn("bookingService getBookings notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // Get single booking by ID (e.g. EV001)
  getBookingById: async (bookingId) => {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.message || `Booking ${bookingId} not found`,
      };
    }
  },

  // Get bookings for specific user
  getUserBookings: async (userId) => {
    try {
      const res = await api.get(`/bookings/user/${userId}`);
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Update booking status
  updateBooking: async (bookingId, status) => {
    try {
      const res = await api.put(`/bookings/${bookingId}`, { status });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.message || "Failed to update booking",
      };
    }
  },

  // Cancel booking (automatically releases slot in MySQL)
  cancelBooking: async (bookingId) => {
    try {
      const res = await api.put(`/bookings/${bookingId}`, { status: "CANCELLED" });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.message || "Failed to cancel booking",
      };
    }
  },

  // Check-in
  checkInBooking: async (bookingId) => {
    try {
      const res = await api.post("/bookings/check-in", { bookingId });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
};

export default bookingService;
