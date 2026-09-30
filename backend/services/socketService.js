import { Server } from "socket.io";

let io = null;

/**
 * Initialize Socket.IO instance attached to HTTP server
 */
export const initSocket = (httpServer, allowedOrigins = []) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev to ensure smooth real-time connectivity
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);

    // Join owner dashboard room
    socket.on("join_owner_dashboard", (data) => {
      socket.join("owner_dashboard");
      console.log(`👑 [Socket.IO] ${socket.id} joined owner_dashboard room`, data || "");
      socket.emit("live_status", { status: "ACTIVE", message: "Connected to Real-Time Owner Stream" });
    });

    // Join station specific room
    socket.on("join_station", (stationId) => {
      if (stationId) {
        socket.join(`station_${stationId}`);
        console.log(`⚡ [Socket.IO] ${socket.id} joined station_${stationId}`);
      }
    });

    // Join specific user room
    socket.on("join_user", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`👤 [Socket.IO] ${socket.id} joined user_${userId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

/**
 * Get active io instance
 */
export const getIO = () => {
  return io;
};

/**
 * Broadcast real-time booking created event
 */
export const emitBookingCreated = (booking, stats = null) => {
  if (!io) return;
  const payload = {
    event: "booking_created",
    timestamp: new Date().toISOString(),
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("booking_created", payload);
  io.emit("booking_created", payload); // Broadcast to all connected clients
  if (booking.stationId || booking.station_id) {
    io.to(`station_${booking.stationId || booking.station_id}`).emit("booking_created", payload);
  }
  if (booking.userId || booking.user_id) {
    io.to(`user_${booking.userId || booking.user_id}`).emit("booking_created", payload);
  }
  console.log(`📢 [Socket.IO] Emitted booking_created for ${booking.bookingId || booking.booking_id}`);
};

/**
 * Broadcast real-time booking updated event
 */
export const emitBookingUpdated = (booking, stats = null) => {
  if (!io) return;
  const payload = {
    event: "booking_updated",
    timestamp: new Date().toISOString(),
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("booking_updated", payload);
  io.emit("booking_updated", payload);
  if (booking.stationId || booking.station_id) {
    io.to(`station_${booking.stationId || booking.station_id}`).emit("booking_updated", payload);
  }
  if (booking.userId || booking.user_id) {
    io.to(`user_${booking.userId || booking.user_id}`).emit("booking_updated", payload);
  }
  console.log(`📢 [Socket.IO] Emitted booking_updated for ${booking.bookingId || booking.booking_id} -> ${booking.status}`);
};

/**
 * Broadcast real-time booking cancelled event
 */
export const emitBookingCancelled = (booking, stats = null) => {
  if (!io) return;
  const payload = {
    event: "booking_cancelled",
    timestamp: new Date().toISOString(),
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("booking_cancelled", payload);
  io.emit("booking_cancelled", payload);
  if (booking.stationId || booking.station_id) {
    io.to(`station_${booking.stationId || booking.station_id}`).emit("booking_cancelled", payload);
  }
  if (booking.userId || booking.user_id) {
    io.to(`user_${booking.userId || booking.user_id}`).emit("booking_cancelled", payload);
  }
  console.log(`📢 [Socket.IO] Emitted booking_cancelled for ${booking.bookingId || booking.booking_id}`);
};

/**
 * Broadcast real-time booking completed event
 */
export const emitBookingCompleted = (booking, stats = null) => {
  if (!io) return;
  const payload = {
    event: "booking_completed",
    timestamp: new Date().toISOString(),
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("booking_completed", payload);
  io.emit("booking_completed", payload);
  if (booking.stationId || booking.station_id) {
    io.to(`station_${booking.stationId || booking.station_id}`).emit("booking_completed", payload);
  }
  if (booking.userId || booking.user_id) {
    io.to(`user_${booking.userId || booking.user_id}`).emit("booking_completed", payload);
  }
  console.log(`📢 [Socket.IO] Emitted booking_completed for ${booking.bookingId || booking.booking_id}`);
};

/**
 * Broadcast real-time payment updated event
 */
export const emitPaymentUpdated = (payment, booking = null, stats = null) => {
  if (!io) return;
  const payload = {
    event: "payment_updated",
    timestamp: new Date().toISOString(),
    payment,
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("payment_updated", payload);
  io.emit("payment_updated", payload);
  console.log(`📢 [Socket.IO] Emitted payment_updated for ${payment.transactionId || payment.bookingId}`);
};

/**
 * Broadcast updated dashboard statistics
 */
export const emitDashboardStats = (stats) => {
  if (!io) return;
  io.to("owner_dashboard").emit("dashboard_stats_updated", {
    event: "dashboard_stats_updated",
    timestamp: new Date().toISOString(),
    stats,
  });
  console.log(`📢 [Socket.IO] Emitted dashboard_stats_updated`);
};

export default {
  initSocket,
  getIO,
  emitBookingCreated,
  emitBookingUpdated,
  emitBookingCancelled,
  emitBookingCompleted,
  emitPaymentUpdated,
  emitDashboardStats,
};
