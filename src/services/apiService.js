import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercept request to attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("ev_current_user") || "null");
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const apiService = {
  // Health
  checkHealth: async () => {
    try {
      const res = await api.get("/health");
      return res.data;
    } catch {
      return {
        status: "TEST_MODE_STANDALONE",
        message: "Operating in Standalone Test Mode Engine",
        services: {
          backendApi: "STANDALONE_MODE",
          database: "LOCAL_STORAGE",
          razorpayGateway: "TEST_MODE_ACTIVE",
          notificationProvider: "SIMULATED",
          webSocketServer: "STANDBY",
        },
      };
    }
  },

  // Auth
  login: async (credentials) => {
    try {
      const res = await api.post("/auth/login", credentials);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Backend offline" };
    }
  },

  registerCustomer: async (data) => {
    try {
      const res = await api.post("/auth/register-customer", data);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Backend offline" };
    }
  },

  registerOwner: async (data) => {
    try {
      const res = await api.post("/auth/register-owner", data);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Backend offline" };
    }
  },

  // Stations
  getStations: async () => {
    try {
      const res = await api.get("/stations");
      return res.data;
    } catch {
      return null;
    }
  },

  // External India EV Charging Stations (Open Charge Map API Sourced)
  fetchExternalEvStations: async (params = {}) => {
    try {
      const res = await api.get("/ev-stations", { params });
      if (res.data && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn("Backend /ev-stations offline, fetching direct Open Charge Map API:", err.message);
    }

    // Direct fallback to Open Charge Map API if backend express server is not responding
    try {
      const apiKey = "0a82895f-4c3b-4d9b-a73e-d273cc0aea38";
      const ocmRes = await axios.get("https://api.openchargemap.io/v3/poi/", {
        params: {
          output: "json",
          countrycode: "IN",
          maxresults: params.maxresults || 150,
          compact: true,
          verbose: false,
          ...params,
        },
        timeout: 8000,
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (Array.isArray(ocmRes.data)) {
        return ocmRes.data.map((poi) => {
          const addr = poi.AddressInfo || {};
          const operator = poi.OperatorInfo?.Title || "Independent EV Network";
          const connections = poi.Connections || [];

          const connectors = connections.map((conn, idx) => ({
            id: `EXT_CHG_${poi.ID}_${idx}`,
            type: conn.ConnectionType?.Title || "CCS2",
            powerKw: conn.PowerKW || (conn.LevelID === 3 ? 60 : 22),
            status: poi.StatusType?.IsOperational ? "Available" : "Unknown",
            pricePerKwh: 18,
          }));

          let isFast = connectors.some((c) => c.powerKw >= 30 || c.type.includes("CCS"));

          return {
            id: `OCM_${poi.ID}`,
            name: addr.Title || `EV Station ${poi.ID}`,
            operator,
            address: addr.AddressLine1 || addr.Title || "India EV Hub",
            city: addr.Town || addr.StateOrProvince || "India",
            state: addr.StateOrProvince || "Tamil Nadu",
            pincode: addr.Postcode || "",
            latitude: addr.Latitude,
            longitude: addr.Longitude,
            status: poi.StatusType?.IsOperational !== false ? "Operational" : "Non-operational",
            isExternal: true,
            chargers: connectors.length > 0 ? connectors : [{ id: `EXT_${poi.ID}`, type: "CCS2", powerKw: 60, status: "Available", pricePerKwh: 18 }],
            isFast,
            accessType: poi.UsageType?.Title || "Public",
            rating: 4.8,
            amenities: ["WiFi", "Parking", "Restroom"],
            attribution: "Powered by Open Charge Map & OpenStreetMap",
          };
        }).filter((s) => s.latitude && s.longitude);
      }
    } catch (fallbackErr) {
      console.error("Open Charge Map direct fetch error:", fallbackErr);
    }

    return [];
  },

  // Bookings
  createBooking: async (bookingData) => {
    try {
      const res = await api.post("/bookings", bookingData);
      return res.data;
    } catch {
      return null;
    }
  },

  checkInBooking: async (data) => {
    try {
      const res = await api.post("/bookings/check-in", data);
      return res.data;
    } catch {
      return null;
    }
  },

  // Razorpay Payments
  createRazorpayOrder: async (paymentData) => {
    try {
      const res = await api.post("/payments/create-order", paymentData);
      return res.data;
    } catch {
      return null;
    }
  },

  verifyRazorpayPayment: async (verificationData) => {
    try {
      const res = await api.post("/payments/verify", verificationData);
      return res.data;
    } catch {
      return null;
    }
  },

  requestRefund: async (refundData) => {
    try {
      const res = await api.post("/payments/refund", refundData);
      return res.data;
    } catch {
      return null;
    }
  },
};
