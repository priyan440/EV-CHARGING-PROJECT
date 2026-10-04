import { query, transaction } from "../config/db.js";
import {
  checkChargerConflict,
  getRecommendedChargers,
  evaluateStationStateTransitions,
  autoAssignNextInQueue,
  getReservationPolicy,
  recordAuditLog,
  getServerTimeContext,
  timeToMinutes,
  minutesToTime,
} from "../services/conflictEngine.js";

// Helper to generate next unique offline booking ID: OFF001, OFF002, etc.
const generateNextOfflineId = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT offline_booking_id FROM offline_bookings ORDER BY id DESC LIMIT 1"
  );
  let nextNum = 1;
  if (rows && rows.length > 0) {
    const lastId = rows[0].offline_booking_id;
    const match = lastId.match(/^OFF(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    } else {
      nextNum = rows.length + 1;
    }
  }

  let candidate = `OFF${String(nextNum).padStart(3, "0")}`;
  let exists = true;
  while (exists) {
    const [check] = await connection.execute(
      "SELECT id FROM offline_bookings WHERE offline_booking_id = ?",
      [candidate]
    );
    if (check.length === 0) {
      exists = false;
    } else {
      nextNum++;
      candidate = `OFF${String(nextNum).padStart(3, "0")}`;
    }
  }
  return candidate;
};

// Helper to generate next queue token: QUEUE-001, QUEUE-023, etc.
const generateNextQueueToken = async () => {
  const rows = await query("SELECT id FROM queue_entries ORDER BY id DESC LIMIT 1");
  const nextNum = (rows && rows.length > 0 ? rows[0].id : 0) + 1;
  return `QUEUE-${String(nextNum).padStart(3, "0")}`;
};

/**
 * POST /api/chargers/:chargerId/check-conflict
 * Check whether a charger slot has an upcoming online reservation conflict
 */
export const checkConflict = async (req, res) => {
  try {
    const { chargerId } = req.params;
    const {
      stationId,
      slotId,
      requestedDate,
      requestedStartTime,
      requestedEndTime,
      durationMinutes,
      customerType = "OFFLINE",
      bookingId,
    } = req.body;

    if (!stationId) {
      return res.status(400).json({ success: false, message: "stationId is required." });
    }

    const conflictResult = await checkChargerConflict({
      stationId: parseInt(stationId, 10),
      chargerId,
      slotId: slotId ? parseInt(slotId, 10) : null,
      requestedDate,
      requestedStartTime,
      requestedEndTime,
      durationMinutes,
      customerType,
      bookingId,
    });

    res.json({
      success: true,
      ...conflictResult,
    });
  } catch (error) {
    console.error("checkConflict error:", error);
    res.status(500).json({ success: false, message: "Error evaluating charger conflict", error: error.message });
  }
};

/**
 * POST /api/offline-bookings
 * Offline Customer Arrival & Check-In Workflow
 */
