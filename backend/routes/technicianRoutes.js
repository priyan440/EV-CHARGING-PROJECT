import express from "express";
import {
  getTechnicianDashboard,
  getAssignedStations,
  getWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  getMaintenanceTasks,
  createMaintenanceTask,
  updateMaintenanceTask,
  getFaultReports,
  reportFault,
  updateFaultStage,
  getScheduledMaintenances,
  createScheduledMaintenance,
  getServiceReports,
  createServiceReport,
  getSpareParts,
  useSparePart,
  getWorkHistory,
  getTechnicianNotifications,
  markNotificationRead,
  updateAvailability,
  toggleTechnicianStatus,
  getTechnicianProfile,
  updateTechnicianProfile,
  getNetworkDiagnostics,
  recommendTechnician,
  qrLookup,
  getBookingConflicts,
} from "../controllers/technicianController.js";

const router = express.Router();

// Dashboard & Stations
router.get("/dashboard", getTechnicianDashboard);
router.get("/stations", getAssignedStations);

// Work Orders & Maintenance Tasks
router.get("/work-orders", getWorkOrders);
router.post("/work-orders", createWorkOrder);
router.put("/work-orders/:id", updateWorkOrder);
router.patch("/work-orders/:id", updateWorkOrder);
router.get("/tasks", getMaintenanceTasks);
router.post("/tasks", createMaintenanceTask);
router.put("/tasks/:id", updateMaintenanceTask);
router.patch("/tasks/:id", updateMaintenanceTask);

// Fault Reports & 10-Stage Pipeline
router.get("/faults", getFaultReports);
router.post("/faults", reportFault);
router.put("/faults/:id", updateFaultStage);

// Preventive Maintenance & Maintenance Tickets
router.get("/maintenance", getScheduledMaintenances);
router.post("/maintenance", createScheduledMaintenance);
router.put("/maintenance/:id", updateWorkOrder);
router.patch("/maintenance/:id", updateWorkOrder);
router.get("/schedules", getScheduledMaintenances);
router.post("/schedules", createScheduledMaintenance);

// Service Reports
router.get("/service-reports", getServiceReports);
router.post("/service-reports", createServiceReport);

// Spare Parts
router.get("/spare-parts", getSpareParts);
router.get("/parts", getSpareParts);
router.post("/parts/use", useSparePart);

// Work History
router.get("/work-history", getWorkHistory);

// Notifications
router.get("/notifications", getTechnicianNotifications);
router.put("/notifications/:id/read", markNotificationRead);

// Availability & Status
router.put("/availability", updateAvailability);
router.put("/status", toggleTechnicianStatus);

// Profile
router.get("/profile", getTechnicianProfile);
router.put("/profile", updateTechnicianProfile);

// Network & OCPP Diagnostics
router.get("/network", getNetworkDiagnostics);

// Automatic Recommendation & QR Diagnostics
router.post("/recommend", recommendTechnician);
router.get("/qr-lookup/:code", qrLookup);

// Booking Conflicts
router.get("/conflicts", getBookingConflicts);

export default router;
