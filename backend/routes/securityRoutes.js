import express from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper to parse basic device and browser info from user-agent string
function parseUserAgent(ua = "") {
  let device = "Desktop PC";
  let browser = "Web Browser";

  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    device = /ipad|tablet/i.test(ua) ? "Tablet" : "Mobile Device";
  }

  if (/edg/i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/chrome|crios/i.test(ua)) {
    browser = "Google Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Mozilla Firefox";
  } else if (/safari/i.test(ua)) {
    browser = "Apple Safari";
  }

  return { device, browser };
}

/**
 * GET /api/security/activity
 * Return real login activity from MySQL for authenticated user
 */
router.get("/activity", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    const rows = await query(
      `SELECT id, ip, user_agent, created_at 
       FROM login_activity 
       WHERE user_id = ? 
       ORDER BY id DESC 
       LIMIT 20`,
      [userId]
    );

    const activity = rows.map((item, idx) => {
      const { device, browser } = parseUserAgent(item.user_agent);
      return {
        id: `LOG_${String(item.id).padStart(4, "0")}`,
        timestamp: item.created_at,
        device,
        browser,
        ip: item.ip,
        userAgent: item.user_agent,
        status: "SUCCESS",
        isCurrentSession: idx === 0 || item.ip === currentIp,
      };
    });

    res.json({
      success: true,
      count: activity.length,
      activity,
    });
  } catch (err) {
    console.error("Fetch Security Activity Error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching security activity",
      error: err.message,
    });
  }
});

/**
 * POST /api/security/change-password
 * Change password for authenticated user (verifies current password with bcrypt)
 */
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is required.",
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    // Fetch user with existing password hash from MySQL
    const users = await query("SELECT id, password FROM users WHERE id = ?", [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const user = users[0];

    // Verify current password with bcrypt
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password does not match.",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update in MySQL
    await query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    res.json({
      success: true,
      message: "Password updated successfully!",
    });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating password",
      error: err.message,
    });
  }
});

export default router;
