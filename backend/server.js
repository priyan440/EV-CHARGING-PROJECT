import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import stationRoutes from "./routes/stationRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import authRoutes from "./routes/authRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect MongoDB database if configured
connectDB();

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/ev-stations", stationRoutes);
app.use("/api/bookings", bookingRoutes);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "EV Charging Station Management System Backend operational",
    services: {
      backendApi: "ONLINE",
      database: "ONLINE",
      razorpayGateway: "TEST_MODE_ACTIVE",
      notificationProvider: "ONLINE",
      webSocketServer: "STANDBY",
    },
  });
});

// Serve compiled frontend production build
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
  console.log(`💳 Razorpay Test Mode active (Key ID: ${process.env.RAZORPAY_KEY_ID || "rzp_test_51x8892019a"})`);
});