export const createOfflineBooking = async (req, res) => {
  try {
    const operatorId = req.user?.id || null;
    const {
      customerName,
      customerPhone,
      vehicleNumber,
      vehicleType = "Car",
      connectorType = "CCS2",
      chargingType = "DC Fast Charging",
      durationMinutes = 45,
      stationId,
      slotId,
      chargerId,
      paymentMethod = "Cash",
      paymentStatus = "PAID",
      amount,
      forceOverride = false,
      overrideReason = null,
    } = req.body;

    if (!customerName || !customerPhone || !vehicleNumber || !stationId || (!slotId && !chargerId)) {
      return res.status(400).json({
        success: false,
        message: "Customer Name, Mobile Number, Vehicle Number, Station, and Preferred Charger are required.",
      });
    }

    const parsedStationId = parseInt(stationId, 10);
    const resolvedSlotId = slotId ? parseInt(slotId, 10) : parseInt(String(chargerId).replace(/\D/g, ""), 10);

    // 1. Conflict Check (unless explicitly overridden by admin/owner)
    if (!forceOverride) {
      const conflictCheck = await checkChargerConflict({
        stationId: parsedStationId,
        slotId: resolvedSlotId,
        customerType: "OFFLINE",
        durationMinutes: parseInt(durationMinutes, 10),
      });

      if (conflictCheck.conflict) {
        // Record conflict detection in audit log
        await recordAuditLog({
          operatorId,
          stationId: parsedStationId,
          slotId: resolvedSlotId,
          action: "OFFLINE_ASSIGNMENT_ATTEMPT_BLOCKED",
          reason: `Conflict with online booking ${conflictCheck.reservationDetails?.bookingId || ""}. Protected arrival window.`,
          details: conflictCheck,
        });

        return res.status(409).json({
          success: false,
          conflict: true,
          conflictType: conflictCheck.conflictType,
          message: conflictCheck.message,
          reservationDetails: conflictCheck.reservationDetails,
          recommendedChargers: conflictCheck.recommendedChargers,
        });
      }
    }

    // 2. Fetch slot details
    const [slotRows] = await query("SELECT * FROM charging_slots WHERE id = ? AND station_id = ?", [
      resolvedSlotId,
      parsedStationId,
    ]);

    if (!slotRows || slotRows.length === 0) {
      return res.status(404).json({ success: false, message: "Charger slot not found." });
    }

    const slot = slotRows[0];
    const powerKw = parseFloat(slot.power_kw) || 50.0;
    const pricePerKwh = parseFloat(slot.price_per_kwh) || 18.0;

    // Calculate billing amount if not provided
    const durMins = parseInt(durationMinutes, 10) || 45;
    const energyEstimate = (powerKw * (durMins / 60) * 0.85); // 85% average load factor
    const calculatedAmount = amount ? parseFloat(amount) : Math.round((energyEstimate * pricePerKwh + 20) * 1.18 * 100) / 100;

    // 3. Database Transaction to insert offline booking & update slot
    const offlineRecord = await transaction(async (connection) => {
      const offlineId = await generateNextOfflineId(connection);

      const [insertRes] = await connection.execute(
        `INSERT INTO offline_bookings 
         (offline_booking_id, station_id, slot_id, customer_name, customer_phone, vehicle_number, vehicle_type, connector_type, charging_type, power_kw, duration_minutes, amount, payment_method, payment_status, operator_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CHARGING')`,
        [
          offlineId,
          parsedStationId,
          resolvedSlotId,
          customerName.trim(),
          customerPhone.trim(),
          vehicleNumber.trim().toUpperCase(),
          vehicleType,
          slot.connector_type || connectorType,
          slot.charger_type === "AC" ? "AC Charging" : "DC Fast Charging",
          powerKw,
          durMins,
          calculatedAmount,
          paymentMethod,
          paymentStatus,
          operatorId,
        ]
      );

      // Update Slot state to CHARGING
      await connection.execute(
        "UPDATE charging_slots SET status = 'CHARGING', current_booking_id = ? WHERE id = ?",
        [offlineId, resolvedSlotId]
      );

      // Record audit log
      await connection.execute(
        `INSERT INTO audit_logs 
         (log_id, operator_id, station_id, charger_id, slot_id, booking_id, action, previous_status, new_status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUD_${Date.now().toString(36).toUpperCase()}`,
          operatorId,
          parsedStationId,
          `CHG${String(resolvedSlotId).padStart(4, "0")}`,
          resolvedSlotId,
          offlineId,
          forceOverride ? "OFFLINE_OVERRIDE_ASSIGNMENT" : "OFFLINE_CUSTOMER_ASSIGNED",
          slot.status,
          "CHARGING",
          forceOverride ? `Manual Override by Operator: ${overrideReason || "Emergency"}` : "Direct offline check-in with verified available charger",
        ]
      );

      return {
        id: insertRes.insertId,
        offlineBookingId: offlineId,
        stationId: parsedStationId,
        slotId: resolvedSlotId,
        customerName,
        customerPhone,
        vehicleNumber: vehicleNumber.toUpperCase(),
        vehicleType,
        connectorType: slot.connector_type || connectorType,
        powerKw,
        durationMinutes: durMins,
        amount: calculatedAmount,
        paymentMethod,
        paymentStatus,
        status: "CHARGING",
        arrivalTime: new Date().toISOString(),
      };
    });

    res.status(201).json({
      success: true,
      message: `Offline customer checked in successfully! Assigned Charger: ${slot.slot_number} (${offlineRecord.offlineBookingId})`,
      data: offlineRecord,
      booking: offlineRecord,
    });
  } catch (error) {
    console.error("createOfflineBooking error:", error);
    res.status(500).json({ success: false, message: "Failed to create offline booking", error: error.message });
  }
};

/**
 * GET /api/stations/:stationId/live-status
 * Comprehensive Live Station Control Center Data (Charger Grid, KPIs, Active Sessions, Queue)
 */
