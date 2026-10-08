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
      const ownerId = data?.ownerId || "OWN0001";
      socket.join(`owner_${ownerId}`);
      console.log(`👑 [Socket.IO] ${socket.id} joined owner_dashboard & owner_${ownerId}`);
      socket.emit("live_status", { status: "ACTIVE", message: "Connected to Real-Time Owner Stream" });
    });

    // Join station specific room
    socket.on("join_station", (stationId) => {
      if (stationId) {
        socket.join(`station_${stationId}`);
        console.log(`⚡ [Socket.IO] ${socket.id} joined station_${stationId}`);
      }
    });

    // Join charger specific room
    socket.on("join_charger", (chargerId) => {
      if (chargerId) {
        socket.join(`charger_${chargerId}`);
        console.log(`🔌 [Socket.IO] ${socket.id} joined charger_${chargerId}`);
      }
    });

    // Join technician dashboard room
    socket.on("join_technician", (data) => {
      socket.join("technician_room");
      console.log(`🔧 [Socket.IO] ${socket.id} joined technician_room`, data || "");
      socket.emit("live_status", { status: "ACTIVE", message: "Connected to Real-Time Field Technician Stream" });
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
 * Broadcast charger status changed / available
 */
export const emitChargerStatusChanged = (charger) => {
  if (!io) return;
  const payload = {
    event: "charger_status_changed",
    timestamp: new Date().toISOString(),
    charger,
  };
  io.to("owner_dashboard").emit("charger_status_changed", payload);
  io.to("owner_dashboard").emit("charger:statusChanged", payload);
  io.emit("charger_status_changed", payload);
  io.emit("charger:statusChanged", payload);
  if (charger.status === "AVAILABLE" || charger.operationalStatus === "AVAILABLE") {
    io.emit("chargerAvailable", payload);
    io.emit("charger:available", payload);
  }
  if (charger.stationId) {
    io.to(`station_${charger.stationId}`).emit("charger_status_changed", payload);
    io.to(`station_${charger.stationId}`).emit("charger:statusChanged", payload);
    if (charger.status === "AVAILABLE") io.to(`station_${charger.stationId}`).emit("chargerAvailable", payload);
  }
  if (charger.chargerId) {
    io.to(`charger_${charger.chargerId}`).emit("charger_status_changed", payload);
    io.to(`charger_${charger.chargerId}`).emit("charger:statusChanged", payload);
  }
};

/**
 * Explicit emit for charger becoming available immediately
 */
export const emitChargerAvailable = (chargerData) => {
  if (!io) return;
  const payload = {
    event: "chargerAvailable",
    timestamp: new Date().toISOString(),
    charger: chargerData,
    ...chargerData,
  };
  io.emit("chargerAvailable", payload);
  io.emit("charger:available", payload);
  io.to("owner_dashboard").emit("chargerAvailable", payload);
  if (chargerData.stationId || chargerData.station_id) {
    io.to(`station_${chargerData.stationId || chargerData.station_id}`).emit("chargerAvailable", payload);
  }
};

/**
 * Broadcast charger telemetry ticker update
 */
export const emitTelemetryUpdated = (telemetry) => {
  if (!io) return;
  const payload = {
    event: "telemetry_updated",
    timestamp: new Date().toISOString(),
    telemetry,
  };
  io.to("owner_dashboard").emit("telemetry_updated", payload);
  io.to("owner_dashboard").emit("charger:chargingUpdated", payload);
  io.emit("telemetry_updated", payload);
  io.emit("charger:chargingUpdated", payload);
  if (telemetry.chargerId) {
    io.to(`charger_${telemetry.chargerId}`).emit("telemetry_updated", payload);
    io.to(`charger_${telemetry.chargerId}`).emit("charger:chargingUpdated", payload);
  }
};

/**
 * Broadcast session started
 */
export const emitSessionStarted = (session) => {
  if (!io) return;
  const payload = {
    event: "session_started",
    timestamp: new Date().toISOString(),
    session,
  };
  io.to("owner_dashboard").emit("session_started", payload);
  io.to("owner_dashboard").emit("charger:chargingStarted", payload);
  io.to("owner_dashboard").emit("session:started", payload);
  io.emit("session_started", payload);
  io.emit("chargingStarted", payload);
  io.emit("charger:chargingStarted", payload);
  io.emit("session:started", payload);
  if (session.stationId) {
    io.to(`station_${session.stationId}`).emit("session_started", payload);
    io.to(`station_${session.stationId}`).emit("chargingStarted", payload);
    io.to(`station_${session.stationId}`).emit("charger:chargingStarted", payload);
  }
  if (session.customerId) io.to(`user_${session.customerId}`).emit("session_started", payload);
};

/**
 * Broadcast session stopped
 */
export const emitSessionStopped = (session) => {
  if (!io) return;
  const payload = {
    event: "session_stopped",
    timestamp: new Date().toISOString(),
    session,
  };
  io.to("owner_dashboard").emit("session_stopped", payload);
  io.to("owner_dashboard").emit("charger:chargingStopped", payload);
  io.to("owner_dashboard").emit("session:completed", payload);
  io.emit("session_stopped", payload);
  io.emit("chargingCompleted", payload);
  io.emit("charger:chargingStopped", payload);
  io.emit("session:completed", payload);
  if (session.stationId) {
    io.to(`station_${session.stationId}`).emit("session_stopped", payload);
    io.to(`station_${session.stationId}`).emit("chargingCompleted", payload);
    io.to(`station_${session.stationId}`).emit("charger:chargingStopped", payload);
  }
  if (session.customerId) io.to(`user_${session.customerId}`).emit("session_stopped", payload);
};

/**
 * Broadcast real-time booking created event
 */
export const emitBookingCreated = (booking, stats = null) => {
  if (!io) return;
  const payload = {
    event: "bookingCreated",
    timestamp: new Date().toISOString(),
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("booking_created", payload);
  io.to("owner_dashboard").emit("booking:created", payload);
  io.emit("bookingCreated", payload);
  io.emit("booking_created", payload);
  io.emit("booking:created", payload);
  if (booking.stationId || booking.station_id) {
    io.to(`station_${booking.stationId || booking.station_id}`).emit("bookingCreated", payload);
    io.to(`station_${booking.stationId || booking.station_id}`).emit("booking:created", payload);
  }
  if (booking.userId || booking.user_id || booking.customerId || booking.customer_id) {
    io.to(`user_${booking.userId || booking.user_id || booking.customerId || booking.customer_id}`).emit("bookingCreated", payload);
    io.to(`user_${booking.userId || booking.user_id || booking.customerId || booking.customer_id}`).emit("booking:created", payload);
  }
};

/**
 * Broadcast real-time booking updated / confirmed event
 */
export const emitBookingUpdated = (booking, stats = null) => {
  if (!io) return;
  const payload = {
    event: "booking:updated",
    timestamp: new Date().toISOString(),
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("booking_updated", payload);
  io.to("owner_dashboard").emit("booking:updated", payload);
  io.to("owner_dashboard").emit("booking:confirmed", payload);
  io.emit("booking_updated", payload);
  io.emit("booking:updated", payload);
  io.emit("booking:confirmed", payload);
  if (booking.stationId || booking.station_id) {
    io.to(`station_${booking.stationId || booking.station_id}`).emit("booking:updated", payload);
  }
  if (booking.userId || booking.user_id || booking.customerId || booking.customer_id) {
    io.to(`user_${booking.userId || booking.user_id || booking.customerId || booking.customer_id}`).emit("booking:updated", payload);
    io.to(`user_${booking.userId || booking.user_id || booking.customerId || booking.customer_id}`).emit("booking:confirmed", payload);
  }
};

/**
 * Broadcast real-time booking cancelled event
 */
export const emitBookingCancelled = (booking, stats = null) => {
  if (!io) return;
  const payload = {
    event: "booking:cancelled",
    timestamp: new Date().toISOString(),
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("booking_cancelled", payload);
  io.to("owner_dashboard").emit("booking:cancelled", payload);
  io.emit("booking_cancelled", payload);
  io.emit("booking:cancelled", payload);
  if (booking.stationId || booking.station_id) {
    io.to(`station_${booking.stationId || booking.station_id}`).emit("booking:cancelled", payload);
  }
};

/**
 * Broadcast real-time booking completed event
 */
export const emitBookingCompleted = (booking, stats = null) => {
  if (!io) return;
  const payload = {
    event: "booking:completed",
    timestamp: new Date().toISOString(),
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("booking_completed", payload);
  io.to("owner_dashboard").emit("booking:completed", payload);
  io.emit("booking_completed", payload);
  io.emit("booking:completed", payload);
};

/**
 * Broadcast real-time payment updated event
 */
export const emitPaymentUpdated = (payment, booking = null, stats = null) => {
  if (!io) return;
  const payload = {
    event: "payment:success",
    timestamp: new Date().toISOString(),
    payment,
    booking,
    stats,
  };
  io.to("owner_dashboard").emit("payment_updated", payload);
  io.to("owner_dashboard").emit("payment:success", payload);
  io.emit("payment_updated", payload);
  io.emit("payment:success", payload);
};

/**
 * Broadcast fault detected
 */
export const emitFaultDetected = (fault) => {
  if (!io) return;
  const payload = {
    event: "fault_detected",
    timestamp: new Date().toISOString(),
    fault,
  };
  io.to("owner_dashboard").emit("fault_detected", payload);
  io.emit("fault_detected", payload);
};

/**
 * Broadcast maintenance ticket updated
 */
export const emitMaintenanceUpdated = (ticket) => {
  if (!io) return;
  const payload = {
    event: "maintenance:updated",
    timestamp: new Date().toISOString(),
    ticket,
  };
  io.to("owner_dashboard").emit("maintenance_updated", payload);
  io.to("owner_dashboard").emit("maintenance:updated", payload);
  io.to("technician_room").emit("maintenance_updated", payload);
  io.to("technician_room").emit("maintenance:updated", payload);
  io.emit("maintenance_updated", payload);
  io.emit("maintenance:updated", payload);
};

/**
 * Broadcast real-time notification
 */
export const emitNotification = (notification) => {
  if (!io) return;
  const payload = {
    event: "notification:created",
    timestamp: new Date().toISOString(),
    notification,
  };
  io.to("owner_dashboard").emit("notification_created", payload);
  io.to("owner_dashboard").emit("notification:created", payload);
  io.emit("notification_created", payload);
  io.emit("notification:created", payload);
};

/**
 * Broadcast Smart Load Balanced event
 */
export const emitLoadBalanced = (profile) => {
  if (!io) return;
  const payload = {
    event: "load_balanced",
    timestamp: new Date().toISOString(),
    profile,
  };
  io.to("owner_dashboard").emit("load_balanced", payload);
  io.emit("load_balanced", payload);
};

export const emitDashboardStats = (stats) => {
  if (!io) return;
  const payload = {
    event: "dashboard_stats",
    timestamp: new Date().toISOString(),
    stats,
  };
  io.to("owner_dashboard").emit("dashboard_stats", payload);
  io.emit("dashboard_stats", payload);
};

/**
 * Broadcast Station Updated (location coordinates, tariffs, status)
 */
export const emitStationUpdated = (station) => {
  if (!io) return;
  const payload = {
    event: "station_updated",
    timestamp: new Date().toISOString(),
    station,
  };
  io.to("owner_dashboard").emit("station_updated", payload);
  io.emit("station_updated", payload);
  io.emit("station:updated", payload);
};

export default {
  initSocket,
  getIO,
  emitChargerStatusChanged,
  emitChargerAvailable,
  emitTelemetryUpdated,
  emitSessionStarted,
  emitSessionStopped,
  emitBookingCreated,
  emitBookingUpdated,
  emitBookingCancelled,
  emitBookingCompleted,
  emitPaymentUpdated,
  emitFaultDetected,
  emitMaintenanceUpdated,
  emitNotification,
  emitLoadBalanced,
  emitDashboardStats,
  emitStationUpdated,
};
