import express from "express";
import {
  createOrder,
  verifyPayment,
  getPayments,
  requestRefund,
} from "../controllers/paymentController.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order", optionalAuth, createOrder);
router.post("/verify", authenticate, verifyPayment);
router.post("/refund", authenticate, requestRefund);
router.get("/", authenticate, getPayments);
router.get("/user/:userId", authenticate, getPayments);

export default router;
