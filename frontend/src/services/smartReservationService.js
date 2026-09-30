import api from "./api";

export const smartReservationService = {
  // 1. Check Charger Conflict
  checkConflict: async (conflictData) => {
    try {
      const chargerId = conflictData.slotId || conflictData.chargerId || "CHG0001";
      const res = await api.post(`/chargers/${chargerId}/check-conflict`, conflictData);
      return res.data;
    } catch (err) {
      if (err.data && err.data.conflict !== undefined) {
        return err.data;
      }
      return {
        success: false,
        conflict: false,
        message: err.message || "Failed to check charger conflict",
      };
    }
  },

  // 2. Create Offline Customer Booking / Check-In
  createOfflineBooking: async (offlineData) => {
    try {
      const res = await api.post("/offline-bookings", offlineData);
      return res.data;
    } catch (err) {
      return {
        success: false,
        conflict: err.data?.conflict || false,
        conflictType: err.data?.conflictType,
        reservationDetails: err.data?.reservationDetails,
        recommendedChargers: err.data?.recommendedChargers,
        message: err.data?.message || err.message || "Failed to check in offline customer",
      };
    }
  },

  // 3. Get Station Live Status (Charger Grid, KPIs, Active Sessions, Queue)
  getStationLiveStatus: async (stationId) => {
    try {
      const res = await api.get(`/stations/${stationId}/live-status`);
      return res.data;
    } catch (err) {
      console.warn("getStationLiveStatus notice:", err.message);
      return { success: false, message: err.message };
    }
  },

  // 4. Online Booking Check-In (via QR token or ID)
  checkInBooking: async (bookingId, qrToken = null) => {
    try {
      const res = await api.post(`/bookings/${bookingId}/check-in`, { qrToken });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.data?.message || err.message || "Check-in failed",
      };
    }
  },

  // 5. Mark Booking as No-Show & Release Charger
  markNoShow: async (bookingId, reason = "Customer grace period expired") => {
    try {
      const res = await api.post(`/bookings/${bookingId}/no-show`, { reason });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.data?.message || err.message || "Failed to mark no-show",
      };
    }
  },

  // 6. Manual Override with Audit Logging
  manualOverride: async (bookingId, reason, actionType = "OVERRIDE_CANCEL", newStatus = "CANCELLED") => {
    try {
      const res = await api.post(`/bookings/${bookingId}/override`, {
        reason,
        actionType,
        newStatus,
      });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.data?.message || err.message || "Manual override failed",
      };
    }
  },

  // 7. Smart Queue Operations
  joinQueue: async (queueData) => {
    try {
      const res = await api.post("/queue", queueData);
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.data?.message || err.message || "Failed to join queue",
      };
    }
  },

  getStationQueue: async (stationId) => {
    try {
      const res = await api.get(`/queue/${stationId}`);
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  assignQueueEntry: async (queueId, slotId) => {
    try {
      const res = await api.post(`/queue/${queueId}/assign`, { slotId });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.data?.message || err.message || "Failed to assign queued customer",
      };
    }
  },

  leaveQueue: async (queueId) => {
    try {
      const res = await api.delete(`/queue/${queueId}`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // 8. Reservation Policy Configuration
  getReservationPolicy: async (stationId = "global") => {
    try {
      const res = await api.get(`/policies/${stationId}`);
      return res.data;
    } catch (err) {
      return {
        success: false,
        policy: {
          protectionMinutes: 10,
          gracePeriodMinutes: 10,
          queueTimeoutMinutes: 5,
          maxAdvanceDays: 7,
          maxDurationHours: 4,
          cancellationWindowMins: 15,
          noShowPenaltyPct: 20,
          autoAssignQueue: true,
          allowOfflineBooking: true,
        },
      };
    }
  },

  updateReservationPolicy: async (stationId, policyData) => {
    try {
      const res = await api.put(`/policies/${stationId}`, policyData);
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.data?.message || err.message || "Failed to update reservation policy",
      };
    }
  },

  // 9. Audit Logs
  getAuditLogs: async (params = {}) => {
    try {
      const res = await api.get("/audit-logs", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // 10. Analytics
  getReservationAnalytics: async () => {
    try {
      const res = await api.get("/admin/reservation-analytics");
      return res.data;
    } catch (err) {
      return { success: false, analytics: null };
    }
  },
};

export default smartReservationService;