export const getStationLiveStatus = async (req, res) => {
  try {
    const { stationId } = req.params;

    // Prefer Control Center Snapshot if available
    try {
      const { getOwnerControlCenterSnapshot } = await import("./ownerController.js");
      return await getOwnerControlCenterSnapshot(req, res);
    } catch (snapshotErr) {
      console.warn("Control Center Snapshot fallback:", snapshotErr.message);
    }

    const parsedStationId = parseInt(stationId, 10);
    if (isNaN(parsedStationId)) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }

    // 1. Run authoritative server-time state transition & no-show evaluator
    await evaluateStationStateTransitions(parsedStationId);

    const { dateStr: today, currentMinutes } = getServerTimeContext();
    const policy = await getReservationPolicy(parsedStationId);

    // 2. Fetch Station Record
    const [stationRows] = await query("SELECT * FROM charging_stations WHERE id = ?", [parsedStationId]);
    if (!stationRows || stationRows.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }
    const station = stationRows[0];

    // 3. Fetch all chargers / slots for this station
    const slots = await query(
      "SELECT * FROM charging_slots WHERE station_id = ? ORDER BY id ASC",
      [parsedStationId]
    );

    // 4. Fetch today's online bookings
    const bookings = await query(
      `SELECT b.*, u.name as user_name, u.phone as user_phone, u.email as user_email,
              v.vehicle_number as veh_num, v.brand as veh_brand, v.model as veh_model,
              cs.slot_number
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN charging_slots cs ON b.slot_id = cs.id
       WHERE b.station_id = ? AND b.booking_date = ?
       ORDER BY b.start_time ASC`,
      [parsedStationId, today]
    );

    // 5. Fetch active offline bookings for today
    const offlineBookings = await query(
      `SELECT ob.*, cs.slot_number 
       FROM offline_bookings ob
       LEFT JOIN charging_slots cs ON ob.slot_id = cs.id
       WHERE ob.station_id = ? AND DATE(ob.arrival_time) = ?
       ORDER BY ob.id DESC`,
      [parsedStationId, today]
    );

    // 6. Fetch waiting queue entries
    const queueEntries = await query(
      `SELECT * FROM queue_entries 
       WHERE station_id = ? AND status IN ('WAITING', 'NOTIFIED', 'ASSIGNED')
       ORDER BY position ASC, id ASC`,
      [parsedStationId]
    );

    // 7. Enrich each charger in the grid with live state, current occupant/reservation, and time remaining
    const chargerGrid = slots.map((slot) => {
      // Find active or upcoming booking on this slot
      const currentBooking = bookings.find(
        (b) => b.slot_id === slot.id && ["CHECKED_IN", "CHARGING", "IN_PROGRESS", "ACTIVE", "PROTECTED"].includes(b.status)
      );

      const upcomingBooking = bookings.find(
        (b) => b.slot_id === slot.id && b.status === "CONFIRMED" && timeToMinutes(b.start_time) > currentMinutes
      );

      const activeOffline = offlineBookings.find(
        (ob) => ob.slot_id === slot.id && ob.status === "CHARGING"
      );

      // Determine precise real-time status
      let liveStatus = slot.status || "AVAILABLE";
      let occupant = null;
      let timeRemainingMinutes = 0;
      let badgeLabel = "Available";

      if (slot.status === "MAINTENANCE") {
        liveStatus = "MAINTENANCE";
        badgeLabel = "Maintenance";
      } else if (activeOffline) {
        liveStatus = "CHARGING";
        badgeLabel = "Charging (Offline)";
        const startMins = timeToMinutes(new Date(activeOffline.arrival_time).toTimeString().slice(0, 8));
        const elapsed = Math.max(0, currentMinutes - startMins);
        timeRemainingMinutes = Math.max(0, (activeOffline.duration_minutes || 45) - elapsed);
        occupant = {
          type: "OFFLINE",
          bookingId: activeOffline.offline_booking_id,
          customerName: activeOffline.customer_name,
          vehicleNumber: activeOffline.vehicle_number,
          powerKw: activeOffline.power_kw,
          startTime: new Date(activeOffline.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          duration: activeOffline.duration_minutes,
          timeRemainingMinutes,
        };
      } else if (currentBooking) {
        const bStartMins = timeToMinutes(currentBooking.start_time);
        const bEndMins = currentBooking.end_time ? timeToMinutes(currentBooking.end_time) : bStartMins + 60;

        if (["CHECKED_IN", "CHARGING", "IN_PROGRESS"].includes(currentBooking.status)) {
          liveStatus = "CHARGING";
          badgeLabel = "Charging (Online)";
          timeRemainingMinutes = Math.max(0, bEndMins - currentMinutes);
        } else if (currentBooking.status === "ACTIVE") {
          liveStatus = "PROTECTED";
          badgeLabel = "Active Grace Window";
          timeRemainingMinutes = Math.max(0, bStartMins + policy.gracePeriodMinutes - currentMinutes);
        } else if (currentBooking.status === "PROTECTED") {
          liveStatus = "PROTECTED";
          badgeLabel = "Protected Reservation";
          timeRemainingMinutes = Math.max(0, bStartMins - currentMinutes);
        }

        occupant = {
          type: "ONLINE",
          bookingId: currentBooking.booking_id,
          customerName: currentBooking.customer_name || currentBooking.user_name || "Online EV User",
          vehicleNumber: currentBooking.vehicle_number || currentBooking.veh_num || "N/A",
          vehicleModel: currentBooking.veh_model || "EV",
          startTime: currentBooking.start_time,
          endTime: currentBooking.end_time,
          status: currentBooking.status,
          timeRemainingMinutes,
          qrToken: currentBooking.qr_token,
        };
      } else if (upcomingBooking) {
        const bStartMins = timeToMinutes(upcomingBooking.start_time);
        if (bStartMins - currentMinutes <= policy.protectionMinutes) {
          liveStatus = "PROTECTED";
          badgeLabel = `Protected (${upcomingBooking.start_time.slice(0, 5)})`;
        } else {
          liveStatus = "RESERVED";
          badgeLabel = `Reserved at ${upcomingBooking.start_time.slice(0, 5)}`;
        }
        occupant = {
          type: "UPCOMING",
          bookingId: upcomingBooking.booking_id,
          customerName: upcomingBooking.user_name || "Online EV User",
          vehicleNumber: upcomingBooking.veh_num || "N/A",
          startTime: upcomingBooking.start_time,
          endTime: upcomingBooking.end_time,
          timeUntilMinutes: Math.max(0, bStartMins - currentMinutes),
        };
      }

      return {
        id: slot.id,
        slotId: slot.id,
        chargerId: `CHG${String(slot.id).padStart(4, "0")}`,
        slotNumber: slot.slot_number,
        bayNumber: slot.bay_number || slot.slot_number,
        connectorType: slot.connector_type || "CCS2",
        chargerType: slot.charger_type || (slot.power_kw >= 30 ? "DC_FAST" : "AC"),
        powerKw: parseFloat(slot.power_kw) || 50.0,
        pricePerKwh: parseFloat(slot.price_per_kwh) || 18.0,
        status: liveStatus,
        badgeLabel,
        timeRemainingMinutes,
        occupant,
        lastStatusChange: slot.last_status_change,
      };
    });

    // 8. Aggregate Live Metrics for Monitor Card
    const totalChargers = chargerGrid.length;
    const availableCount = chargerGrid.filter((c) => c.status === "AVAILABLE").length;
    const reservedCount = chargerGrid.filter((c) => c.status === "RESERVED").length;
    const protectedCount = chargerGrid.filter((c) => c.status === "PROTECTED").length;
    const chargingCount = chargerGrid.filter((c) => c.status === "CHARGING").length;
    const occupiedCount = chargerGrid.filter((c) => c.status === "OCCUPIED").length;
    const maintenanceCount = chargerGrid.filter((c) => c.status === "MAINTENANCE").length;

    const upcomingReservationsCount = bookings.filter((b) => ["CONFIRMED", "PROTECTED"].includes(b.status)).length;
    const activeChargingCount = chargingCount + occupiedCount;
    const offlineArrivalsToday = offlineBookings.length;
    const noShowsToday = bookings.filter((b) => b.status === "NO_SHOW").length;

    // Count conflicts detected from audit logs today
    const [conflictLogs] = await query(
      `SELECT COUNT(*) as count FROM audit_logs 
       WHERE station_id = ? 
         AND action LIKE '%CONFLICT%' 
         AND DATE(timestamp) = ?`,
      [parsedStationId, today]
    );
    const conflictsDetectedToday = conflictLogs?.count || 0;

    res.json({
      success: true,
      station: {
        id: station.id,
        name: station.station_name,
        address: station.address,
        city: station.city,
        maxPower: parseFloat(station.max_power) || 120.0,
        policy,
      },
      metrics: {
        totalChargers,
        availableCount,
        reservedCount,
        protectedCount,
        chargingCount,
        occupiedCount,
        maintenanceCount,
        upcomingReservationsCount,
        activeChargingCount,
        offlineArrivalsToday,
        conflictsDetectedToday,
        noShowsToday,
        queueWaitingCount: queueEntries.length,
      },
      chargerGrid,
      bookings: bookings.map((b) => ({
        id: b.id,
        bookingId: b.booking_id,
        customerName: b.user_name || b.customer_name || "EV User",
        phone: b.user_phone || b.customer_phone || "",
        vehicleNumber: b.veh_num || b.vehicle_number || "N/A",
        slotNumber: b.slot_number || "C01",
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.status,
        amount: b.amount,
        checkedInAt: b.checked_in_at,
        qrToken: b.qr_token || `QR_${b.booking_id}`,
      })),
      offlineBookings,
      queue: queueEntries,
      policy,
    });
  } catch (error) {
    console.error("getStationLiveStatus error:", error);
    res.status(500).json({ success: false, message: "Error fetching station live status", error: error.message });
  }
};

