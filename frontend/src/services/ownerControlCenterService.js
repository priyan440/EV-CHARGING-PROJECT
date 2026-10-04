import api from "./api";

/**
 * Owner Control Center API Service
 * Interacts with Express & MySQL backend to provide real-time charger status,
 * station snapshots, simulator actions, bookings, and conflict operations.
 */
export const ownerControlCenterService = {
  // 1. Get Control Center Snapshot for selected station (or default)
  getControlCenter: async (stationId = "") => {
    try {
      const url = stationId
        ? `/owner/control-center?stationId=${encodeURIComponent(stationId)}`
        : `/owner/control-center`;
      const res = await api.get(url);
      return res.data;
    } catch (err) {
      console.warn("ownerControlCenterService getControlCenter notice:", err.message);
      // Fallback attempt to station live-status endpoint
      if (stationId) {
        try {
          const fallbackRes = await api.get(`/stations/${stationId}/live-status`);
          return fallbackRes.data;
        } catch {
          // ignore
        }
      }
      return {
        success: false,
        message: err.message || "Failed to load station control center",
        summary: { total: 0, available: 0, reserved: 0, protected: 0, charging: 0, occupied: 0, maintenance: 0 },
        metrics: { totalChargers: 0, availableCount: 0, reservedCount: 0, protectedCount: 0, chargingCount: 0, occupiedCount: 0, maintenanceCount: 0, upcomingReservationsCount: 0, activeChargingCount: 0, offlineArrivalsToday: 0, conflictsDetectedToday: 0, noShowsToday: 0, queueWaitingCount: 0 },
        chargers: [],
        chargerGrid: [],
        bookings: [],
        offlineBookings: [],
        queue: [],
      };
    }
  },

  // 2. Get Owner's Stations for dropdown
  getOwnerStations: async () => {
    try {
      const res = await api.get("/owner/stations");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        return {
          success: true,
          data: list.map((s) => ({
            ...s,
            id: s.stationId || s._id || s.id,
            stationId: s.stationId || s._id || s.id,
            name: s.stationName || s.name || `Station #${s.stationId || s.id}`,
            stationName: s.stationName || s.name || `Station #${s.stationId || s.id}`,
          })),
        };
      }

      // Fallback to /stations/owner/my-stations or /stations
      const fallbackRes = await api.get("/stations/owner/my-stations");
      const fallbackList = fallbackRes.data?.data || fallbackRes.data || [];
      return {
        success: true,
        data: fallbackList.map((s) => ({
          ...s,
          id: s.stationId || s._id || s.id,
          stationId: s.stationId || s._id || s.id,
          name: s.stationName || s.name || `Station #${s.stationId || s.id}`,
          stationName: s.stationName || s.name || `Station #${s.stationId || s.id}`,
        })),
      };
    } catch (err) {
      console.warn("ownerControlCenterService getOwnerStations notice:", err.message);
      return { success: false, data: [] };
    }
  },

  // 3. Get Chargers belonging to station
  getStationChargers: async (stationId = "") => {
    try {
      const url = stationId ? `/owner/chargers?stationId=${encodeURIComponent(stationId)}` : "/owner/chargers";
      const res = await api.get(url);
      return res.data?.data || res.data || [];
    } catch (err) {
      return [];
    }
  },

  // 4. Get specific charger details
  getChargerDetails: async (chargerId) => {
    try {
      const res = await api.get(`/owner/chargers/${chargerId}`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // 5. Start Charging Session
  startCharging: async (chargerId, sessionData = {}) => {
    try {
      const res = await api.post("/owner/sessions/start", {
        chargerId,
        ...sessionData,
      });
      return res.data;
    } catch (err) {
      // Try fallback to /charging-sessions/start or /charging/start
      try {
        const fallbackRes = await api.post("/charging-sessions/start", {
          chargerId,
          ...sessionData,
        });
        return fallbackRes.data;
      } catch {
        return { success: false, message: err.data?.message || err.message || "Failed to start charging session" };
      }
    }
  },

  // 6. Stop Charging Session
  stopCharging: async (sessionId, data = {}) => {
    try {
      const res = await api.post(`/owner/sessions/stop/${sessionId}`, data);
      return res.data;
    } catch (err) {
      // Try fallback
      try {
        const fallbackRes = await api.post(`/charging-sessions/${sessionId}/stop`, data);
        return fallbackRes.data;
      } catch {
        return { success: false, message: err.data?.message || err.message || "Failed to stop charging session" };
      }
    }
  },

  // 7. Simulate/Set Charger Status
  setChargerStatus: async (chargerId, status, extraData = {}) => {
    try {
      const res = await api.post(`/owner/chargers/${chargerId}/simulate-status`, {
        status,
        ...extraData,
      });
      return res.data;
    } catch (err) {
      try {
        const fallbackRes = await api.post(`/chargers/${chargerId}/simulate-status`, {
          status,
          ...extraData,
        });
        return fallbackRes.data;
      } catch {
        return { success: false, message: err.data?.message || err.message || "Failed to simulate charger status" };
      }
    }
  },

  // 8. Charger Heartbeat
  updateChargerHeartbeat: async (heartbeatData) => {
    try {
      const res = await api.post("/owner/chargers/heartbeat", heartbeatData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // 9. Smart Reservation / Conflict actions
  checkConflict: async (conflictData) => {
    try {
      const chargerId = conflictData.slotId || conflictData.chargerId || "CHG0001";
      const res = await api.post(`/chargers/${chargerId}/check-conflict`, conflictData);
      return res.data;
    } catch (err) {
      return { success: false, conflict: false, message: err.message };
    }
  },

  createOfflineBooking: async (offlineData) => {
    try {
      const res = await api.post("/offline-bookings", offlineData);
      return res.data;
    } catch (err) {
      return {
        success: false,
        conflict: err.data?.conflict || false,
        conflictType: err.data?.conflictType,
        message: err.data?.message || err.message || "Failed to check in offline customer",
      };
    }
  },

  checkInBooking: async (bookingId, qrToken = null) => {
    try {
      const res = await api.post(`/bookings/${bookingId}/check-in`, { qrToken });
      return res.data;
    } catch (err) {
      return { success: false, message: err.data?.message || err.message || "Check-in failed" };
    }
  },

  markNoShow: async (bookingId, reason = "Customer grace period expired") => {
    try {
      const res = await api.post(`/bookings/${bookingId}/no-show`, { reason });
      return res.data;
    } catch (err) {
      return { success: false, message: err.data?.message || err.message || "Failed to mark no-show" };
    }
  },

  manualOverride: async (bookingId, reason, actionType = "OVERRIDE_CANCEL", newStatus = "CANCELLED") => {
    try {
      const res = await api.post(`/bookings/${bookingId}/override`, {
        reason,
        actionType,
        newStatus,
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.data?.message || err.message || "Manual override failed" };
    }
  },

  assignQueueEntry: async (queueId, slotId) => {
    try {
      const res = await api.post(`/queue/${queueId}/assign`, { slotId });
      return res.data;
    } catch (err) {
      return { success: false, message: err.data?.message || err.message || "Failed to assign queue customer" };
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

  getAuditLogs: async (params = {}) => {
    try {
      const res = await api.get("/audit-logs", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },
};

export default ownerControlCenterService;
