import express from "express";
import {
  getActiveSession,
  startChargingSession,
  updateLiveTelemetry,
  stopChargingSession,
  getChargingHistory,
  getInvoiceByIdentifier,
  estimateChargingCost,
} from "../controllers/chargingSessionController.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Charging Cost & Energy Estimation API (Public / Optional Auth)
router.post("/estimate", optionalAuth, estimateChargingCost);
router.get("/estimate", optionalAuth, estimateChargingCost);

// All other charging endpoints require authentication
router.use(authenticate);

// Live Charging & Session Routes
router.get("/active", getActiveSession);
router.post("/start", startChargingSession);
router.post("/stop", stopChargingSession);
router.put("/:sessionId/telemetry", updateLiveTelemetry);
router.post("/:sessionId/stop", stopChargingSession);

// Historical Charging Sessions
router.get("/history", getChargingHistory);

// Invoices
router.get("/invoices/:identifier", getInvoiceByIdentifier);

export default router;
