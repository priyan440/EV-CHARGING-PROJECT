/**
 * EV CHARGING STATION MANAGEMENT SYSTEM
 * Central Canonical Status Mapping & Verification Utility (Backend)
 */

export const OWNER_STATUSES = Object.freeze({
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  ACTIVE: "ACTIVE",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  UNKNOWN: "UNKNOWN",
});

export const STATION_APPROVAL_STATUSES = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  UNKNOWN: "UNKNOWN",
});

export const CHARGER_STATUSES = Object.freeze({
  AVAILABLE: "AVAILABLE",
  CHARGING: "CHARGING",
  RESERVED: "RESERVED",
  OCCUPIED: "OCCUPIED",
  FAULTED: "FAULTED",
  MAINTENANCE: "MAINTENANCE",
  OFFLINE: "OFFLINE",
  UNAVAILABLE: "UNAVAILABLE",
  UNKNOWN: "UNKNOWN",
});

export const SESSION_STATUSES = Object.freeze({
  PENDING: "PENDING",
  STARTED: "STARTED",
  ACTIVE: "ACTIVE",
  CHARGING: "CHARGING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  INTERRUPTED: "INTERRUPTED",
  UNKNOWN: "UNKNOWN",
});

export const PAYMENT_STATUSES = Object.freeze({
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
  UNKNOWN: "UNKNOWN",
});

/**
 * Check whether a charger's heartbeat is active or stale
 * @param {string|Date} lastHeartbeat
 * @param {number} timeoutSeconds Default 60 seconds
 * @returns {boolean}
 */
export const isChargerOnline = (lastHeartbeat, timeoutSeconds = 60) => {
  if (!lastHeartbeat) return false;
  const lastTime = new Date(lastHeartbeat).getTime();
  if (isNaN(lastTime)) return false;
  const now = Date.now();
  const diffSeconds = (now - lastTime) / 1000;
  return diffSeconds <= timeoutSeconds;
};

/**
 * Derive consolidated charger status taking into account heartbeat, active sessions, and database status
 */
export const deriveChargerStatus = (chargerOrStatus, activeSession = null, upcomingBooking = null) => {
  if (!chargerOrStatus) return CHARGER_STATUSES.UNKNOWN;

  let charger = {};
  if (typeof chargerOrStatus === "string") {
    charger = { status: chargerOrStatus };
  } else {
    charger = chargerOrStatus;
  }

  const rawStatus = (charger.status || "").toUpperCase().trim();
  const lastHeartbeat = charger.last_heartbeat || charger.lastHeartbeat;
  const timeoutSec = charger.heartbeat_timeout_seconds || charger.heartbeatTimeoutSeconds || 60;
  const online = isChargerOnline(lastHeartbeat, timeoutSec);

  // If faulted or in maintenance, preserve explicit fault status
  if (rawStatus === "FAULTED" || rawStatus === "MAINTENANCE" || rawStatus === "UNAVAILABLE") {
    return rawStatus;
  }

  // If there's an active charging session in progress
  if (activeSession && ["CHARGING", "STARTED", "ACTIVE", "IN_PROGRESS"].includes((activeSession.session_status || activeSession.status || "").toUpperCase())) {
    return CHARGER_STATUSES.CHARGING;
  }

  // If there's an active protected or checked-in booking
  if (upcomingBooking && ["PROTECTED", "CHECKED_IN", "CHARGING"].includes((upcomingBooking.booking_status || upcomingBooking.bookingStatus || "").toUpperCase())) {
    return CHARGER_STATUSES.CHARGING;
  }

  // If there's an upcoming confirmed reservation
  if (upcomingBooking && ["CONFIRMED", "RESERVED"].includes((upcomingBooking.booking_status || upcomingBooking.bookingStatus || "").toUpperCase())) {
    return CHARGER_STATUSES.RESERVED;
  }

  // If heartbeat timed out and not simulated, mark OFFLINE
  if (lastHeartbeat && !online && !charger.is_simulated && rawStatus !== "CHARGING") {
    return CHARGER_STATUSES.OFFLINE;
  }

  // Otherwise return valid normalized status or fallback to UNKNOWN
  if (Object.values(CHARGER_STATUSES).includes(rawStatus)) {
    return rawStatus;
  }

  return CHARGER_STATUSES.AVAILABLE;
};

/**
 * Map OCPP 2.0.1 StatusNotification statuses to internal database charger statuses
 */
export const mapOcppStatusToDb = (ocppStatus) => {
  if (!ocppStatus) return CHARGER_STATUSES.UNKNOWN;
  const s = String(ocppStatus).trim();

  switch (s.toLowerCase()) {
    case "available":
      return CHARGER_STATUSES.AVAILABLE;
    case "charging":
    case "suspendedev":
    case "suspendedevse":
      return CHARGER_STATUSES.CHARGING;
    case "reserved":
      return CHARGER_STATUSES.RESERVED;
    case "occupied":
      return CHARGER_STATUSES.OCCUPIED;
    case "faulted":
      return CHARGER_STATUSES.FAULTED;
    case "unavailable":
      return CHARGER_STATUSES.UNAVAILABLE;
    case "offline":
      return CHARGER_STATUSES.OFFLINE;
    default:
      return CHARGER_STATUSES.UNKNOWN;
  }
};

/**
 * Record an action to the audit_logs table safely
 */
export const recordAuditLog = async (queryFnOrParams, maybeParams = null) => {
  try {
    let queryFn;
    let params;

    if (typeof queryFnOrParams === "function") {
      queryFn = queryFnOrParams;
      params = maybeParams || {};
    } else {
      const { query: defaultQuery } = await import("../config/db.js");
      queryFn = defaultQuery;
      params = queryFnOrParams || {};
    }

    const {
      userId = null,
      userRole = "ADMIN",
      action,
      entityType,
      entityId,
      oldValue = null,
      newValue = null,
      details = null,
      ipAddress = null,
    } = params;

    // Redact sensitive patterns if passed in values or details
    const redact = (val) => {
      if (!val) return null;
      let str = typeof val === "object" ? JSON.stringify(val) : String(val);
      str = str.replace(/"password":\s*".*?"/gi, '"password":"[REDACTED]"');
      str = str.replace(/"token":\s*".*?"/gi, '"token":"[REDACTED]"');
      str = str.replace(/"secret":\s*".*?"/gi, '"secret":"[REDACTED]"');
      return str;
    };

    await queryFn(
      `INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, old_value, new_value, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userRole,
        action,
        entityType,
        entityId || null,
        redact(oldValue),
        redact(newValue),
        redact(details),
        ipAddress || "127.0.0.1",
      ]
    );
  } catch (err) {
    console.warn("⚠️ Failed to record audit log:", err.message);
  }
};

export default {
  OWNER_STATUSES,
  STATION_APPROVAL_STATUSES,
  CHARGER_STATUSES,
  SESSION_STATUSES,
  PAYMENT_STATUSES,
  isChargerOnline,
  deriveChargerStatus,
  mapOcppStatusToDb,
  recordAuditLog,
};
