import api from "./api";

export const bookingService = {
  // Query Real-Time Vehicle-Specific Compatible and Available Connectors
  getAvailableConnectors: async (params) => {
    try {
      const res = await api.get("/available-connectors", { params });
      return res.data;
    } catch (err) {
      console.error("bookingService getAvailableConnectors error:", err.message);
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to retrieve available connectors",
        connectors: [],
        availableConnectors: [],
      };
    }
  },

  // Check slot availability and double-booking conflict
  checkAvailability: async (payload) => {
    try {
      const res = await api.post("/bookings/check-availability", payload);
      return res.data;
    } catch (err) {
      return {
        success: false,
        isAvailable: false,
        available: false,
        statusCode: err.response?.status || 500,
        message: err.response?.data?.message || err.message || "Failed to check slot availability",
      };
    }
  },

  // Get existing bookings for a slot & date to disable conflicting times
  getSlotBookings: async (params) => {
    try {
      const res = await api.get("/bookings/slot-bookings", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Create a new booking in MySQL with atomic transaction
  createBooking: async (bookingData) => {
    try {
      const res = await api.post("/bookings", bookingData);
      return res.data;
    } catch (err) {
      return {
        success: false,
        statusCode: err.response?.status || 500,
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
      console.error("bookingService getBookings error:", err.message);
      throw new Error(err.response?.data?.message || err.message || "Failed to fetch bookings");
    }
  },

  // Get current user's personal bookings
  getMyBookings: async (params = {}) => {
    try {
      const res = await api.get("/bookings/my-bookings", { params });
      return res.data;
    } catch (err) {
      console.error("bookingService getMyBookings error:", err.message);
      throw new Error(err.response?.data?.message || err.message || "Failed to fetch customer bookings");
    }
  },

  // Get single booking by ID
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
      const res = await api.put(`/bookings/${bookingId}`, { status, booking_status: status });
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
      const res = await api.put(`/bookings/${bookingId}/cancel`, { status: "CANCELLED", booking_status: "CANCELLED" });
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
      const res = await api.post("/bookings/check-in", { bookingId, status: "IN_PROGRESS" });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Calculate realistic SOC-based charging energy and cost estimate from backend
  estimateChargingCost: async (estimateParams) => {
    try {
      const res = await api.post("/charging/estimate", estimateParams);
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to calculate charging estimate",
      };
    }
  },

  // Full 24-hour dynamic charging timeline for selected charger & date
  getChargerTimeline: async (params) => {
    try {
      const res = await api.get("/slots/timeline", { params });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to fetch charging timeline",
      };
    }
  },

  // Earliest available valid interval for user's estimated duration
  getEarliestSlot: async (params) => {
    try {
      const res = await api.get("/slots/earliest", { params });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to calculate earliest available slot",
      };
    }
  },
};

export default bookingService;
