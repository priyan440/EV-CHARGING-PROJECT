import express from "express";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  createEmergencyRequest,
  getMyEmergencyRequests,
  getAllEmergencyRequests,
  updateEmergencyStatus,
  getNearbyEmergencyServices,
} from "../controllers/emergencyController.js";

const router = express.Router();

router.post("/request", optionalAuth, createEmergencyRequest);
router.post("/requests", optionalAuth, createEmergencyRequest);
router.get("/my-requests", optionalAuth, getMyEmergencyRequests);
router.get("/requests", optionalAuth, getAllEmergencyRequests);
router.patch("/requests/:id/status", optionalAuth, updateEmergencyStatus);
router.put("/requests/:id/status", optionalAuth, updateEmergencyStatus);
router.get("/nearby-services", optionalAuth, getNearbyEmergencyServices);

export default router;