/**
 * POST /api/bookings/:bookingId/check-in
 * Online Customer Check-In via QR Code Scan or Manual Verification
 */
export const checkInBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { qrToken, checkInToken, operatorId } = req.body;
    const { dateStr: today, currentMinutes } = getServerTimeContext();

    const isNumeric = /^\d+$/.test(bookingId);
    const [bookingRows] = await query(
      `SELECT b.*, s.station_name, cs.slot_number 
       FROM bookings b
       JOIN charging_stations s ON b.station_id = s.id
       LEFT JOIN charging_slots cs ON b.slot_id = cs.id
       WHERE (b.booking_id = ? OR b.id = ?)`,
      [bookingId.toUpperCase(), isNumeric ? parseInt(bookingId, 10) : 0]
    );

    if (!bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: `Booking "${bookingId}" not found.` });
    }

    const booking = bookingRows[0];

    // 1. Validation checks
    if (booking.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Cannot check in: This booking was cancelled." });
    }
    if (booking.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Cannot check in: Charging session already completed." });
    }
    if (booking.status === "NO_SHOW") {
      return res.status(400).json({
        success: false,
        message: "Check-in expired: Reservation was marked NO-SHOW after the grace period ended.",
      });
    }

    // 2. Token verification if provided
    if (qrToken && booking.qr_token && qrToken !== booking.qr_token && !qrToken.includes(booking.booking_id)) {
      return res.status(401).json({ success: false, message: "Invalid QR Check-In Token." });
    }

    const policy = await getReservationPolicy(booking.station_id);
    const bStartMins = timeToMinutes(booking.start_time);
    const earlyLimitMins = Math.max(0, bStartMins - policy.protectionMinutes);
    const lateLimitMins = bStartMins + policy.gracePeriodMinutes;

    // Check time validity (allow check-in within protection window or grace window)
    const isToday = booking.booking_date ? new Date(booking.booking_date).toISOString().split("T")[0] === today : true;
    if (isToday) {
      if (currentMinutes < earlyLimitMins) {
        return res.status(400).json({
          success: false,
          message: `Check-in opens ${policy.protectionMinutes} minutes before booking start time (${minutesToTime(earlyLimitMins).slice(0, 5)}).`,
        });
      }
    }

    // 3. Update Database State
    await transaction(async (connection) => {
      // Mark Booking CHECKED_IN
      await connection.execute(
        "UPDATE bookings SET status = 'CHECKED_IN', checked_in_at = NOW() WHERE id = ?",
        [booking.id]
      );

      // Update Slot to OCCUPIED / CHARGING
      if (booking.slot_id) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'CHARGING', current_booking_id = ? WHERE id = ?",
          [booking.booking_id, booking.slot_id]
        );
      }

      // Record Audit Log
      await connection.execute(
        `INSERT INTO audit_logs 
         (log_id, user_id, operator_id, station_id, charger_id, slot_id, booking_id, action, previous_status, new_status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUD_${Date.now().toString(36).toUpperCase()}`,
          booking.user_id,
          operatorId || null,
          booking.station_id,
          `CHG${String(booking.slot_id).padStart(4, "0")}`,
          booking.slot_id,
          booking.booking_id,
          "CUSTOMER_CHECKED_IN",
          booking.status,
          "CHECKED_IN",
          `Customer successfully scanned QR & checked in for slot ${booking.slot_number || booking.slot_id}`,
        ]
      );
    });

    res.json({
      success: true,
      message: `Check-in confirmed for ${booking.booking_id}! Charger ${booking.slot_number || "assigned bay"} is ready.`,
      bookingId: booking.booking_id,
      status: "CHECKED_IN",
      checkedInAt: new Date().toISOString(),
      slotNumber: booking.slot_number,
    });
  } catch (error) {
    console.error("checkInBooking error:", error);
    res.status(500).json({ success: false, message: "Error processing check-in", error: error.message });
  }
};

