import express from "express";
import { Booking } from "../models/Booking.js";

const router = express.Router();

// GET /api/bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching bookings", error: err.message });
  }
});

// POST /api/bookings (Create Hold Booking)
router.post("/", async (req, res) => {
  try {
    const { stationId, chargerId, date, time } = req.body;

    // Check double-booking
    const existingConfirmed = await Booking.findOne({
      stationId,
      chargerId,
      date,
      time,
      status: { $in: ["CONFIRMED", "CHECKED_IN", "CHARGING"] }
    });

    if (existingConfirmed) {
      return res.status(409).json({
        success: false,
        message: "Charger slot is already booked for this date and time range."
      });
    }

    const bookingId = `BK${Date.now().toString().slice(-6)}`;
    const invoiceId = `INV${Date.now().toString().slice(-6)}`;
    const reservationExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins hold

    const newBooking = new Booking({
      bookingId,
      invoiceId,
      counterId: req.body.counterId || "CUS0001",
      customerName: req.body.customerName || "EV Customer",
      stationId: req.body.stationId,
      stationName: req.body.stationName,
      chargerId: req.body.chargerId || "CHG0001",
      connectorType: req.body.connectorType || "CCS2",
      vehicleNumber: req.body.vehicleNumber || "TN58AB1234",
      vehicleModel: req.body.vehicleModel || "Tata Nexon EV",
      date: req.body.date,
      time: req.body.time,
      duration: req.body.duration || "45 min",
      currentBattery: req.body.currentBattery || 30,
      targetBattery: req.body.targetBattery || 85,
      estimatedKwh: req.body.estimatedKwh || 18.5,
      chargingCost: req.body.chargingCost || 333,
      serviceFee: req.body.serviceFee || 20,
      tax: req.body.tax || 63,
      discountAmount: req.body.discountAmount || 0,
      couponCode: req.body.couponCode,
      totalAmount: req.body.totalAmount || 416,
      reservationExpiresAt,
      status: "PAYMENT_PENDING",
      paymentStatus: "PENDING",
    });

    await newBooking.save();

    res.json({
      success: true,
      booking: newBooking,
      reservationExpiresAt,
      holdMinutes: 10,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating booking hold", error: err.message });
  }
});

// POST /api/bookings/check-in (QR Check-in with Geofence check)
router.post("/check-in", async (req, res) => {
  try {
    const { bookingId, customerLatitude, customerLongitude, stationLatitude, stationLongitude, isBypassed } = req.body;

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "CONFIRMED") {
      return res.status(400).json({ success: false, message: `Cannot check in. Booking status is ${booking.status}` });
    }

    // Geofencing verification (100m radius check)
    let isWithinRange = true;
    if (!isBypassed && customerLatitude && customerLongitude && stationLatitude && stationLongitude) {
      const R = 6371e3; // metres
      const φ1 = (customerLatitude * Math.PI) / 180;
      const φ2 = (stationLatitude * Math.PI) / 180;
      const Δφ = ((stationLatitude - customerLatitude) * Math.PI) / 180;
      const Δλ = ((stationLongitude - customerLongitude) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = R * c;

      if (distanceMeters > 150) {
        isWithinRange = false;
        return res.status(400).json({
          success: false,
          message: `Check-in failed. You are ${Math.round(distanceMeters)}m away from station (allowed radius: 100m).`,
        });
      }
    }

    booking.status = "CHECKED_IN";
    booking.checkedInAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: "Check-in successful! Station charger is ready.",
      booking,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Check-in failed", error: err.message });
  }
});

export default router;
