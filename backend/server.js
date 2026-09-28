import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB, pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import stationRoutes from "./routes/stationRoutes.js";
import slotRoutes from "./routes/slotRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
import { getExternalStations } from "./controllers/stationController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration: Restrict to allowlist from CLIENT_ORIGINS
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

const envOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit auth attempts to 20 per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/register-customer", authLimiter);
app.use("/api/auth/register-owner", authLimiter);
app.use("/api/security/change-password", authLimiter);

app.use(express.json());

// Initialize MySQL Database Connection
connectDB();

// Health Check Endpoint (MySQL connectivity verification)
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "OK",
      success: true,
      message: "EV Charging API is running",
      database: "connected",
      timestamp: new Date().toISOString(),
      services: {
        backendApi: "ONLINE",
        database: "ONLINE",
        mysql: "ONLINE",
        razorpayGateway: "TEST_MODE_ACTIVE",
      },
    });
  } catch (err) {
    res.status(503).json({
      status: "ERROR",
      success: false,
      message: "Database connection failed",
      database: "disconnected",
      error: err.message,
    });
  }
});

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/stations", stationRoutes);
app.get("/api/ev-stations", getExternalStations);
app.use("/api/slots", slotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);

// Retain existing auxiliary routes for innovative features
if (analyticsRoutes) app.use("/api/analytics", analyticsRoutes);
if (securityRoutes) app.use("/api/security", securityRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected server error occurred.",
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

// Serve compiled frontend production build if present
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) next();
  });
});

// Start Express Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`⚡ EV Charging Server running on port ${PORT}`);
  console.log(`🐬 MySQL Connected: ${process.env.DB_NAME || "ev_charging_db"}`);
  console.log(`💳 Razorpay Integration active (Key ID: ${process.env.RAZORPAY_KEY_ID ? "Configured" : "Not Set"})`);
});

export default app;
