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
        message: err.response?.data?.message || err.message || "Failed to create booking",
      };
    }
  },

  // Create an offline/walk-in booking directly from Owner Dashboard
  createOfflineBooking: async (bookingData) => {
    try {
      const res = await api.post("/bookings/offline", bookingData);
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to create offline booking",
      };
    }
  },

  // Get real-time dashboard statistics from MySQL
  getDashboardStats: async () => {
    try {
      const res = await api.get("/bookings/stats/owner");
      return res.data;
    } catch (err) {
      console.warn("bookingService getDashboardStats notice:", err.message);
      return {
        success: false,
        stats: {
          totalBookings: 0,
          todayBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          inProgressBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          noShowBookings: 0,
          upcomingBookings: 0,
          todayRevenue: 0,
          totalRevenue: 0,
        },
      };
    }
  },

  // Get bookings (filtered by authenticated user/station owner/admin on backend)
  getBookings: async (params = {}) => {
    try {
      const res = await api.get("/bookings", { params });
      return res.data;
    } catch (err) {
      console.warn("bookingService getBookings notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // Get current user's personal bookings
  getMyBookings: async (params = {}) => {
    try {
      const res = await api.get("/bookings/my", { params });
      return res.data;
    } catch (err) {
      console.warn("bookingService getMyBookings notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // Get single booking by ID (e.g. EV00125)
  getBookingById: async (bookingId) => {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || `Booking ${bookingId} not found`,
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

  // Update booking status (PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
  updateBooking: async (bookingId, status) => {
    try {
      const res = await api.put(`/bookings/${bookingId}`, { status });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to update booking status",
      };
    }
  },

  // Alias for status update
  updateBookingStatus: async (bookingId, status) => {
    return bookingService.updateBooking(bookingId, status);
  },

  // Cancel booking (automatically releases slot & capacity in MySQL)
  cancelBooking: async (bookingId) => {
    try {
      const res = await api.put(`/bookings/${bookingId}/cancel`, { status: "CANCELLED" });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to cancel booking",
      };
    }
  },

  // Check-in
  checkInBooking: async (bookingId) => {
    try {
      const res = await api.post("/bookings/check-in", { bookingId });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },
};

export default bookingService;
