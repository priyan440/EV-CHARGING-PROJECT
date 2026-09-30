import express from "express";
import {
  getActiveSession,
  startChargingSession,
  updateLiveTelemetry,
  stopChargingSession,
  getChargingHistory,
  getInvoiceByIdentifier,
} from "../controllers/chargingSessionController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All charging endpoints require authentication
router.use(authenticate);

// Live Charging & Session Routes
router.get("/active", getActiveSession);
router.post("/start", startChargingSession);
router.put("/:sessionId/telemetry", updateLiveTelemetry);
router.post("/:sessionId/stop", stopChargingSession);

// Historical Charging Sessions
router.get("/history", getChargingHistory);

// Invoices
router.get("/invoices/:identifier", getInvoiceByIdentifier);

export default router;
