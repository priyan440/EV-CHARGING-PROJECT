import express from "express";
import {
  getOwnerDashboardSummary,
  getOwnerStations,
  createOwnerStation,
  updateOwnerStation,
  deleteOwnerStation,
  getOwnerStationMap,
  getOwnerChargers,
  createOwnerCharger,
  updateOwnerCharger,
  deleteOwnerCharger,
  setChargerSimulatorControl,
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
  deleteOwnerTariff,
  getOwnerTransactions,
  getOwnerRevenueSummary,
  createPaymentOrder,
  verifyPaymentTransaction,
  getOwnerMaintenanceTickets,
  createMaintenanceTicket,
  updateMaintenanceTicket,
  getOwnerFaults,
  resolveOwnerFault,
  getOwnerTechnicians,
  getStationLoadProfile,
  updateSmartLoadCapacity,
  getOwnerAnalytics,
  getOwnerNotifications,
  markNotificationRead,
  getOwnerAuditLogs,
  queryOwnerAI,
  getOwnerSettings,
  updateOwnerSettings,
  getOwnerControlCenterSnapshot,
  updateChargerHeartbeat,
  setChargerSimulateStatus,
} from "../controllers/ownerController.js";
import {
  getStationPhotos,
  uploadStationPhotos,
  setPrimaryPhoto,
  deleteStationPhoto,
} from "../controllers/stationPhotoController.js";
import {
  getStationEnergyConfig,
  updateStationEnergyConfig,
  getStationEnergyDashboard,
  smartAllocatePower,
  recordEnergyTelemetry,
  getStationEnergyHistory,
  getEnergyCostReports,
} from "../controllers/energyController.js";
import {
  getOwnerProfitabilitySummary,
  getOwnerProfitabilityStations,
  getOwnerProfitabilityTrends,
  getOwnerExpenses,
  createOwnerExpense,
  updateOwnerExpense,
  deleteOwnerExpense,
} from "../controllers/profitabilityController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Apply auth middleware and owner authorization to all /api/owner routes
router.use(authenticate);
router.use(authorizeRoles("OWNER", "STATION_OWNER", "ADMIN"));

// 1. Dashboard KPIs & Live Status
router.get("/dashboard", getOwnerDashboardSummary);
router.get("/dashboard/summary", getOwnerDashboardSummary);

// 1b. Station Control Center Live Snapshot
router.get("/control-center", getOwnerControlCenterSnapshot);
router.get("/stations/:stationId/control-center", getOwnerControlCenterSnapshot);

// 2. Stations Management
router.get("/stations", getOwnerStations);
router.post("/stations", createOwnerStation);
router.get("/stations/map", getOwnerStationMap);
router.put("/stations/:stationId", updateOwnerStation);
router.delete("/stations/:stationId", deleteOwnerStation);

// 2b. Station Photos Management
router.get("/stations/:stationId/photos", getStationPhotos);
router.post("/stations/:stationId/photos", uploadStationPhotos);
router.put("/stations/:stationId/photos/:photoId/primary", setPrimaryPhoto);
router.delete("/stations/:stationId/photos/:photoId", deleteStationPhoto);

// 3. Chargers & Simulator
router.get("/chargers", getOwnerChargers);
router.post("/chargers", createOwnerCharger);
router.put("/chargers/:chargerId", updateOwnerCharger);
router.delete("/chargers/:chargerId", deleteOwnerCharger);
router.post("/chargers/:chargerId/simulator", setChargerSimulatorControl);
router.post("/chargers/:chargerId/simulate-status", setChargerSimulateStatus);
router.post("/chargers/heartbeat", updateChargerHeartbeat);

// 4. Bookings Management
router.get("/bookings", getOwnerBookings);
router.put("/bookings/:bookingId/status", updateBookingStatus);
router.put("/bookings/:bookingId", updateBookingStatus);
router.patch("/bookings/:bookingId", updateBookingStatus);

