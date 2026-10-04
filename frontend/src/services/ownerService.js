import { api } from "./api";

/**
 * Owner Dashboard & Real-Time Management Service
 * Directly interacts with MySQL via Express REST API
 */

// 1. Dashboard KPIs & Summary
export const getDashboardSummary = async () => {
  const res = await api.get("/owner/dashboard/summary");
  return res.data?.data || res.data;
};

// 2. Stations Management
export const getOwnerStations = async () => {
  const res = await api.get("/owner/stations");
  return res.data?.data || res.data || [];
};

export const createOwnerStation = async (stationData) => {
  const res = await api.post("/owner/stations", stationData);
  return res.data;
};

export const updateOwnerStation = async (stationId, stationData) => {
  const res = await api.put(`/owner/stations/${stationId}`, stationData);
  return res.data;
};

export const deleteOwnerStation = async (stationId) => {
  const res = await api.delete(`/owner/stations/${stationId}`);
  return res.data;
};

export const getOwnerStationMap = async () => {
  const res = await api.get("/owner/stations/map");
  return res.data?.data || res.data || [];
};

// 3. Chargers & Simulator Management
export const getOwnerChargers = async (stationId = "") => {
  const url = stationId ? `/owner/chargers?stationId=${stationId}` : "/owner/chargers";
  const res = await api.get(url);
  return res.data?.data || res.data || [];
};

export const createOwnerCharger = async (chargerData) => {
  const res = await api.post("/owner/chargers", chargerData);
  return res.data;
};

export const updateOwnerCharger = async (chargerId, chargerData) => {
  const res = await api.put(`/owner/chargers/${chargerId}`, chargerData);
  return res.data;
};

export const setChargerSimulatorState = async (chargerId, simulatorData) => {
  const res = await api.post(`/owner/chargers/${chargerId}/simulator`, simulatorData);
  return res.data;
};

// 4. Bookings Management
export const getOwnerBookings = async (status = "", stationId = "") => {
  let url = "/owner/bookings?";
  if (status) url += `status=${encodeURIComponent(status)}&`;
  if (stationId) url += `stationId=${encodeURIComponent(stationId)}`;
  const res = await api.get(url);
  return res.data?.data || res.data || [];
};

export const updateBookingStatus = async (bookingId, status, notes = "") => {
  const res = await api.put(`/owner/bookings/${bookingId}/status`, { status, notes });
  return res.data;
};

// 5. Charging Sessions Management
export const getOwnerLiveSessions = async () => {
  const res = await api.get("/owner/sessions/live");
  return res.data?.data || res.data || [];
};

export const getOwnerSessionHistory = async (limit = 50) => {
  const res = await api.get(`/owner/sessions/history?limit=${limit}`);
  return res.data?.data || res.data || [];
};

export const startChargingSession = async (sessionData) => {
  const res = await api.post("/owner/sessions/start", sessionData);
  return res.data;
};

export const stopChargingSession = async (sessionId, data = {}) => {
  const res = await api.post(`/owner/sessions/stop/${sessionId}`, data);
  return res.data;
};

// 6. Customers Directory
export const getOwnerCustomers = async () => {
  const res = await api.get("/owner/customers");
  return res.data?.data || res.data || [];
};

// 7. Tariff Management
export const getOwnerTariffs = async () => {
  const res = await api.get("/owner/tariffs");
  return res.data?.data || res.data || [];
};

export const createOwnerTariff = async (tariffData) => {
  const res = await api.post("/owner/tariffs", tariffData);
  return res.data;
};

export const updateOwnerTariff = async (tariffId, tariffData) => {
  const res = await api.put(`/owner/tariffs/${tariffId}`, tariffData);
  return res.data;
};

// 8. Payments & Revenue
export const getOwnerTransactions = async () => {
  const res = await api.get("/owner/payments/transactions");
  return res.data?.data || res.data || [];
};

