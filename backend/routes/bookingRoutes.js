import express from "express";
import {
  createBooking,
  createOfflineBooking,
  getBookings,
  getCustomerBookings,
  getOwnerBookings,
  getBookingById,
  getUserBookings,
  getAvailableConnectors,
  checkAvailability,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getDashboardStatsEndpoint,
  getSlotBookings,
} from "../controllers/bookingController.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Available Connectors and Slot Bookings can be called with optional or standard authentication
router.get("/available-connectors", optionalAuth, getAvailableConnectors);
router.get("/slot-bookings", optionalAuth, getSlotBookings);
router.post("/check-availability", optionalAuth, checkAvailability);

// All other booking routes require authentication
router.use(authenticate);

// Real-Time Dashboard Statistics
router.get("/stats", getDashboardStatsEndpoint);
router.get("/stats/owner", getDashboardStatsEndpoint);

// Specific Booking Endpoints
router.post("/offline", createOfflineBooking);
router.get("/my-bookings", getCustomerBookings);
router.get("/customer-bookings", getCustomerBookings);
router.get("/owner-bookings", getOwnerBookings);
router.get("/my", getBookings);
router.get("/user/:userId", getUserBookings);

// Generic / root & parameterized routes
router.post("/", createBooking);
router.post("/create", createBooking);
router.get("/", getBookings);
router.get("/:bookingId", getBookingById);
router.put("/:bookingId", updateBooking);
router.patch("/:bookingId", updateBooking);
router.patch("/:bookingId/status", updateBooking);
router.put("/:bookingId/status", updateBooking);

// Cancel Booking support across POST, PUT, PATCH
router.post("/:bookingId/cancel", cancelBooking);
router.put("/:bookingId/cancel", cancelBooking);
router.patch("/:bookingId/cancel", cancelBooking);

router.delete("/:bookingId", deleteBooking);

// QR check-in
router.post("/check-in", async (req, res) => {
  req.body.status = "IN_PROGRESS";
  req.params.bookingId = req.body.bookingId;
  return updateBooking(req, res);
});

export default router;