// 5. Charging Sessions
router.get("/sessions/live", getOwnerLiveSessions);
router.get("/sessions/history", getOwnerSessionHistory);
router.post("/sessions/start", startChargingSession);
router.post("/sessions/stop/:sessionId", stopChargingSession);

// 6. Customers Directory
router.get("/customers", getOwnerCustomers);

// 7. Tariffs
router.get("/tariffs", getOwnerTariffs);
router.post("/tariffs", createOwnerTariff);
router.put("/tariffs/:tariffId", updateOwnerTariff);
router.delete("/tariffs/:tariffId", deleteOwnerTariff);

// 8. Payments & Revenue
router.get("/revenue", getOwnerRevenueSummary);
router.get("/revenue-summary", getOwnerRevenueSummary);
router.get("/payments/revenue-summary", getOwnerRevenueSummary);
router.get("/payments/transactions", getOwnerTransactions);
router.get("/transactions", getOwnerTransactions);
router.post("/payments/create-order", createPaymentOrder);
router.post("/payments/verify", verifyPaymentTransaction);

// 8b. Station Profitability Advisor & Expenses
router.get("/profitability/summary", getOwnerProfitabilitySummary);
router.get("/profitability/stations", getOwnerProfitabilityStations);
router.get("/profitability/trends", getOwnerProfitabilityTrends);
router.get("/expenses", getOwnerExpenses);
router.post("/expenses", createOwnerExpense);
router.put("/expenses/:expenseId", updateOwnerExpense);
router.delete("/expenses/:expenseId", deleteOwnerExpense);

// 9. Maintenance & Faults
router.get("/maintenance", getOwnerMaintenanceTickets);
router.post("/maintenance", createMaintenanceTicket);
router.put("/maintenance/:ticketId", updateMaintenanceTicket);
router.patch("/maintenance/:ticketId", updateMaintenanceTicket);
router.get("/maintenance/tickets", getOwnerMaintenanceTickets);
router.post("/maintenance/tickets", createMaintenanceTicket);
router.put("/maintenance/tickets/:ticketId", updateMaintenanceTicket);
router.patch("/maintenance/tickets/:ticketId", updateMaintenanceTicket);
router.get("/faults", getOwnerFaults);
router.put("/faults/:faultId/resolve", resolveOwnerFault);
router.get("/technicians", getOwnerTechnicians);

// 10. Energy Cost & Smart Load Management
router.get("/energy/stations/:stationId/config", getStationEnergyConfig);
router.put("/energy/stations/:stationId/config", updateStationEnergyConfig);
router.get("/energy/stations/:stationId/dashboard", getStationEnergyDashboard);
router.get("/energy/stations/:stationId", getStationEnergyDashboard);
router.post("/energy/stations/:stationId/smart-allocate", smartAllocatePower);
router.post("/energy/stations/:stationId/telemetry", recordEnergyTelemetry);
router.get("/energy/stations/:stationId/history", getStationEnergyHistory);
router.get("/energy/stations/:stationId/cost-reports", getEnergyCostReports);
router.get("/smart-load/:stationId", getStationEnergyDashboard);
router.post("/smart-load/:stationId", updateSmartLoadCapacity);

// 11. Analytics
router.get("/analytics", getOwnerAnalytics);
router.get("/analytics/revenue", getOwnerAnalytics);
router.get("/analytics/energy", getOwnerAnalytics);
router.get("/analytics/sessions", getOwnerAnalytics);
router.get("/analytics/utilization", getOwnerAnalytics);
router.get("/analytics/faults", getOwnerAnalytics);

// 12. Notifications & Audit Logs
router.get("/notifications", getOwnerNotifications);
router.put("/notifications/:id/read", markNotificationRead);
router.get("/audit-logs", getOwnerAuditLogs);

// 13. AI Owner Assistant
router.post("/ai/query", queryOwnerAI);

// 14. Settings
router.get("/settings", getOwnerSettings);
router.put("/settings", updateOwnerSettings);

export default router;
