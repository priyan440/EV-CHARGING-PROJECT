import express from "express";
import {
  getStations,
  getApprovedStations,
  getStationsMap,
  getStationById,
  getStationPowerStatus,
  updateStationPower,
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

// Specific Public Station Routes (Must be before /:id)
router.get("/approved", getApprovedStations);
router.get("/map", getStationsMap);
router.get("/external", getExternalStations);
router.get("/ev-stations", getExternalStations);

// Owner Stations Route
router.get(
  "/owner/my-stations",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  getMyStations
);

// All Stations Route
router.get("/", getStations);

// Power Management Status (Station Owner & Admin)
router.get("/:id/power-status", getStationPowerStatus);
router.put(
  "/:id/power",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  updateStationPower
);

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
