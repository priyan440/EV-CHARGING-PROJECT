import express from "express";
import {
  createBooking,
  createOfflineBooking,
  getBookings,
  getBookingById,
  getUserBookings,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getDashboardStatsEndpoint,
} from "../controllers/bookingController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All booking routes require authentication
router.use(authenticate);

// Real-Time Dashboard Statistics
router.get("/stats", getDashboardStatsEndpoint);
router.get("/stats/owner", getDashboardStatsEndpoint);

// Booking Endpoints
router.post("/", createBooking);
router.post("/offline", createOfflineBooking);
router.get("/", getBookings);
router.get("/my", getBookings); // Direct alias for authenticated user's bookings
router.get("/user/:userId", getUserBookings);
router.get("/:bookingId", getBookingById);
router.put("/:bookingId", updateBooking);
router.patch("/:bookingId", updateBooking);
router.patch("/:bookingId/status", updateBooking);
router.put("/:bookingId/cancel", cancelBooking);
router.delete("/:bookingId", deleteBooking);

// QR check-in
router.post("/check-in", async (req, res) => {
  req.body.status = "IN_PROGRESS";
  req.params.bookingId = req.body.bookingId;
  return updateBooking(req, res);
});

export default router;
