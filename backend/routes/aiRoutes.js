import express from "express";
import { optionalAuth } from "../middleware/authMiddleware.js";
import { handleChat, getAIStatus } from "../controllers/aiController.js";

const router = express.Router();

// POST /api/ai/chat - Process natural language query with authenticated context
router.post("/chat", optionalAuth, handleChat);

// GET /api/ai/status - Get live system connectivity & station statistics for VoltBot
router.get("/status", getAIStatus);

export default router;
