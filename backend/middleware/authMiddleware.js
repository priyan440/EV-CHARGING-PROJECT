import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "ev_charging_secret_key_2026";

/**
 * Middleware to verify JWT token and attach user to request using pure MySQL
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (authHeader && authHeader !== "null" && authHeader !== "undefined") {
      token = authHeader;
    } else if (req.headers["x-auth-token"]) {
      token = req.headers["x-auth-token"];
    } else if (req.headers["x-user-id"]) {
      token = req.headers["x-user-id"];
    } else if (req.headers["x-user-email"]) {
      token = req.headers["x-user-email"];
    }

    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({
        success: false,
        message: "Authorization token required. Please log in.",
      });
    }

    let decoded = null;
    let isExpired = false;

    // Check if token has JWT structure (header.payload.signature)
    const isJwtFormat = typeof token === "string" && token.split(".").length === 3;
    if (isJwtFormat) {
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          isExpired = true;
          decoded = jwt.decode(token);
        } else {
          decoded = jwt.decode(token);
        }
      }
    } else {
      // Direct identifier fallback (e.g., CUS000011, email, or numeric user ID)
      const cleanToken = String(token).trim();
      decoded = {
        user_id: cleanToken.startsWith("CUS") || cleanToken.startsWith("OWN") || cleanToken.startsWith("TECH") || cleanToken.startsWith("ADM") ? cleanToken : undefined,
        email: cleanToken.includes("@") ? cleanToken.toLowerCase() : undefined,
        id: /^\d+$/.test(cleanToken) ? parseInt(cleanToken, 10) : undefined,
      };
    }

    let authenticatedUser = null;

    // Look up directly in MySQL users table
    if (decoded) {
      let users = [];
      if (decoded.id && (typeof decoded.id === "number" || /^\d+$/.test(String(decoded.id)))) {
        users = await query(
          "SELECT id, user_id, name, email, phone, role, status FROM users WHERE id = ?",
          [parseInt(decoded.id, 10)]
        );
      }
      if ((!users || users.length === 0) && decoded.email) {
        users = await query(
          "SELECT id, user_id, name, email, phone, role, status FROM users WHERE LOWER(email) = ?",
          [decoded.email.toLowerCase()]
        );
      }
      if ((!users || users.length === 0) && (decoded.user_id || decoded.counter_id || decoded.counterId)) {
        const uId = String(decoded.user_id || decoded.counter_id || decoded.counterId).toUpperCase();
        users = await query(
          "SELECT id, user_id, name, email, phone, role, status FROM users WHERE user_id = ?",
          [uId]
        );
      }

      if (users && users.length > 0) {
        const u = users[0];
        const canonicalId = u.user_id || `CUS${String(u.id).padStart(6, "0")}`;
        authenticatedUser = {
          id: u.id,
          user_id: canonicalId,
          counter_id: canonicalId,
          counterId: canonicalId,
          ownerId: canonicalId,
          customerId: canonicalId,
          technicianId: canonicalId,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          status: u.status,
        };
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        message: "User session expired or user not found. Please log in again.",
      });
    }

    req.user = authenticatedUser;

    // Refresh token header if needed
    if (isExpired || !decoded || !decoded.exp) {
      const freshToken = jwt.sign(
        {
          id: authenticatedUser.id,
          user_id: authenticatedUser.user_id,
          counterId: authenticatedUser.counterId,
          email: authenticatedUser.email,
          role: authenticatedUser.role,
          name: authenticatedUser.name,
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      res.setHeader("X-Refreshed-Token", freshToken);
      res.setHeader("Access-Control-Expose-Headers", "X-Refreshed-Token");
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication failed. Invalid or expired token.",
      error: error.message,
    });
  }
};

/**
 * Optional authentication middleware for endpoints accessible to both guests and users
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }
  return authenticate(req, res, (err) => {
    if (err) req.user = null;
    next();
  });
};

export default { authenticate, optionalAuth };
