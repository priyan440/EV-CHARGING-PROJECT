import express from "express";
import {
  getNetworks,
  getNetworkById,
  createNetwork,
  updateNetwork,
} from "../controllers/networkController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getNetworks);
router.get("/:id", getNetworkById);

router.post(
  "/",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  createNetwork
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("STATION_OWNER", "ADMIN"),
  updateNetwork
);

export default router;
