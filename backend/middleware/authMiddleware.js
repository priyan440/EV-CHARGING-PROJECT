import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "ev_charging_secret_key_2026";

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token format invalid.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from MySQL
    const users = await query(
      "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User session expired or user no longer exists.",
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid or malformed authorization token.",
    });
  }
};

/**
 * Optional authentication: attaches user if token is valid, but does not block if missing
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const users = await query(
        "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
        [decoded.id]
      );
      if (users && users.length > 0) {
        req.user = users[0];
      }
    }
  } catch {
    // Ignore error for optional auth
  }
  next();
};

export default { authenticate, optionalAuth };
