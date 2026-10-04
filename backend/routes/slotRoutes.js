import express from "express";
import {
  getSlotsByStation,
  getSlotById,
  createSlot,
  updateSlot,
  updateSlotStatus,
  deleteSlot,
  getChargerTimeline,
  getEarliestSlot,
} from "../controllers/slotController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public Slot & Dynamic Timeline Routes
router.get("/timeline", getChargerTimeline);
router.get("/earliest", getEarliestSlot);
router.get("/station/:stationId", getSlotsByStation);
router.get("/:id", getSlotById);

// Owner / Admin Protected Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  createSlot
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  updateSlot
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  updateSlotStatus
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  deleteSlot
);

export default router;
