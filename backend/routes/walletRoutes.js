import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getWallet, topUpWallet, payWithWallet } from "../controllers/walletController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getWallet);
router.post("/topup", topUpWallet);
router.post("/pay", payWithWallet);

export default router;
