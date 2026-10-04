import { query, transaction } from "../config/db.js";

/**
 * Fetch Reservation Policy for a station (with fallback to global policy)
 */
export async function getReservationPolicy(stationId = null) {
  try {
    let sql = "SELECT * FROM reservation_policies WHERE station_id = ? LIMIT 1";
    let rows = stationId ? await query(sql, [stationId]) : [];

    if (!rows || rows.length === 0) {
      // Fallback to global policy
      rows = await query("SELECT * FROM reservation_policies WHERE station_id IS NULL OR station_id = 0 LIMIT 1");
    }

    if (rows && rows.length > 0) {
      return {
        id: rows[0].id,
        stationId: rows[0].station_id,
        protectionMinutes: parseInt(rows[0].protection_minutes ?? 10, 10),
        gracePeriodMinutes: parseInt(rows[0].grace_period_minutes ?? 10, 10),
        queueTimeoutMinutes: parseInt(rows[0].queue_timeout_minutes ?? 5, 10),
        maxAdvanceDays: parseInt(rows[0].max_advance_days ?? 7, 10),
        maxDurationHours: parseInt(rows[0].max_duration_hours ?? 4, 10),
        cancellationWindowMins: parseInt(rows[0].cancellation_window_mins ?? 15, 10),
        noShowPenaltyPct: parseInt(rows[0].no_show_penalty_pct ?? 20, 10),
        autoAssignQueue: Boolean(rows[0].auto_assign_queue ?? true),
        allowOfflineBooking: Boolean(rows[0].allow_offline_booking ?? true),
      };
    }
  } catch (err) {
    console.warn("getReservationPolicy warning:", err.message);
  }

  // Safe hardcoded defaults
  return {
    protectionMinutes: 10,
    gracePeriodMinutes: 10,
    queueTimeoutMinutes: 5,
    maxAdvanceDays: 7,
    maxDurationHours: 4,
    cancellationWindowMins: 15,
    noShowPenaltyPct: 20,
    autoAssignQueue: true,
    allowOfflineBooking: true,
  };
}

/**
 * Record an audit log into MySQL database
 */
