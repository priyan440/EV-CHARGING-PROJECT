import express from "express";
import {
  getStats,
  getAllUsers,
  getAllOwners,
  getPendingOwners,
  approveOwner,
  rejectOwner,
  updateUserRole,
  getStationsAdmin,
  getPendingStations,
  approveStation,
  rejectStation,
  suspendStation,
  getPendingNetworks,
  approveNetwork,
  rejectNetwork,
  getBookingsAdmin,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.get("/owners", getAllOwners);
router.put("/users/:id/role", updateUserRole);

// Station Approval Workflow Endpoints
router.get("/stations", getStationsAdmin);
router.get("/pending-stations", getPendingStations);
router.put("/stations/:id/approve", approveStation);
router.put("/stations/:id/reject", rejectStation);
router.put("/stations/:id/suspend", suspendStation);

// Owner Approval Workflow Endpoints
router.get("/pending-owners", getPendingOwners);
router.put("/owners/:id/approve", approveOwner);
router.put("/owners/:id/reject", rejectOwner);

// Network Approval Workflow Endpoints
router.get("/pending-networks", getPendingNetworks);
router.put("/networks/:id/approve", approveNetwork);
router.put("/networks/:id/reject", rejectNetwork);

// Booking Monitoring
router.get("/bookings", getBookingsAdmin);

export default router;
