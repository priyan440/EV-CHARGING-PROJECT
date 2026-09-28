import api from "./api";

export const stationService = {
  // Get all platform stations from MySQL
  getStations: async () => {
    try {
      const res = await api.get("/stations");
      return res.data;
    } catch (err) {
      console.warn("stationService getStations notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // Get single station by ID with slots
  getStationById: async (id) => {
    try {
      const res = await api.get(`/stations/${id}`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Get stations owned by logged-in station owner
  getMyStations: async () => {
    try {
      const res = await api.get("/stations/owner/my-stations");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Create new station
  createStation: async (stationData) => {
    try {
      const res = await api.post("/stations", stationData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Update station
  updateStation: async (id, stationData) => {
    try {
      const res = await api.put(`/stations/${id}`, stationData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Delete station
  deleteStation: async (id) => {
    try {
      const res = await api.delete(`/stations/${id}`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Get slots for station
  getSlotsByStation: async (stationId) => {
    try {
      const res = await api.get(`/slots/station/${stationId}`);
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Add slot
  createSlot: async (slotData) => {
    try {
      const res = await api.post("/slots", slotData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Update slot status
  updateSlotStatus: async (slotId, status) => {
    try {
      const res = await api.patch(`/slots/${slotId}/status`, { status });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Fetch Open Charge Map external stations
  fetchExternalStations: async (params = {}) => {
    try {
      const res = await api.get("/ev-stations", { params });
      return res.data?.data || [];
    } catch (err) {
      console.warn("fetchExternalStations notice:", err.message);
      return [];
    }
  },

  // Dynamic Pricing API methods
  getPriceQuote: async (stationId, params = {}) => {
    try {
      const res = await api.get(`/stations/${stationId}/price-quote`, { params });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  getPricingRules: async (stationId) => {
    try {
      const res = await api.get(`/stations/${stationId}/pricing-rules`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  updatePricingRules: async (stationId, rules) => {
    try {
      const res = await api.put(`/stations/${stationId}/pricing-rules`, rules);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },
};

export default stationService;
