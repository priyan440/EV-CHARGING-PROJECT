import express from "express";
import {
  getStats,
  getAllUsers,
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAllOwners,
  createOwner,
  updateOwner,
  deleteOwner,
  getPendingOwners,
  approveOwner,
  rejectOwner,
  getAllTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  getStationsAdmin,
  createStationAdmin,
  updateStationAdmin,
  deleteStationAdmin,
  getPendingStations,
  approveStation,
  rejectStation,
  suspendStation,
  getChargersAdmin,
  createChargerAdmin,
  updateChargerAdmin,
  deleteChargerAdmin,
  getBookingsAdmin,
  createBookingAdmin,
  updateBookingAdmin,
  deleteBookingAdmin,
  getPaymentsAdmin,
  updatePaymentAdmin,
  getSessionsAdmin,
  getMaintenanceAdmin,
  createMaintenanceAdmin,
  updateMaintenanceAdmin,
  deleteMaintenanceAdmin,
  getAuditLogsAdmin,
  getReports,
  updateUserRole,
  getPendingNetworks,
  approveNetwork,
  rejectNetwork,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorizeRoles("ADMIN"));

// 1. Dashboard Statistics
router.get("/dashboard", getStats);
router.get("/stats", getStats);
router.get("/reports", getReports);

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

// 3. Station Owners Management (CRUD)
router.get("/owners", getAllOwners);
router.get("/station-owners", getAllOwners);
router.post("/owners", createOwner);
router.post("/station-owners", createOwner);
router.put("/owners/:id", updateOwner);
router.put("/station-owners/:id", updateOwner);
router.delete("/owners/:id", deleteOwner);
router.delete("/station-owners/:id", deleteOwner);
router.get("/pending-owners", getPendingOwners);
router.put("/owners/:id/approve", approveOwner);
router.put("/owners/:id/reject", rejectOwner);

// 4. Technicians Management (CRUD)
router.get("/technicians", getAllTechnicians);
router.post("/technicians", createTechnician);
router.put("/technicians/:id", updateTechnician);
router.delete("/technicians/:id", deleteTechnician);

// 5. Stations Management (CRUD)
router.get("/stations", getStationsAdmin);
router.post("/stations", createStationAdmin);
router.put("/stations/:id", updateStationAdmin);
router.delete("/stations/:id", deleteStationAdmin);
router.get("/pending-stations", getPendingStations);
router.put("/stations/:id/approve", approveStation);
router.put("/stations/:id/reject", rejectStation);
router.put("/stations/:id/suspend", suspendStation);

// 6. Chargers Management (CRUD)
router.get("/chargers", getChargersAdmin);
router.post("/chargers", createChargerAdmin);
router.put("/chargers/:id", updateChargerAdmin);
router.delete("/chargers/:id", deleteChargerAdmin);

// 7. Bookings Management (CRUD)
router.get("/bookings", getBookingsAdmin);
router.post("/bookings", createBookingAdmin);
router.put("/bookings/:id", updateBookingAdmin);
router.patch("/bookings/:id", updateBookingAdmin);
router.delete("/bookings/:id", deleteBookingAdmin);

// 8. Payments Management
router.get("/payments", getPaymentsAdmin);
router.put("/payments/:id", updatePaymentAdmin);

// 9. Sessions Management
router.get("/sessions", getSessionsAdmin);
router.get("/live-sessions", getSessionsAdmin);

// 10. Maintenance Management (CRUD)
router.get("/maintenance", getMaintenanceAdmin);
router.post("/maintenance", createMaintenanceAdmin);
router.put("/maintenance/:id", updateMaintenanceAdmin);
router.delete("/maintenance/:id", deleteMaintenanceAdmin);

// 11. Audit Logs
router.get("/audit-logs", getAuditLogsAdmin);

// 12. Networks
router.get("/pending-networks", getPendingNetworks);
router.put("/networks/:id/approve", approveNetwork);
router.put("/networks/:id/reject", rejectNetwork);

export default router;