/**
 * POST /api/bookings/:bookingId/no-show
 * Trigger No-Show and release charger slot
 */
export const markBookingNoShow = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const operatorId = req.user?.id || null;
    const { reason = "Customer did not arrive within grace period" } = req.body;

    const isNumeric = /^\d+$/.test(bookingId);
    const [bookingRows] = await query(
      "SELECT * FROM bookings WHERE booking_id = ? OR id = ?",
      [bookingId.toUpperCase(), isNumeric ? parseInt(bookingId, 10) : 0]
    );

    if (!bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = bookingRows[0];

    await transaction(async (connection) => {
      // 1. Update Booking status to NO_SHOW
      await connection.execute(
        "UPDATE bookings SET status = 'NO_SHOW', no_show_at = NOW() WHERE id = ?",
        [booking.id]
      );

      // 2. Release Charger Slot back to AVAILABLE
      if (booking.slot_id) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'AVAILABLE', current_booking_id = NULL WHERE id = ?",
          [booking.slot_id]
        );
      }

      // 3. Record Audit Log
      await connection.execute(
        `INSERT INTO audit_logs 
         (log_id, user_id, operator_id, station_id, charger_id, slot_id, booking_id, action, previous_status, new_status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUD_${Date.now().toString(36).toUpperCase()}`,
          booking.user_id,
          operatorId,
          booking.station_id,
          `CHG${String(booking.slot_id).padStart(4, "0")}`,
          booking.slot_id,
          booking.booking_id,
          "MANUAL_NO_SHOW_RELEASE",
          booking.status,
          "NO_SHOW",
          reason,
        ]
      );
    });

    // Auto assign queue if waiting
    if (booking.slot_id) {
      await autoAssignNextInQueue(booking.station_id, booking.slot_id);
    }

    res.json({
      success: true,
      message: `Booking ${booking.booking_id} marked as NO-SHOW. Charger released to AVAILABLE.`,
      bookingId: booking.booking_id,
      status: "NO_SHOW",
    });
  } catch (error) {
    console.error("markBookingNoShow error:", error);
    res.status(500).json({ success: false, message: "Error marking no-show", error: error.message });
  }
};

