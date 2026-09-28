import express from "express";
import {
  register,
  registerCustomer,
  registerOwner,
  login,
  getProfile,
  getCounters,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Auth Endpoints
router.post("/register", register);
router.post("/register-customer", registerCustomer);
router.post("/register-owner", registerOwner);
router.post("/login", login);
router.get("/counters", getCounters);

// Protected Auth Endpoints
router.get("/me", authenticate, getProfile);

export default router;
