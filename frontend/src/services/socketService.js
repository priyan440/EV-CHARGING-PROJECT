import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.status = "disconnected";
    this.statusListeners = new Set();
  }

  getBackendUrl() {
    if (import.meta.env.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
    }
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname || "localhost";
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      return `${protocol}//${hostname}:5001`;
    }
    return "http://localhost:5001";
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const backendUrl = this.getBackendUrl();
    this.updateStatus("connecting");

    this.socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
    });

    this.socket.on("connect", () => {
      console.log("🟢 [Socket.IO] Connected to Real-Time Server:", this.socket.id);
      this.updateStatus("connected");
      this.socket.emit("join_owner_dashboard", { clientTime: new Date().toISOString() });
    });

    this.socket.on("connect_error", (error) => {
      console.warn("🔴 [Socket.IO] Connection error:", error.message);
      this.updateStatus("reconnecting");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔴 [Socket.IO] Disconnected:", reason);
      if (reason === "io server disconnect") {
        // the disconnection was initiated on the server, reconnect manually
        this.socket.connect();
      }
      this.updateStatus("reconnecting");
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      console.log(`🟡 [Socket.IO] Reconnection attempt #${attempt}...`);
      this.updateStatus("reconnecting");
    });

    this.socket.on("reconnect", () => {
      console.log("🟢 [Socket.IO] Successfully reconnected!");
      this.updateStatus("connected");
      this.socket.emit("join_owner_dashboard", { clientTime: new Date().toISOString() });
    });

    return this.socket;
  }

  updateStatus(newStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((listener) => {
      try {
        listener(newStatus);
      } catch (err) {
        console.error("Status listener error:", err);
      }
    });
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  getStatus() {
    return this.status;
  }

  joinOwnerDashboard() {
    if (this.socket && this.socket.connected) {
      this.socket.emit("join_owner_dashboard");
    }
  }

  joinStation(stationId) {
    if (this.socket && this.socket.connected && stationId) {
      this.socket.emit("join_station", stationId);
    }
  }

  onBookingCreated(callback) {
    if (!this.socket) this.connect();
    this.socket.on("booking_created", callback);
    return () => this.socket.off("booking_created", callback);
  }

  onBookingUpdated(callback) {
    if (!this.socket) this.connect();
    this.socket.on("booking_updated", callback);
    return () => this.socket.off("booking_updated", callback);
  }

  onBookingCancelled(callback) {
    if (!this.socket) this.connect();
    this.socket.on("booking_cancelled", callback);
    return () => this.socket.off("booking_cancelled", callback);
  }

  onBookingCompleted(callback) {
    if (!this.socket) this.connect();
    this.socket.on("booking_completed", callback);
    return () => this.socket.off("booking_completed", callback);
  }

  onPaymentUpdated(callback) {
    if (!this.socket) this.connect();
    this.socket.on("payment_updated", callback);
    return () => this.socket.off("payment_updated", callback);
  }

  onStatsUpdated(callback) {
    if (!this.socket) this.connect();
    this.socket.on("dashboard_stats_updated", callback);
    return () => this.socket.off("dashboard_stats_updated", callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateStatus("disconnected");
    }
  }
}

export const socketService = new SocketService();
export default socketService;
