import express from "express";
import {
  getVehicles,
  getUserVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateVehicleSoc,
  getVehicleSocHistory,
  deleteVehicle,
  getConnectorTypes,
} from "../controllers/vehicleController.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public / optional auth for connector types list
router.get("/connector-types", optionalAuth, getConnectorTypes);
router.get("/types", optionalAuth, getConnectorTypes);

// All user vehicle routes require authentication
router.get("/user/:userId", authenticate, getUserVehicles);
router.get("/my", authenticate, getVehicles);
router.get("/:id/soc-history", authenticate, getVehicleSocHistory);
router.patch("/:id/soc", authenticate, updateVehicleSoc);
router.put("/:id/soc", authenticate, updateVehicleSoc);
router.post("/:id/soc", authenticate, updateVehicleSoc);
router.get("/:id", authenticate, getVehicleById);
router.get("/", authenticate, getVehicles);
router.post("/", authenticate, createVehicle);
router.put("/:id", authenticate, updateVehicle);
router.delete("/:id", authenticate, deleteVehicle);

export default router;