/**
 * POST /api/bookings/:bookingId/override
 * Manual Reservation Override with Mandatory Reason and Audit Logging
 */
export const manualOverrideBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const operatorId = req.user?.id || null;
    const { reason, actionType = "OVERRIDE_CANCEL", newStatus = "CANCELLED" } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "A detailed justification reason is required to manually override a reservation.",
      });
    }

    const isNumeric = /^\d+$/.test(bookingId);
    const [bookingRows] = await query(
      "SELECT * FROM bookings WHERE booking_id = ? OR id = ?",
      [bookingId.toUpperCase(), isNumeric ? parseInt(bookingId, 10) : 0]
    );

    if (!bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = bookingRows[0];

    await transaction(async (connection) => {
      await connection.execute(
        "UPDATE bookings SET status = ? WHERE id = ?",
        [newStatus.toUpperCase(), booking.id]
      );

      if (booking.slot_id && (newStatus === "CANCELLED" || newStatus === "AVAILABLE")) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'AVAILABLE', current_booking_id = NULL WHERE id = ?",
          [booking.slot_id]
        );
      }

      await connection.execute(
        `INSERT INTO audit_logs 
         (log_id, user_id, operator_id, station_id, charger_id, slot_id, booking_id, action, previous_status, new_status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUD_${Date.now().toString(36).toUpperCase()}`,
          booking.user_id,
          operatorId,
          booking.station_id,
          `CHG${String(booking.slot_id).padStart(4, "0")}`,
          booking.slot_id,
          booking.booking_id,
          `MANUAL_OVERRIDE_${actionType.toUpperCase()}`,
          booking.status,
          newStatus.toUpperCase(),
          reason,
        ]
      );
    });

    res.json({
      success: true,
      message: `Reservation ${booking.booking_id} overridden to ${newStatus}. Action recorded in audit logs.`,
      bookingId: booking.booking_id,
      status: newStatus,
    });
  } catch (error) {
    console.error("manualOverrideBooking error:", error);
    res.status(500).json({ success: false, message: "Error performing manual override", error: error.message });
  }
};

/**
 * POST /api/queue
 * Join Smart Station Queue
 */
export const joinQueue = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const {
      stationId,
      customerName,
      customerPhone,
      vehicleNumber,
      vehicleType = "Car",
      connectorType = "CCS2",
      requiredDuration = 45,
    } = req.body;

    if (!stationId || !customerName || !customerPhone || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: "Station, Customer Name, Mobile Number, and Vehicle Number are required to join queue.",
      });
    }

    const parsedStationId = parseInt(stationId, 10);
    const queueToken = await generateNextQueueToken();

    // Count existing waiting in queue for this station
    const [waitingCountRows] = await query(
      "SELECT COUNT(*) as count FROM queue_entries WHERE station_id = ? AND status = 'WAITING'",
      [parsedStationId]
    );

    const position = (waitingCountRows?.count || 0) + 1;
    const estimatedWaitMinutes = position * 15; // 15 mins per vehicle estimate

    const result = await query(
      `INSERT INTO queue_entries 
       (queue_token, station_id, user_id, customer_name, customer_phone, vehicle_number, vehicle_type, connector_type, required_duration, position, status, estimated_wait_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'WAITING', ?)`,
      [
        queueToken,
        parsedStationId,
        userId,
        customerName.trim(),
        customerPhone.trim(),
        vehicleNumber.trim().toUpperCase(),
        vehicleType,
        connectorType,
        parseInt(requiredDuration, 10) || 45,
        position,
        estimatedWaitMinutes,
      ]
    );

    res.status(201).json({
      success: true,
      message: `Added to Station Queue! Your token is ${queueToken} (Position #${position}).`,
      data: {
        id: result.insertId,
        queueToken,
        stationId: parsedStationId,
        position,
        estimatedWaitMinutes,
        customerName,
        vehicleNumber: vehicleNumber.toUpperCase(),
        status: "WAITING",
      },
    });
  } catch (error) {
    console.error("joinQueue error:", error);
    res.status(500).json({ success: false, message: "Error joining queue", error: error.message });
  }
};

/**
 * GET /api/queue/:stationId
 */
