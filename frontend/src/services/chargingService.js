import api from "./api";

/**
 * chargingService.js
 * Dedicated API service for Live Active Charging, Stop Charging flow, Charging History, and PDF Invoices.
 */

export const getActiveChargingSession = async () => {
  try {
    const res = await api.get("/charging/active");
    return res.data;
  } catch (error) {
    console.warn("getActiveChargingSession error:", error.message);
    return { success: false, active: false, session: null };
  }
};

export const startChargingSession = async (bookingId) => {
  try {
    const res = await api.post("/charging/start", { bookingId });
    return res.data;
  } catch (error) {
    throw new Error(error.message || "Failed to start charging session");
  }
};

export const updateLiveTelemetry = async (sessionId, data) => {
  try {
    const res = await api.put(`/charging/${sessionId}/telemetry`, data);
    return res.data;
  } catch (error) {
    console.warn("updateLiveTelemetry error:", error.message);
    return { success: false };
  }
};

export const stopChargingSession = async (sessionId, finalData = {}) => {
  try {
    const res = await api.post(`/charging/${sessionId}/stop`, finalData);
    return res.data;
  } catch (error) {
    throw new Error(error.message || "Failed to stop charging session");
  }
};

export const getChargingHistory = async () => {
  try {
    const res = await api.get("/charging/history");
    return res.data?.data || [];
  } catch (error) {
    console.warn("getChargingHistory error:", error.message);
    return [];
  }
};

export const getInvoice = async (identifier) => {
  try {
    const res = await api.get(`/charging/invoices/${identifier}`);
    return res.data?.data || null;
  } catch (error) {
    console.warn("getInvoice error:", error.message);
    return null;
  }
};

export default {
  getActiveChargingSession,
  startChargingSession,
  updateLiveTelemetry,
  stopChargingSession,
  getChargingHistory,
  getInvoice,
};
