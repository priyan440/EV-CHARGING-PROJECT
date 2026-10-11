import express from "express";
import {
  getTariffs,
  createTariff,
  updateTariff,
  getTariffHistory,
  calculateTariffEstimate,
} from "../controllers/tariffController.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public / User pricing API
router.get("/calculate", optionalAuth, calculateTariffEstimate);
router.post("/calculate", optionalAuth, calculateTariffEstimate);
router.get("/estimate", optionalAuth, calculateTariffEstimate);
router.get("/history", optionalAuth, getTariffHistory);

// Standard Tariff endpoints
router.get("/", optionalAuth, getTariffs);
router.post("/", authenticate, authorizeRoles("STATION_OWNER", "OWNER", "ADMIN"), createTariff);
router.put("/:id", authenticate, authorizeRoles("STATION_OWNER", "OWNER", "ADMIN"), updateTariff);

export default router;