export const getStationQueue = async (req, res) => {
  try {
    const { stationId } = req.params;
    const queue = await query(
      `SELECT * FROM queue_entries 
       WHERE station_id = ? AND status IN ('WAITING', 'NOTIFIED', 'ASSIGNED')
       ORDER BY position ASC, id ASC`,
      [parseInt(stationId, 10)]
    );

    res.json({
      success: true,
      count: queue.length,
      data: queue,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching queue", error: error.message });
  }
};

/**
 * POST /api/queue/:queueId/assign
 * Manually or Automatically assign a waiting customer to a charger slot
 */
export const assignQueueEntry = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { slotId } = req.body;
    const operatorId = req.user?.id || null;

    const [queueRows] = await query("SELECT * FROM queue_entries WHERE id = ?", [queueId]);
    if (!queueRows || queueRows.length === 0) {
      return res.status(404).json({ success: false, message: "Queue entry not found." });
    }

    const q = queueRows[0];
    const targetSlotId = parseInt(slotId, 10);

    // Create Offline Booking
    const offlineId = await generateNextOfflineId(await (await import("../config/db.js")).pool);

    await transaction(async (connection) => {
      // 1. Update queue entry
      await connection.execute(
        "UPDATE queue_entries SET status = 'ASSIGNED', assigned_slot_id = ? WHERE id = ?",
        [targetSlotId, q.id]
      );

      // 2. Insert offline booking
      await connection.execute(
        `INSERT INTO offline_bookings 
         (offline_booking_id, station_id, slot_id, customer_name, customer_phone, vehicle_number, vehicle_type, connector_type, duration_minutes, amount, payment_method, payment_status, operator_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 350.00, 'Cash', 'PENDING', ?, 'CHARGING')`,
        [
          offlineId,
          q.station_id,
          targetSlotId,
          q.customer_name,
          q.customer_phone,
          q.vehicle_number,
          q.vehicle_type || "Car",
          q.connector_type || "CCS2",
          q.required_duration || 45,
          operatorId,
        ]
      );

      // 3. Mark slot CHARGING
      await connection.execute(
        "UPDATE charging_slots SET status = 'CHARGING', current_booking_id = ? WHERE id = ?",
        [offlineId, targetSlotId]
      );

      // 4. Audit log
      await connection.execute(
        `INSERT INTO audit_logs 
         (log_id, operator_id, station_id, charger_id, slot_id, booking_id, action, previous_status, new_status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUD_${Date.now().toString(36).toUpperCase()}`,
          operatorId,
          q.station_id,
          `CHG${String(targetSlotId).padStart(4, "0")}`,
          targetSlotId,
          offlineId,
          "QUEUE_MANUAL_ASSIGNMENT",
          "AVAILABLE",
          "CHARGING",
          `Operator assigned Queued customer ${q.customer_name} (${q.queue_token}) to slot ${targetSlotId}`,
        ]
      );
    });

    res.json({
      success: true,
      message: `Queue customer ${q.customer_name} (${q.queue_token}) successfully assigned to Charger Slot #${targetSlotId}!`,
      offlineBookingId: offlineId,
      status: "ASSIGNED",
    });
  } catch (error) {
    console.error("assignQueueEntry error:", error);
    res.status(500).json({ success: false, message: "Error assigning queue customer", error: error.message });
  }
};

/**
 * DELETE /api/queue/:queueId
 */