export async function recordAuditLog({
  userId = null,
  operatorId = null,
  stationId = null,
  chargerId = null,
  slotId = null,
  bookingId = null,
  action,
  previousStatus = null,
  newStatus = null,
  reason = null,
  details = null,
}) {
  try {
    const logId = `AUD_${Date.now().toString(36).toUpperCase()}_${Math.floor(Math.random() * 1000)}`;
    const detailsJson = details ? JSON.stringify(details) : null;

    await query(
      `INSERT INTO audit_logs 
       (log_id, user_id, operator_id, station_id, charger_id, slot_id, booking_id, action, previous_status, new_status, reason, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        userId,
        operatorId,
        stationId,
        chargerId || (slotId ? `CHG${String(slotId).padStart(4, "0")}` : null),
        slotId,
        bookingId,
        action,
        previousStatus,
        newStatus,
        reason,
        detailsJson,
      ]
    );
    return logId;
  } catch (err) {
    console.warn("recordAuditLog warning:", err.message);
    return null;
  }
}

/**
 * Convert HH:MM or HH:MM:SS to total minutes from midnight
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.toString().split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Convert total minutes to HH:MM:SS string
 */
export function minutesToTime(mins) {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/**
 * Calculate current server time in minutes & ISO date string
 */
export function getServerTimeContext() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  return { now, dateStr, currentMinutes, timeStr };
}

/**
 * Core Conflict Detection Engine
 * Evaluates whether a requested charger/slot is available or protected by an online reservation
 */
export async function checkChargerConflict({
  stationId,
  chargerId = null,
  slotId = null,
  requestedDate = null,
  requestedStartTime = null,
  requestedEndTime = null,
  durationMinutes = 45,
  customerType = "OFFLINE", // "ONLINE" or "OFFLINE"
  bookingId = null,
}) {
  const { dateStr: today, currentMinutes, timeStr: nowTimeStr } = getServerTimeContext();
  const targetDate = requestedDate || today;
  const targetStartTime = requestedStartTime || nowTimeStr;
  const duration = parseFloat(durationMinutes) || 45;

  let resolvedSlotId = slotId;
  if (!resolvedSlotId && chargerId) {
    const parsed = parseInt(String(chargerId).replace(/\D/g, ""), 10);
    if (!isNaN(parsed)) resolvedSlotId = parsed;
  }

  // 1. Fetch Slot Record
  const slotRows = await query("SELECT * FROM charging_slots WHERE id = ? AND station_id = ?", [
    resolvedSlotId,
    stationId,
  ]);

  if (!slotRows || slotRows.length === 0) {
    return {
      conflict: true,
      conflictType: "NOT_FOUND",
      message: "Charger slot not found at this station.",
      recommendedChargers: [],
    };
  }

  const slot = slotRows[0];
  const policy = await getReservationPolicy(stationId);
  const protectionMins = policy.protectionMinutes;
  const graceMins = policy.gracePeriodMinutes;

  // 2. Check Physical/Maintenance Status
  if (slot.status === "MAINTENANCE") {
    const recommended = await getRecommendedChargers(stationId, slot.id, slot.connector_type, slot.power_kw, targetDate, targetStartTime, duration);
    return {
      conflict: true,
      conflictType: "MAINTENANCE",
      message: `Charger ${slot.slot_number} is currently under maintenance.`,
      recommendedChargers: recommended,
    };
  }

  if (slot.status === "OFFLINE" || slot.status === "BLOCKED") {
    const recommended = await getRecommendedChargers(stationId, slot.id, slot.connector_type, slot.power_kw, targetDate, targetStartTime, duration);
    return {
      conflict: true,
      conflictType: "OFFLINE",
      message: `Charger ${slot.slot_number} is currently offline.`,
      recommendedChargers: recommended,
    };
  }

  const reqStartMins = timeToMinutes(targetStartTime);
  const reqEndMins = requestedEndTime ? timeToMinutes(requestedEndTime) : reqStartMins + duration;

  // 3. Fetch Existing Bookings on this slot for the target date
  let bookingQuery = `
    SELECT b.*, u.name as user_name, u.phone as user_phone, v.vehicle_number as veh_num, v.model as veh_model
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.slot_id = ? 
      AND b.booking_date = ? 
      AND b.status IN ('CONFIRMED', 'PROTECTED', 'ACTIVE', 'IN_PROGRESS', 'CHECKED_IN', 'CHARGING')
  `;
  const params = [resolvedSlotId, targetDate];

  if (bookingId) {
    bookingQuery += " AND b.booking_id != ? AND b.id != ?";
    params.push(bookingId, parseInt(bookingId, 10) || 0);
  }

  const existingBookings = await query(bookingQuery, params);

  // 4. Also check active offline bookings
  const offlineRows = await query(
    `SELECT * FROM offline_bookings 
     WHERE slot_id = ? 
       AND status IN ('CHARGING', 'PENDING', 'ACTIVE') 
       AND DATE(arrival_time) = ?`,
    [resolvedSlotId, targetDate]
  );

  // Evaluate each existing booking against the requested window
  for (const eb of existingBookings) {
    const bStartMins = timeToMinutes(eb.start_time);
    const bEndMins = eb.end_time ? timeToMinutes(eb.end_time) : bStartMins + (parseFloat(eb.duration) || 60);

    // If today, calculate exact protection and grace period boundaries
    const isToday = targetDate === today;

    // Protection Window starts `protectionMins` before booking start
    const bProtectedStartMins = Math.max(0, bStartMins - protectionMins);
    // Grace period window ends `graceMins` after booking start (if not checked in)
    const isCheckedIn = ["CHECKED_IN", "CHARGING", "IN_PROGRESS"].includes(eb.status);
    const bGraceEndMins = isCheckedIn ? bEndMins : bStartMins + graceMins;

    // Rule for Offline Arrival (e.g. at 9:55 AM for 10:00 AM booking):
    // If the offline customer requests the charger during or overlapping the protection window, BLOCK it!
    if (customerType === "OFFLINE" && isToday) {
      // Check if current time or requested start time falls inside [bProtectedStartMins, bGraceEndMins] or overlaps
      const isWithinProtection = (currentMinutes >= bProtectedStartMins && currentMinutes <= bGraceEndMins);
      const isOverlap = !(reqEndMins <= bProtectedStartMins || reqStartMins >= bEndMins);

      if (isWithinProtection || isOverlap) {
        const timeUntilStart = bStartMins - currentMinutes;
        const customerName = eb.customer_name || eb.user_name || "Online EV Customer";
        const vehicleNum = eb.vehicle_number || eb.veh_num || "N/A";

        const recommended = await getRecommendedChargers(
          stationId,
          slot.id,
          slot.connector_type,
          slot.power_kw,
          targetDate,
          targetStartTime,
          duration
        );

        // Calculate grace period remaining if start time has passed
        let graceRemaining = 0;
        if (currentMinutes >= bStartMins && !isCheckedIn) {
          graceRemaining = Math.max(0, bStartMins + graceMins - currentMinutes);
        }

        return {
          conflict: true,
          conflictType: "PROTECTED_ONLINE_RESERVATION",
          message: `Charger ${slot.slot_number} is protected for an online booking at ${eb.start_time.slice(0, 5)}.`,
          reservationDetails: {
            bookingId: eb.booking_id,
            customerName,
            customerPhone: eb.customer_phone || eb.user_phone || "",
            vehicleNumber: vehicleNum,
            vehicleModel: eb.veh_model || "EV",
            reservedTime: `${eb.start_time.slice(0, 5)} - ${(eb.end_time || "").slice(0, 5)}`,
            startTime: eb.start_time,
            endTime: eb.end_time,
            status: eb.status,
            protectionMinutes: protectionMins,
            gracePeriodMinutes: graceMins,
            timeUntilStartMinutes: Math.max(0, timeUntilStart),
            graceRemainingMinutes: graceRemaining,
            isCheckedIn,
          },
          recommendedChargers: recommended,
        };
      }
    }

    // Rule for Online Booking (standard interval overlap check with protection window):
    if (customerType === "ONLINE") {
      const overlap = !(reqEndMins <= bProtectedStartMins || reqStartMins >= bEndMins);
      if (overlap) {
        const recommended = await getRecommendedChargers(
          stationId,
          slot.id,
          slot.connector_type,
          slot.power_kw,
          targetDate,
          targetStartTime,
          duration
        );

        return {
          conflict: true,
          conflictType: "OVERLAPPING_RESERVATION",
          message: `Charger ${slot.slot_number} is reserved from ${eb.start_time.slice(0, 5)} to ${(eb.end_time || "").slice(0, 5)}.`,
          reservationDetails: {
            bookingId: eb.booking_id,
            startTime: eb.start_time,
            endTime: eb.end_time,
          },
          recommendedChargers: recommended,
        };
      }
    }
  }

  // Check ongoing offline charging session
  for (const off of offlineRows) {
    const offStartMins = timeToMinutes(off.arrival_time ? new Date(off.arrival_time).toTimeString().slice(0, 8) : "10:00:00");
    const offEndMins = offStartMins + (off.duration_minutes || 45);
    const overlap = !(reqEndMins <= offStartMins || reqStartMins >= offEndMins);

    if (overlap) {
      const recommended = await getRecommendedChargers(
        stationId,
        slot.id,
        slot.connector_type,
        slot.power_kw,
        targetDate,
        targetStartTime,
        duration
      );
      return {
        conflict: true,
        conflictType: "OCCUPIED_OFFLINE_SESSION",
        message: `Charger ${slot.slot_number} is currently charging offline vehicle ${off.vehicle_number}.`,
        reservationDetails: {
          offlineBookingId: off.offline_booking_id,
          customerName: off.customer_name,
          vehicleNumber: off.vehicle_number,
          durationMinutes: off.duration_minutes,
        },
        recommendedChargers: recommended,
      };
    }
  }

  // No conflict detected! Charger is available.
  return {
    conflict: false,
    conflictType: null,
    message: `Charger ${slot.slot_number} is available for the requested time.`,
    slot: {
      id: slot.id,
      slotNumber: slot.slot_number,
      connectorType: slot.connector_type,
      chargerType: slot.charger_type,
      powerKw: parseFloat(slot.power_kw),
      pricePerKwh: parseFloat(slot.price_per_kwh),
      status: "AVAILABLE",
    },
  };
}

/**
 * Smart Alternative Charger Recommendation Engine
 * Finds available chargers at the same station, ranking by compatibility & power
 */
export async function getRecommendedChargers(
  stationId,
  preferredSlotId = null,
  targetConnectorType = "CCS2",
  targetPowerKw = 50,
  date = null,
  startTime = null,
  durationMinutes = 45
) {
  const { dateStr: today, currentMinutes, timeStr: nowTimeStr } = getServerTimeContext();
  const targetDate = date || today;
  const targetStartTime = startTime || nowTimeStr;
  const duration = parseFloat(durationMinutes) || 45;

  const allSlots = await query(
    "SELECT * FROM charging_slots WHERE station_id = ? AND status != 'MAINTENANCE' ORDER BY power_kw DESC",
    [stationId]
  );

  const policy = await getReservationPolicy(stationId);
  const protectionMins = policy.protectionMinutes;
  const reqStartMins = timeToMinutes(targetStartTime);
  const reqEndMins = reqStartMins + duration;

  const candidates = [];

  for (const s of allSlots) {
    if (preferredSlotId && s.id === preferredSlotId) continue;

    // Check active online bookings for this candidate slot
    const [bookings] = await query(
      `SELECT start_time, end_time, status, duration 
       FROM bookings 
       WHERE slot_id = ? 
         AND booking_date = ? 
         AND status IN ('CONFIRMED', 'PROTECTED', 'ACTIVE', 'IN_PROGRESS', 'CHECKED_IN', 'CHARGING')`,
      [s.id, targetDate]
    );

    let isBusy = false;
    let nextAvailableMins = reqStartMins;

    for (const b of bookings || []) {
      const bStart = timeToMinutes(b.start_time);
      const bEnd = b.end_time ? timeToMinutes(b.end_time) : bStart + (parseFloat(b.duration) || 60);
      const bProtStart = Math.max(0, bStart - protectionMins);

      if (!(reqEndMins <= bProtStart || reqStartMins >= bEnd)) {
        isBusy = true;
        if (bEnd > nextAvailableMins) nextAvailableMins = bEnd;
      }
    }

    // Check if slot itself is occupied or charging
    if (s.status === "OCCUPIED" || s.status === "CHARGING") {
      isBusy = true;
      if (nextAvailableMins <= reqStartMins) {
        nextAvailableMins = currentMinutes + 25; // Estimate 25 mins
      }
    }

    const isConnectorMatch =
      !targetConnectorType ||
      s.connector_type.toLowerCase() === targetConnectorType.toLowerCase() ||
      (targetConnectorType.includes("CCS") && s.connector_type.includes("CCS")) ||
      (targetConnectorType.includes("Type") && s.connector_type.includes("Type"));

    let waitTimeMinutes = isBusy ? Math.max(0, nextAvailableMins - currentMinutes) : 0;
    let statusLabel = isBusy ? (waitTimeMinutes > 0 ? `Available at ${minutesToTime(nextAvailableMins).slice(0, 5)}` : "Busy") : "Available";

    candidates.push({
      id: s.id,
      slotId: s.id,
      chargerId: `CHG${String(s.id).padStart(4, "0")}`,
      slotNumber: s.slot_number,
      bayNumber: s.bay_number || s.slot_number,
      connectorType: s.connector_type || "CCS2",
      chargerType: s.charger_type || (s.power_kw >= 30 ? "DC_FAST" : "AC"),
      powerKw: parseFloat(s.power_kw) || 50.0,
      pricePerKwh: parseFloat(s.price_per_kwh) || 18.0,
      isAvailable: !isBusy,
      status: isBusy ? "RESERVED" : "AVAILABLE",
      statusLabel,
      estimatedWaitMinutes: waitTimeMinutes,
      availableAt: isBusy ? minutesToTime(nextAvailableMins).slice(0, 5) : "Immediate",
      isConnectorMatch,
      priorityScore: (isBusy ? 0 : 100) + (isConnectorMatch ? 50 : 0) + (parseFloat(s.power_kw) || 0),
    });
  }

  // Sort by highest priority: Available first, then connector match, then power
  candidates.sort((a, b) => b.priorityScore - a.priorityScore);
  return candidates;
}

/**
 * Automatic Evaluator for State Transitions & No-Show Engine
 * Runs on-access or periodically to ensure all bookings and chargers reflect authoritative server time
 */
export async function evaluateStationStateTransitions(stationId = null) {
  const { dateStr: today, currentMinutes, timeStr: nowTimeStr } = getServerTimeContext();
  const policy = await getReservationPolicy(stationId);
  const protectionMins = policy.protectionMinutes;
  const graceMins = policy.gracePeriodMinutes;

  try {
    // 1. Fetch all pending/confirmed bookings for today
    let sql = `
      SELECT b.*, s.station_name, cs.slot_number 
      FROM bookings b
      JOIN charging_stations s ON b.station_id = s.id
      LEFT JOIN charging_slots cs ON b.slot_id = cs.id
      WHERE b.booking_date = ? 
        AND b.status IN ('CONFIRMED', 'PROTECTED', 'ACTIVE')
    `;
    const params = [today];
    if (stationId) {
      sql += " AND b.station_id = ?";
      params.push(stationId);
    }

    const bookings = await query(sql, params);

    for (const b of bookings) {
      const bStartMins = timeToMinutes(b.start_time);
      const bProtStartMins = Math.max(0, bStartMins - protectionMins);
      const bGraceEndMins = bStartMins + graceMins;
      const bEndMins = b.end_time ? timeToMinutes(b.end_time) : bStartMins + 60;

      // CASE A: Inside Protection Window (e.g. 9:50 AM to 10:00 AM)
      if (currentMinutes >= bProtStartMins && currentMinutes < bStartMins) {
        if (b.status === "CONFIRMED") {
          await query("UPDATE bookings SET status = 'PROTECTED' WHERE id = ?", [b.id]);
          if (b.slot_id) {
            await query("UPDATE charging_slots SET status = 'PROTECTED', current_booking_id = ? WHERE id = ?", [b.booking_id, b.slot_id]);
          }
        }
      }

      // CASE B: At or Past Start Time, within Grace Period (e.g. 10:00 AM to 10:10 AM)
      else if (currentMinutes >= bStartMins && currentMinutes <= bGraceEndMins) {
        if (b.status === "CONFIRMED" || b.status === "PROTECTED") {
          await query("UPDATE bookings SET status = 'ACTIVE' WHERE id = ?", [b.id]);
          if (b.slot_id) {
            await query("UPDATE charging_slots SET status = 'PROTECTED', current_booking_id = ? WHERE id = ?", [b.booking_id, b.slot_id]);
          }
        }
      }

      // CASE C: Past Grace Period Expiration without Check-in -> NO-SHOW! (e.g. 10:10 AM+)
      else if (currentMinutes > bGraceEndMins && !b.checked_in_at) {
        if (["CONFIRMED", "PROTECTED", "ACTIVE"].includes(b.status)) {
          console.log(`⚡ AUTO NO-SHOW: Booking ${b.booking_id} expired after ${graceMins}m grace period. Releasing slot ${b.slot_id}.`);

          // 1. Mark Booking NO_SHOW
          await query("UPDATE bookings SET status = 'NO_SHOW', no_show_at = NOW() WHERE id = ?", [b.id]);

          // 2. Release Charger Slot back to AVAILABLE
          if (b.slot_id) {
            await query("UPDATE charging_slots SET status = 'AVAILABLE', current_booking_id = NULL WHERE id = ?", [b.slot_id]);
          }

          // 3. Record Audit Log
          await recordAuditLog({
            stationId: b.station_id,
            slotId: b.slot_id,
            bookingId: b.booking_id,
            action: "AUTO_NO_SHOW_RELEASE",
            previousStatus: b.status,
            newStatus: "NO_SHOW",
            reason: `Customer did not check in within the allowed ${graceMins}-minute grace period (Booking time: ${b.start_time}). Charger released to AVAILABLE.`,
          });

          // 4. Auto-assign next customer in queue if policy enables it
          if (policy.autoAssignQueue && b.slot_id) {
            await autoAssignNextInQueue(b.station_id, b.slot_id);
          }
        }
      }
    }
  } catch (err) {
    console.warn("evaluateStationStateTransitions warning:", err.message);
  }
}

/**
 * Auto-assign available charger to the next eligible customer waiting in the station queue
 */
export async function autoAssignNextInQueue(stationId, slotId) {
  try {
    // Fetch top waiting queue entry for this station
    const queueRows = await query(
      `SELECT * FROM queue_entries 
       WHERE station_id = ? 
         AND status = 'WAITING' 
       ORDER BY position ASC, id ASC LIMIT 1`,
      [stationId]
    );

    if (queueRows && queueRows.length > 0) {
      const topQueue = queueRows[0];

      // Update queue status to ASSIGNED
      await query(
        `UPDATE queue_entries 
         SET status = 'ASSIGNED', assigned_slot_id = ?, updated_at = NOW() 
         WHERE id = ?`,
        [slotId, topQueue.id]
      );

      // Create Offline Booking record for the queued customer
      const offlineId = `OFF_${Date.now().toString(36).toUpperCase()}`;
      await query(
        `INSERT INTO offline_bookings 
         (offline_booking_id, station_id, slot_id, customer_name, customer_phone, vehicle_number, vehicle_type, connector_type, duration_minutes, amount, payment_method, payment_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 350.00, 'Cash', 'PENDING', 'CHARGING')`,
        [
          offlineId,
          stationId,
          slotId,
          topQueue.customer_name,
          topQueue.customer_phone,
          topQueue.vehicle_number,
          topQueue.vehicle_type || "Car",
          topQueue.connector_type || "CCS2",
          topQueue.required_duration || 45,
        ]
      );

      // Mark slot as OCCUPIED
      await query("UPDATE charging_slots SET status = 'OCCUPIED', current_booking_id = ? WHERE id = ?", [offlineId, slotId]);

      // Audit log
      await recordAuditLog({
        stationId,
        slotId,
        bookingId: offlineId,
        action: "QUEUE_AUTO_ASSIGNMENT",
        previousStatus: "AVAILABLE",
        newStatus: "OCCUPIED",
        reason: `Auto-assigned released charger to Queued customer #${topQueue.position} (${topQueue.customer_name}, ${topQueue.vehicle_number}). Token: ${topQueue.queue_token}`,
      });

      console.log(`✅ Queue Auto-assigned: Token ${topQueue.queue_token} assigned to Slot ${slotId}`);
    }
  } catch (err) {
    console.warn("autoAssignNextInQueue notice:", err.message);
  }
}