export const getOwnerRevenueSummary = async () => {
  const res = await api.get("/owner/payments/revenue-summary");
  return res.data?.data || res.data;
};

export const createPaymentOrder = async (orderData) => {
  const res = await api.post("/owner/payments/create-order", orderData);
  return res.data;
};

export const verifyPaymentTransaction = async (verificationData) => {
  const res = await api.post("/owner/payments/verify", verificationData);
  return res.data;
};

// 9. Maintenance & Faults
export const getOwnerMaintenanceTickets = async () => {
  const res = await api.get("/owner/maintenance/tickets");
  return res.data?.data || res.data || [];
};

export const createMaintenanceTicket = async (ticketData) => {
  const res = await api.post("/owner/maintenance/tickets", ticketData);
  return res.data;
};

export const updateMaintenanceTicket = async (ticketId, ticketData) => {
  const res = await api.put(`/owner/maintenance/tickets/${ticketId}`, ticketData);
  return res.data;
};

export const getOwnerFaults = async () => {
  const res = await api.get("/owner/faults");
  return res.data?.data || res.data || [];
};

export const resolveOwnerFault = async (faultId, notes = "") => {
  const res = await api.put(`/owner/faults/${faultId}/resolve`, { notes });
  return res.data;
};

// 10. Smart Load Management
export const getStationLoadProfile = async (stationId) => {
  const res = await api.get(`/owner/smart-load/${stationId}`);
  return res.data?.data || res.data;
};

export const updateSmartLoadCapacity = async (stationId, loadData) => {
  const res = await api.post(`/owner/smart-load/${stationId}`, loadData);
  return res.data;
};

// 11. Analytics
export const getOwnerAnalytics = async (type = "revenue") => {
  const res = await api.get(`/owner/analytics/${type}`);
  return res.data?.data || res.data;
};

// 12. Notifications & Audit Logs
export const getOwnerNotifications = async () => {
  const res = await api.get("/owner/notifications");
  return res.data?.data || res.data || [];
};

export const markNotificationAsRead = async (notificationId) => {
  const res = await api.put(`/owner/notifications/${notificationId}/read`);
  return res.data;
};

export const getOwnerAuditLogs = async () => {
  const res = await api.get("/owner/audit-logs");
  return res.data?.data || res.data || [];
};

// 13. AI Owner Assistant
export const queryOwnerAI = async (question) => {
  const res = await api.post("/owner/ai/query", { question });
  return res.data;
};

// 14. Settings
export const getOwnerSettings = async () => {
  const res = await api.get("/owner/settings");
  return res.data?.data || res.data;
};

export const updateOwnerSettings = async (settingsData) => {
  const res = await api.put("/owner/settings", settingsData);
  return res.data;
};

export default {
  getDashboardSummary,
  getOwnerStations,
  createOwnerStation,
  updateOwnerStation,
  deleteOwnerStation,
  getOwnerStationMap,
  getOwnerChargers,
  createOwnerCharger,
  updateOwnerCharger,
  setChargerSimulatorState,
  getOwnerBookings,
  updateBookingStatus,
  getOwnerLiveSessions,
  getOwnerSessionHistory,
  startChargingSession,
  stopChargingSession,
  getOwnerCustomers,
  getOwnerTariffs,
  createOwnerTariff,
  updateOwnerTariff,
  getOwnerTransactions,
  getOwnerRevenueSummary,
  createPaymentOrder,
  verifyPaymentTransaction,
  getOwnerMaintenanceTickets,
  createMaintenanceTicket,
  updateMaintenanceTicket,
  getOwnerFaults,
  resolveOwnerFault,
  getStationLoadProfile,
  updateSmartLoadCapacity,
  getOwnerAnalytics,
  getOwnerNotifications,
  markNotificationAsRead,
  getOwnerAuditLogs,
  queryOwnerAI,
  getOwnerSettings,
  updateOwnerSettings,
};