export const leaveQueue = async (req, res) => {
  try {
    const { queueId } = req.params;
    await query("UPDATE queue_entries SET status = 'CANCELLED' WHERE id = ?", [queueId]);
    res.json({ success: true, message: "Removed from station queue." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error leaving queue", error: error.message });
  }
};

/**
 * GET /api/policies/:stationId
 */
export const getReservationPolicyEndpoint = async (req, res) => {
  try {
    const { stationId } = req.params;
    const policy = await getReservationPolicy(stationId === "global" ? null : parseInt(stationId, 10));
    res.json({ success: true, policy });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching policy", error: error.message });
  }
};

/**
 * PUT /api/policies/:stationId
 * Configure Reservation Policy (Admin / Station Owner)
 */
export const updateReservationPolicyEndpoint = async (req, res) => {
  try {
    const { stationId } = req.params;
    const {
      protectionMinutes = 10,
      gracePeriodMinutes = 10,
      queueTimeoutMinutes = 5,
      maxAdvanceDays = 7,
      maxDurationHours = 4,
      cancellationWindowMins = 15,
      noShowPenaltyPct = 20,
      autoAssignQueue = true,
      allowOfflineBooking = true,
    } = req.body;

    const targetStationId = stationId === "global" || !stationId ? null : parseInt(stationId, 10);

    await query(
      `INSERT INTO reservation_policies 
       (station_id, protection_minutes, grace_period_minutes, queue_timeout_minutes, max_advance_days, max_duration_hours, cancellation_window_mins, no_show_penalty_pct, auto_assign_queue, allow_offline_booking)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         protection_minutes = VALUES(protection_minutes),
         grace_period_minutes = VALUES(grace_period_minutes),
         queue_timeout_minutes = VALUES(queue_timeout_minutes),
         max_advance_days = VALUES(max_advance_days),
         max_duration_hours = VALUES(max_duration_hours),
         cancellation_window_mins = VALUES(cancellation_window_mins),
         no_show_penalty_pct = VALUES(no_show_penalty_pct),
         auto_assign_queue = VALUES(auto_assign_queue),
         allow_offline_booking = VALUES(allow_offline_booking)`,
      [
        targetStationId,
        parseInt(protectionMinutes, 10),
        parseInt(gracePeriodMinutes, 10),
        parseInt(queueTimeoutMinutes, 10),
        parseInt(maxAdvanceDays, 10),
        parseInt(maxDurationHours, 10),
        parseInt(cancellationWindowMins, 10),
        parseInt(noShowPenaltyPct, 10),
        Boolean(autoAssignQueue),
        Boolean(allowOfflineBooking),
      ]
    );

    res.json({
      success: true,
      message: "Reservation Policy updated successfully!",
      policy: {
        stationId: targetStationId,
        protectionMinutes: parseInt(protectionMinutes, 10),
        gracePeriodMinutes: parseInt(gracePeriodMinutes, 10),
        queueTimeoutMinutes: parseInt(queueTimeoutMinutes, 10),
        maxAdvanceDays: parseInt(maxAdvanceDays, 10),
        maxDurationHours: parseInt(maxDurationHours, 10),
        cancellationWindowMins: parseInt(cancellationWindowMins, 10),
        noShowPenaltyPct: parseInt(noShowPenaltyPct, 10),
        autoAssignQueue: Boolean(autoAssignQueue),
        allowOfflineBooking: Boolean(allowOfflineBooking),
      },
    });
  } catch (error) {
    console.error("updateReservationPolicyEndpoint error:", error);
    res.status(500).json({ success: false, message: "Error updating reservation policy", error: error.message });
  }
};

/**
 * GET /api/audit-logs
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { stationId, action, limit = 50 } = req.query;
    let sql = `
      SELECT al.*, u.name as user_name, s.station_name 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN charging_stations s ON al.station_id = s.id
    `;
    const conditions = [];
    const params = [];

    if (stationId) {
      conditions.push("al.station_id = ?");
      params.push(stationId);
    }
    if (action) {
      conditions.push("al.action LIKE ?");
      params.push(`%${action}%`);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY al.id DESC LIMIT ?";
    params.push(parseInt(limit, 10) || 50);

    const logs = await query(sql, params);

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching audit logs", error: error.message });
  }
};

/**
 * GET /api/admin/reservation-analytics
 * Advanced Smart Reservation Analytics
 */
export const getReservationAnalytics = async (req, res) => {
  try {
    // 1. Total Online vs Offline Bookings
    const [onlineStats] = await query("SELECT COUNT(*) as totalOnline, COALESCE(SUM(amount), 0) as onlineRevenue FROM bookings");
    const [offlineStats] = await query("SELECT COUNT(*) as totalOffline, COALESCE(SUM(amount), 0) as offlineRevenue FROM offline_bookings");

    // 2. No-Show Count & Rate
    const [noShowStats] = await query("SELECT COUNT(*) as count FROM bookings WHERE status = 'NO_SHOW'");
    const totalOnline = onlineStats?.totalOnline || 1;
    const noShowCount = noShowStats?.count || 0;
    const noShowRatePct = Math.round((noShowCount / totalOnline) * 100);

    // 3. Total Conflict Events Detected
    const [conflictLogs] = await query("SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE '%CONFLICT%' OR action LIKE '%BLOCKED%'");

    // 4. Queue Stats
    const [queueStats] = await query("SELECT COUNT(*) as totalQueued, COALESCE(AVG(estimated_wait_minutes), 12) as avgWait FROM queue_entries");

    // 5. Hourly Distribution of Arrivals
    const hourlyOnline = await query(
      `SELECT HOUR(start_time) as hour, COUNT(*) as count 
       FROM bookings 
       GROUP BY HOUR(start_time) 
       ORDER BY hour ASC`
    );

    res.json({
      success: true,
      analytics: {
        totalOnlineBookings: onlineStats?.totalOnline || 0,
        totalOfflineBookings: offlineStats?.totalOffline || 0,
        onlineRevenue: parseFloat(onlineStats?.onlineRevenue || 0),
        offlineRevenue: parseFloat(offlineStats?.offlineRevenue || 0),
        totalRevenue: parseFloat(onlineStats?.onlineRevenue || 0) + parseFloat(offlineStats?.offlineRevenue || 0),
        noShowCount,
        noShowRatePct,
        conflictsDetected: conflictLogs?.count || 0,
        totalQueuedCustomers: queueStats?.totalQueued || 0,
        avgQueueWaitMinutes: Math.round(queueStats?.avgWait || 12),
        hourlyDistribution: hourlyOnline,
      },
    });
  } catch (error) {
    console.error("getReservationAnalytics error:", error);
    res.status(500).json({ success: false, message: "Error fetching analytics", error: error.message });
  }
};
