import express from "express";
import {
  getStats,
  getAllUsers,
  getAllOwners,
  updateUserRole,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.get("/owners", getAllOwners);
router.put("/users/:id/role", updateUserRole);

export default router;
