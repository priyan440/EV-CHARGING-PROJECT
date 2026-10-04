import express from "express";
import {
  getComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
} from "../controllers/complaintController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getComplaints);
router.get("/:id", getComplaintById);
router.post("/", createComplaint);
router.put("/:id", updateComplaint);
router.patch("/:id", updateComplaint);
router.put("/:id/status", updateComplaint);

export default router;
