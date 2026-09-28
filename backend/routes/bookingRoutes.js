import express from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  getUserBookings,
  updateBooking,
  deleteBooking,
} from "../controllers/bookingController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All booking routes require authentication
router.use(authenticate);

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/user/:userId", getUserBookings);
router.get("/:bookingId", getBookingById);
router.put("/:bookingId", updateBooking);
router.delete("/:bookingId", deleteBooking);

// Alias for QR check-in
router.post("/check-in", async (req, res) => {
  req.body.status = "IN_PROGRESS";
  req.params.bookingId = req.body.bookingId;
  return updateBooking(req, res);
});

export default router;
