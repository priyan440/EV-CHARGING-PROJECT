import express from "express";
import {
  getStations,
  getStationById,
  getMyStations,
  createStation,
  updateStation,
  deleteStation,
  getExternalStations,
  getPriceQuote,
  getPricingRules,
  updatePricingRules,
} from "../controllers/stationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public Station Routes
router.get("/external", getExternalStations);
router.get("/ev-stations", getExternalStations);
router.get("/", getStations);

// Dynamic Price Quote Endpoint
router.get("/:id/price-quote", getPriceQuote);

// Pricing Rules Endpoints
router.get("/:id/pricing-rules", getPricingRules);
router.put(
  "/:id/pricing-rules",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  updatePricingRules
);

// Owner Stations Route
router.get(
  "/owner/my-stations",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  getMyStations
);

// Single Station
router.get("/:id", getStationById);

// Owner / Admin Protected Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  createStation
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  updateStation
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  deleteStation
);

export default router;
