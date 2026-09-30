import express from "express";
import {
  checkConflict,
  createOfflineBooking,
  getStationLiveStatus,
  checkInBooking,
  markBookingNoShow,
  manualOverrideBooking,
  joinQueue,
  getStationQueue,
  assignQueueEntry,
  leaveQueue,
  getReservationPolicyEndpoint,
  updateReservationPolicyEndpoint,
  getAuditLogs,
  getReservationAnalytics,
} from "../controllers/smartReservationController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public / Semi-public live status and queue inspection
router.get("/stations/:stationId/live-status", getStationLiveStatus);
router.get("/queue/:stationId", getStationQueue);
router.get("/policies/:stationId", getReservationPolicyEndpoint);
router.post("/chargers/:chargerId/check-conflict", checkConflict);
router.post("/queue", joinQueue);
router.delete("/queue/:queueId", leaveQueue);

// Protected actions requiring authentication (User / Station Owner / Admin)
router.post("/bookings/:bookingId/check-in", authenticate, checkInBooking);
router.post("/offline-bookings", authenticate, createOfflineBooking);
router.post("/bookings/:bookingId/no-show", authenticate, markBookingNoShow);
router.post("/bookings/:bookingId/override", authenticate, manualOverrideBooking);
router.post("/queue/:queueId/assign", authenticate, assignQueueEntry);
router.put("/policies/:stationId", authenticate, updateReservationPolicyEndpoint);
router.get("/audit-logs", authenticate, getAuditLogs);
router.get("/admin/reservation-analytics", authenticate, getReservationAnalytics);

export default router;
