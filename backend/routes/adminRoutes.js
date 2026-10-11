import express from "express";
import {
  getStats,
  getAllUsers,
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateUserRole,
  getAllOwners,
  getPendingOwners,
  approveOwner,
  rejectOwner,
  suspendOwner,
  reactivateOwner,
  createOwner,
  updateOwner,
  deleteOwner,
  getAllTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  getStationsAdmin,
  getPendingStations,
  getStationPhotosAdmin,
  approveStation,
  rejectStation,
  suspendStation,
  reactivateStation,
  createStationAdmin,
  updateStationAdmin,
  deleteStationAdmin,
  getNetworkLiveMonitor,
  sendRemoteChargerCommand,
  getChargersAdmin,
  createChargerAdmin,
  updateChargerAdmin,
  deleteChargerAdmin,
  getBookingsAdmin,
  createBookingAdmin,
  updateBookingAdmin,
  deleteBookingAdmin,
  getPaymentsAdmin,
  getPaymentsReconciliation,
  refundPaymentAdmin,
  updatePaymentAdmin,
  getSessionsAdmin,
  getMaintenanceAdmin,
  getIncidentsAdmin,
  createMaintenanceAdmin,
  createIncidentAdmin,
  updateMaintenanceAdmin,
  updateIncidentAdmin,
  deleteMaintenanceAdmin,
  deleteIncidentAdmin,
  getAuditLogsAdmin,
  getAnalyticsAdmin,
  getReports,
  getDynamicSlotAnalytics,
  getPendingNetworks,
  approveNetwork,
  rejectNetwork,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All admin routes strictly require authentication and ADMIN role
router.use(authenticate, authorizeRoles("ADMIN"));

// 1. Dashboard Statistics & Analytics
router.get("/dashboard", getStats);
router.get("/stats", getStats);
router.get("/analytics", getAnalyticsAdmin);
router.get("/realtime-analytics", getAnalyticsAdmin);
router.get("/reports", getReports);
router.get("/slot-analytics", getDynamicSlotAnalytics);
router.get("/dynamic-analytics", getDynamicSlotAnalytics);

// 2. Customer Management (CRUD)
router.get("/customers", getAllCustomers);
router.get("/users", getAllUsers);
router.get("/customers/:id", getCustomerById);
router.get("/users/:id", getCustomerById);
router.post("/customers", createCustomer);
router.post("/users", createCustomer);
router.put("/customers/:id", updateCustomer);
router.patch("/customers/:id", updateCustomer);
router.put("/users/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);
router.delete("/users/:id", deleteCustomer);
router.put("/users/:id/role", updateUserRole);

// 3. Station Owners Verification & Management (A. Owner and Station Verification Center)
router.get("/owners", getAllOwners);
router.get("/station-owners", getAllOwners);
router.get("/pending-owners", getPendingOwners);
router.post("/owners", createOwner);
router.post("/station-owners", createOwner);
router.put("/owners/:id", updateOwner);
router.put("/station-owners/:id", updateOwner);
router.delete("/owners/:id", deleteOwner);
router.delete("/station-owners/:id", deleteOwner);
router.put("/owners/:id/approve", approveOwner);
router.put("/owners/:id/reject", rejectOwner);
router.put("/owners/:id/suspend", suspendOwner);
router.put("/owners/:id/reactivate", reactivateOwner);

// 4. Technicians Management (CRUD)
router.get("/technicians", getAllTechnicians);
router.post("/technicians", createTechnician);
router.put("/technicians/:id", updateTechnician);
router.delete("/technicians/:id", deleteTechnician);

// 5. Stations Verification & Management (A. Owner and Station Verification Center)
router.get("/stations", getStationsAdmin);
router.get("/pending-stations", getPendingStations);
router.get("/stations/:id/photos", getStationPhotosAdmin);
router.post("/stations", createStationAdmin);
router.put("/stations/:id", updateStationAdmin);
router.delete("/stations/:id", deleteStationAdmin);
router.put("/stations/:id/approve", approveStation);
router.put("/stations/:id/reject", rejectStation);
router.put("/stations/:id/suspend", suspendStation);
router.put("/stations/:id/reactivate", reactivateStation);

// 6. Network Live Monitor & Safe Remote Commands (B. Network Live Monitor & Remote Control Safety)
router.get("/network/monitor", getNetworkLiveMonitor);
router.get("/live-monitor", getNetworkLiveMonitor);
router.post("/chargers/:id/remote-command", sendRemoteChargerCommand);

// 7. Chargers Management (CRUD)
router.get("/chargers", getChargersAdmin);
router.post("/chargers", createChargerAdmin);
router.put("/chargers/:id", updateChargerAdmin);
router.delete("/chargers/:id", deleteChargerAdmin);

// 8. Bookings Management (CRUD)
router.get("/bookings", getBookingsAdmin);
router.post("/bookings", createBookingAdmin);
router.put("/bookings/:id", updateBookingAdmin);
router.patch("/bookings/:id", updateBookingAdmin);
router.delete("/bookings/:id", deleteBookingAdmin);

// 9. Payment Reconciliation (D. Payment Reconciliation)
router.get("/payments", getPaymentsAdmin);
router.get("/payments/reconciliation", getPaymentsReconciliation);
router.post("/payments/:id/refund", refundPaymentAdmin);
router.put("/payments/:id", updatePaymentAdmin);

// 10. Sessions Management
router.get("/sessions", getSessionsAdmin);
router.get("/live-sessions", getSessionsAdmin);

// 11. Incident and Maintenance Center (C. Incident and Maintenance Center)
router.get("/maintenance", getMaintenanceAdmin);
router.get("/incidents", getIncidentsAdmin);
router.post("/maintenance", createMaintenanceAdmin);
router.post("/incidents", createIncidentAdmin);
router.put("/maintenance/:id", updateMaintenanceAdmin);
router.put("/incidents/:id", updateIncidentAdmin);
router.delete("/maintenance/:id", deleteMaintenanceAdmin);
router.delete("/incidents/:id", deleteIncidentAdmin);

// 12. Security and Audit Center (E. Security and Audit Center)
router.get("/audit-logs", getAuditLogsAdmin);

// 13. Networks
router.get("/pending-networks", getPendingNetworks);
router.put("/networks/:id/approve", approveNetwork);
router.put("/networks/:id/reject", rejectNetwork);

export default router;
