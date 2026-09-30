import express from "express";
import {
  register,
  registerCustomer,
  registerOwner,
  login,
  sendOTP,
  verifyOTP,
  resendOTP,
  logout,
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

// Email OTP Authentication Endpoints
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/logout", logout);

router.get("/counters", getCounters);

// Protected Auth Endpoints
router.get("/me", authenticate, getProfile);

export default router;
