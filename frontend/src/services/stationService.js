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

  // Get only approved stations for public views & booking
  getApprovedStations: async () => {
    try {
      const res = await api.get("/stations/approved");
      return res.data;
    } catch (err) {
      console.warn("stationService getApprovedStations notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // Get lightweight markers for Live EV Map
  getMapStations: async () => {
    try {
      const res = await api.get("/stations/map");
      return res.data;
    } catch (err) {
      console.warn("stationService getMapStations notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // Get EV networks
  getNetworks: async () => {
    try {
      const res = await api.get("/networks");
      return res.data;
    } catch (err) {
      console.warn("stationService getNetworks notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // Register EV network
  createNetwork: async (networkData) => {
    try {
      const res = await api.post("/networks", networkData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Get single station by ID with connectors and power stats
  getStationById: async (id) => {
    try {
      const res = await api.get(`/stations/${id}`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Get connectors for a station
  getStationConnectors: async (stationId) => {
    try {
      const res = await api.get(`/stations/${stationId}/connectors`);
      return res.data;
    } catch (err) {
      console.warn("stationService getStationConnectors notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // Get live power status for Station Owner Power Management
  getStationPowerStatus: async (stationId) => {
    try {
      const res = await api.get(`/stations/${stationId}/power-status`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Update Station Power Capacity limits
  updateStationPower: async (stationId, powerData) => {
    try {
      const res = await api.put(`/stations/${stationId}/power`, powerData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
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

  // Create new station (Station Owner registration)
  createStation: async (stationData) => {
    try {
      const res = await api.post("/stations", stationData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Update station
  updateStation: async (id, stationData) => {
    try {
      const res = await api.put(`/stations/${id}`, stationData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Delete station
  deleteStation: async (id) => {
    try {
      const res = await api.delete(`/stations/${id}`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Get slots/bays for station
  getSlotsByStation: async (stationId) => {
    try {
      const res = await api.get(`/slots/station/${stationId}`);
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Add slot/bay
  createSlot: async (slotData) => {
    try {
      const res = await api.post("/slots", slotData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // Update slot status
  updateSlotStatus: async (slotId, status) => {
    try {
      const res = await api.patch(`/slots/${slotId}/status`, { status });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
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
